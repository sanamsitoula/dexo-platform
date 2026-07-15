import { Injectable, BadRequestException, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@dexo/shared';
import { firstValueFrom } from 'rxjs';

export enum OAuthProvider {
  google = 'google',
  github = 'github',
  apple = 'apple',
  facebook = 'facebook',
  microsoft = 'microsoft',
  linkedin = 'linkedin',
}

export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  username?: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  tokenExpiresAt?: Date;
  raw?: any;
}

@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  // ===================== PLATFORM-LEVEL OAUTH =====================

  async getPlatformAuthUrl(provider: OAuthProvider, returnUrl?: string): Promise<string> {
    const config = await this.prisma.platformOAuthConfig.findUnique({
      where: { provider },
    });

    if (!config || !config.isEnabled) {
      throw new BadRequestException(`Platform ${provider} OAuth is not configured`);
    }

    // The provider redirect URI must ALWAYS be the API callback registered in
    // the provider's console — callers can't override it (the token exchange
    // must reuse the same URI). Where the USER ends up afterwards travels in
    // `state` as a validated returnUrl instead.
    const finalRedirectUri = config.redirectUri;
    const state = this.generateState(undefined, this.validateReturnUrl(returnUrl));

    switch (provider) {
      case OAuthProvider.google:
        return this.buildGoogleAuthUrl(config.clientId, finalRedirectUri, config.scope, state);
      case OAuthProvider.github:
        return this.buildGithubAuthUrl(config.clientId, finalRedirectUri, config.scope, state);
      case OAuthProvider.apple:
        return this.buildAppleAuthUrl(config.clientId, finalRedirectUri, config.scope, state);
      case OAuthProvider.facebook:
        return this.buildFacebookAuthUrl(config.clientId, finalRedirectUri, config.scope, state);
      case OAuthProvider.microsoft:
        return this.buildMicrosoftAuthUrl(config.clientId, finalRedirectUri, config.scope, state);
      case OAuthProvider.linkedin:
        return this.buildLinkedInAuthUrl(config.clientId, finalRedirectUri, config.scope, state);
      default:
        throw new BadRequestException(`Unsupported provider: ${provider}`);
    }
  }

  // ===================== TENANT-LEVEL OAUTH =====================

  async getTenantAuthUrl(tenantId: string, provider: OAuthProvider, returnUrl?: string): Promise<string> {
    // A tenant may bring its own OAuth app; otherwise FALL BACK to the
    // platform's app. The fallback uses the platform's fixed callback URI, so
    // one whitelisted redirect URI in the provider console serves EVERY
    // tenant — tenant ids are dynamic in a multi-tenant platform and can't
    // each be registered with Google.
    const config = await this.resolveOAuthConfig(tenantId, provider);
    if (!config) {
      throw new BadRequestException(`${provider} OAuth is not configured (neither for this tenant nor platform-wide)`);
    }

    // See getPlatformAuthUrl: provider redirect stays fixed; the user's
    // destination travels in state.
    const state = this.generateState(tenantId, this.validateReturnUrl(returnUrl));
    this.logger.log(`OAuth start: provider=${provider} tenant=${tenantId} via=${config.source} returnUrl=${returnUrl || '-'}`);

    return this.buildProviderAuthUrl(provider, config.clientId, config.redirectUri, config.scope, state);
  }

  /** Tenant's own config if enabled, else the platform config (shared app). */
  private async resolveOAuthConfig(
    tenantId: string | null,
    provider: OAuthProvider,
  ): Promise<{ clientId: string; clientSecret: string | null; redirectUri: string; scope: string | null; source: 'tenant' | 'platform' } | null> {
    if (tenantId) {
      const own = await this.prisma.tenantOAuthConfig.findUnique({
        where: { tenantId_provider: { tenantId, provider } },
      });
      if (own?.isEnabled) return { ...own, source: 'tenant' };
    }
    const platform = await this.prisma.platformOAuthConfig.findUnique({ where: { provider } });
    if (platform?.isEnabled) return { ...platform, source: 'platform' };
    return null;
  }

  // ===================== OAUTH CALLBACK HANDLER =====================

  async handleProviderCallback(
    provider: OAuthProvider,
    code: string,
    state: string,
    redirectUri?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: any; isNewUser: boolean }> {
    // Determine if this is platform or tenant level based on state
    const tenantId = this.extractTenantFromState(state);
    const isPlatformLevel = !tenantId;

    // Must mirror getTenantAuthUrl's resolution exactly: a tenant flow that
    // started on the platform's shared app must exchange the code with the
    // SAME client + redirect URI it authorized with.
    const config = await this.resolveOAuthConfig(tenantId, provider);
    if (!config) {
      this.logger.error(`OAuth callback with no usable config: provider=${provider} tenant=${tenantId || '-'}`);
      throw new BadRequestException(`${provider} OAuth is not configured`);
    }

    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(provider, code, config.clientId, config.clientSecret, redirectUri || config.redirectUri);

      // Get user profile
      const profile = await this.fetchUserProfile(provider, tokens);

      // Find or create user
      const result = await this.findOrCreateUser(profile, tenantId, isPlatformLevel);
      this.logger.log(
        `OAuth success: provider=${provider} tenant=${tenantId || 'platform'} via=${config.source} email=${profile.email} newUser=${result.isNewUser}`,
      );
      return this.issueTokens(provider, result);
    } catch (err: any) {
      this.logger.error(
        `OAuth callback failed: provider=${provider} tenant=${tenantId || 'platform'} via=${config.source} — ${err?.response?.data ? JSON.stringify(err.response.data) : err?.message}`,
      );
      throw err;
    }
  }

  private issueTokens(
    provider: OAuthProvider,
    result: { user: any; isNewUser: boolean },
  ): { accessToken: string; refreshToken: string; user: any; isNewUser: boolean } {

    // Generate JWT tokens
    const accessToken = this.jwtService.sign(
      {
        sub: result.user.id,
        email: result.user.email,
        tenantId: result.user.tenantId,
        isPlatformAdmin: result.user.isPlatformAdmin,
        authMethod: 'oauth',
        provider,
      },
      { expiresIn: this.configService.get('JWT_EXPIRATION') || '1h' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: result.user.id, type: 'refresh' },
      { expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION') || '7d' },
    );

    return {
      accessToken,
      refreshToken,
      user: result.user,
      isNewUser: result.isNewUser,
    };
  }

  // ===================== OAUTH CONFIG MANAGEMENT =====================

  async getPlatformConfigs() {
    return this.prisma.platformOAuthConfig.findMany();
  }

  async updatePlatformConfig(provider: OAuthProvider, data: any) {
    const saved = await this.prisma.platformOAuthConfig.upsert({
      where: { provider },
      create: {
        provider,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        redirectUri: data.redirectUri,
        scope: data.scope,
        isEnabled: data.isEnabled !== false,
      },
      update: {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        redirectUri: data.redirectUri,
        scope: data.scope,
        isEnabled: data.isEnabled !== false,
      },
    });
    this.logger.log(`Platform OAuth config updated: provider=${provider} enabled=${saved.isEnabled} redirectUri=${saved.redirectUri}`);
    return saved;
  }

  /**
   * Lightweight, non-interactive config check — curl-able via
   * GET /api/auth/platform/:provider/test. Validates that the saved fields
   * are present and well-formed, that the redirect URI matches the platform
   * callback this API actually serves, and that the provider's endpoints are
   * reachable. A full client-secret validation only happens during a real
   * sign-in (OAuth has no "verify secret" call), so this is a best-effort
   * pre-flight — it catches the common "wrong redirect URI / blank key /
   * typo'd client id" mistakes before the user ever clicks Sign in with Google.
   */
  async testPlatformConfig(provider: OAuthProvider, expectedCallback: string) {
    const config = await this.prisma.platformOAuthConfig.findUnique({ where: { provider } });
    const checks: { label: string; ok: boolean; detail?: string }[] = [];

    if (!config) {
      checks.push({ label: 'Config saved', ok: false, detail: 'No platform config for this provider yet — enter your keys and Save first.' });
      this.logger.warn(`OAuth test: no config for provider=${provider}`);
      return { ok: false, provider, checks, redirectUri: null, expectedCallback, authUrl: null };
    }

    checks.push({ label: 'Client ID set', ok: !!config.clientId });
    checks.push({ label: 'Client secret set', ok: !!config.clientSecret });
    checks.push({ label: 'Redirect URI set', ok: !!config.redirectUri });
    checks.push({ label: 'Enabled', ok: config.isEnabled });
    const redirectMatches = !!config.redirectUri && config.redirectUri.replace(/\/+$/, '') === expectedCallback.replace(/\/+$/, '');
    checks.push({
      label: 'Redirect URI matches this API',
      ok: redirectMatches,
      detail: redirectMatches ? undefined : `stored "${config.redirectUri}" ≠ expected "${expectedCallback}"`,
    });

    let authUrl: string | null = null;
    try {
      authUrl = this.buildProviderAuthUrl(provider, config.clientId, config.redirectUri, config.scope, this.generateState());
      checks.push({ label: 'Auth URL builds', ok: true });
    } catch (e) {
      checks.push({ label: 'Auth URL builds', ok: false, detail: (e as Error).message });
    }

    // Reachability: GET the token endpoint. Healthy providers answer 4xx
    // (method not allowed / bad request) — never 5xx — so any sub-500 reply
    // means the provider is up and our network can reach it.
    try {
      const resp = await firstValueFrom(
        this.httpService.get(this.getTokenEndpoints(provider).token, {
          validateStatus: () => true,
          timeout: 8000,
        }),
      );
      const reachable = resp.status < 500;
      checks.push({ label: 'Provider reachable', ok: reachable, detail: `HTTP ${resp.status}` });
    } catch (e) {
      checks.push({ label: 'Provider reachable', ok: false, detail: (e as Error).message });
    }

    const ok = checks.every((c) => c.ok);
    this.logger.log(`OAuth test provider=${provider}: ok=${ok} (${checks.filter((c) => c.ok).length}/${checks.length})`);
    return { ok, provider, checks, redirectUri: config.redirectUri, expectedCallback, authUrl };
  }

  async getTenantConfigs(tenantId: string) {
    return this.prisma.tenantOAuthConfig.findMany({
      where: { tenantId },
    });
  }

  async updateTenantConfig(tenantId: string, provider: OAuthProvider, data: any) {
    return this.prisma.tenantOAuthConfig.upsert({
      where: { tenantId_provider: { tenantId, provider } },
      create: {
        tenantId,
        provider,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        redirectUri: data.redirectUri,
        scope: data.scope,
        isEnabled: data.isEnabled !== false,
        autoCreateUser: data.autoCreateUser || false,
        defaultRoleId: data.defaultRoleId,
        allowedDomains: data.allowedDomains,
      },
      update: {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        redirectUri: data.redirectUri,
        scope: data.scope,
        isEnabled: data.isEnabled !== false,
        autoCreateUser: data.autoCreateUser || false,
        defaultRoleId: data.defaultRoleId,
        allowedDomains: data.allowedDomains,
      },
    });
  }

  // ===================== PRIVATE METHODS =====================

  private async findOrCreateUser(
    profile: OAuthProfile,
    tenantId: string | null,
    isPlatformLevel: boolean,
  ): Promise<{ user: any; isNewUser: boolean }> {
    // Check if OAuth account exists
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      include: { user: true },
    });

    if (existingOAuth) {
      // Update tokens and last used
      await this.prisma.oAuthAccount.update({
        where: { id: existingOAuth.id },
        data: {
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
          tokenExpiresAt: profile.tokenExpiresAt,
          lastUsedAt: new Date(),
        },
      });
      return { user: existingOAuth.user, isNewUser: false };
    }

    // Check if user exists with same email
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (user) {
      // Link OAuth account to existing user
      await this.prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: profile.provider,
          providerUserId: profile.providerUserId,
          providerEmail: profile.email,
          providerAvatar: profile.avatarUrl,
          accessToken: profile.accessToken,
          refreshToken: profile.refreshToken,
          tokenExpiresAt: profile.tokenExpiresAt,
          idToken: profile.idToken,
          rawProfile: profile.raw,
          isPrimary: !user.passwordHash, // Primary if no password
          tenantId: user.tenantId,
        },
      });

      // Update avatar if not set
      if (!user.avatarUrl && profile.avatarUrl) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: profile.avatarUrl },
        });
        user.avatarUrl = profile.avatarUrl;
      }

      return { user, isNewUser: false };
    }

    // Create new user
    if (!isPlatformLevel && tenantId) {
      // For tenant-level, check if auto-create is enabled
      const config = await this.prisma.tenantOAuthConfig.findUnique({
        where: { tenantId_provider: { tenantId, provider: profile.provider } },
      });

      if (!config?.autoCreateUser) {
        throw new UnauthorizedException(
          'Account not found. Please contact your administrator or use a different sign-in method.',
        );
      }
    }

    user = await this.prisma.user.create({
      data: {
        email: profile.email,
        passwordHash: '', // No password for OAuth users
        firstName: profile.firstName || profile.name?.split(' ')[0],
        lastName: profile.lastName || profile.name?.split(' ').slice(1).join(' '),
        avatarUrl: profile.avatarUrl,
        emailVerified: profile.emailVerified,
        status: profile.emailVerified ? 'active' : 'pending_verification',
        tenantId: tenantId,
        isPlatformAdmin: isPlatformLevel,
      },
    });

    // Create OAuth account link
    await this.prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail: profile.email,
        providerUsername: profile.username,
        providerAvatar: profile.avatarUrl,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        tokenExpiresAt: profile.tokenExpiresAt,
        idToken: profile.idToken,
        scope: '',
        rawProfile: profile.raw,
        isPrimary: true,
        tenantId: tenantId,
        lastUsedAt: new Date(),
      },
    });

    // Assign default role if specified
    if (!isPlatformLevel && tenantId) {
      const config = await this.prisma.tenantOAuthConfig.findUnique({
        where: { tenantId_provider: { tenantId, provider: profile.provider } },
      });
      await this.autoCreateMemberIfFitnessTenant(user.id, tenantId);
      if (config?.defaultRoleId) {
        await this.prisma.userRoles.create({
          data: {
            userId: user.id,
            roleId: config.defaultRoleId,
          },
        });
      }
    }

    return { user, isNewUser: true };
  }

  private async exchangeCodeForTokens(
    provider: OAuthProvider,
    code: string,
    clientId: string,
    clientSecret: string | null,
    redirectUri: string,
  ): Promise<{ accessToken: string; refreshToken?: string; idToken?: string; expiresIn?: number }> {
    const endpoints = this.getTokenEndpoints(provider);
    const params: any = {
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };
    if (clientSecret) params.client_secret = clientSecret;

    try {
      const response = await firstValueFrom(
        this.httpService.post(endpoints.token, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        }),
      );
      const data = response.data;
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        idToken: data.id_token,
        expiresIn: data.expires_in,
      };
    } catch (err: any) {
      this.logger.error(`Token exchange failed for ${provider}`, err.response?.data);
      throw new UnauthorizedException(`Failed to exchange code for ${provider} token`);
    }
  }

  private async fetchUserProfile(
    provider: OAuthProvider,
    tokens: { accessToken: string; idToken?: string },
  ): Promise<OAuthProfile> {
    switch (provider) {
      case OAuthProvider.google:
        return this.fetchGoogleProfile(tokens.accessToken);
      case OAuthProvider.github:
        return this.fetchGithubProfile(tokens.accessToken);
      case OAuthProvider.apple:
        return this.fetchAppleProfile(tokens.idToken!);
      case OAuthProvider.facebook:
        return this.fetchFacebookProfile(tokens.accessToken);
      case OAuthProvider.microsoft:
        return this.fetchMicrosoftProfile(tokens.accessToken);
      case OAuthProvider.linkedin:
        return this.fetchLinkedInProfile(tokens.accessToken);
      default:
        throw new BadRequestException(`Unsupported provider: ${provider}`);
    }
  }

  private async fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await firstValueFrom(
      this.httpService.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const data = response.data;
    return {
      provider: OAuthProvider.google,
      providerUserId: data.id,
      email: data.email,
      emailVerified: data.verified_email || false,
      firstName: data.given_name,
      lastName: data.family_name,
      name: data.name,
      avatarUrl: data.picture,
      accessToken,
      raw: data,
    };
  }

  private async fetchGithubProfile(accessToken: string): Promise<OAuthProfile> {
    const userRes = await firstValueFrom(
      this.httpService.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const emailsRes = await firstValueFrom(
      this.httpService.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const data = userRes.data;
    const primaryEmail = emailsRes.data.find((e: any) => e.primary) || emailsRes.data[0];
    return {
      provider: OAuthProvider.github,
      providerUserId: String(data.id),
      email: primaryEmail?.email || `${data.login}@github.local`,
      emailVerified: primaryEmail?.verified || false,
      firstName: data.name?.split(' ')[0] || data.login,
      lastName: data.name?.split(' ').slice(1).join(' '),
      name: data.name,
      username: data.login,
      avatarUrl: data.avatar_url,
      accessToken,
      raw: { ...data, emails: emailsRes.data },
    };
  }

  private async fetchAppleProfile(idToken: string): Promise<OAuthProfile> {
    // Apple ID Token is a JWT - decode it
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    return {
      provider: OAuthProvider.apple,
      providerUserId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
      firstName: payload.given_name,
      lastName: payload.family_name,
      name: payload.name,
      accessToken: '',
      idToken,
      raw: payload,
    };
  }

  private async fetchFacebookProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await firstValueFrom(
      this.httpService.get(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`),
    );
    const data = response.data;
    return {
      provider: OAuthProvider.facebook,
      providerUserId: data.id,
      email: data.email,
      emailVerified: true,
      firstName: data.name?.split(' ')[0],
      lastName: data.name?.split(' ').slice(1).join(' '),
      name: data.name,
      avatarUrl: data.picture?.data?.url,
      accessToken,
      raw: data,
    };
  }

  private async fetchMicrosoftProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await firstValueFrom(
      this.httpService.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const data = response.data;
    return {
      provider: OAuthProvider.microsoft,
      providerUserId: data.id,
      email: data.mail || data.userPrincipalName,
      emailVerified: true,
      firstName: data.givenName,
      lastName: data.surname,
      name: data.displayName,
      accessToken,
      raw: data,
    };
  }

  private async fetchLinkedInProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await firstValueFrom(
      this.httpService.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    const data = response.data;
    return {
      provider: OAuthProvider.linkedin,
      providerUserId: data.sub,
      email: data.email,
      emailVerified: data.email_verified || true,
      firstName: data.given_name,
      lastName: data.family_name,
      name: `${data.given_name} ${data.family_name}`,
      avatarUrl: data.picture,
      accessToken,
      raw: data,
    };
  }

  // ===================== URL BUILDERS =====================

  private buildGoogleAuthUrl(clientId: string, redirectUri: string, scope: string | null, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope || 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  private buildGithubAuthUrl(clientId: string, redirectUri: string, scope: string | null, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope || 'read:user user:email',
      state,
      allow_signup: 'true',
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  private buildAppleAuthUrl(clientId: string, redirectUri: string, scope: string | null, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      response_mode: 'form_post',
      scope: scope || 'openid email name',
      state,
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  private buildFacebookAuthUrl(clientId: string, redirectUri: string, scope: string | null, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope || 'email,public_profile',
      state,
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  private buildMicrosoftAuthUrl(clientId: string, redirectUri: string, scope: string | null, state: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope || 'openid profile email User.Read',
      state,
      response_mode: 'query',
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  private buildLinkedInAuthUrl(clientId: string, redirectUri: string, scope: string | null, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope || 'openid profile email',
      state,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  private buildProviderAuthUrl(provider: OAuthProvider, clientId: string, redirectUri: string, scope: string | null, state: string): string {
    switch (provider) {
      case OAuthProvider.google: return this.buildGoogleAuthUrl(clientId, redirectUri, scope, state);
      case OAuthProvider.github: return this.buildGithubAuthUrl(clientId, redirectUri, scope, state);
      case OAuthProvider.apple: return this.buildAppleAuthUrl(clientId, redirectUri, scope, state);
      case OAuthProvider.facebook: return this.buildFacebookAuthUrl(clientId, redirectUri, scope, state);
      case OAuthProvider.microsoft: return this.buildMicrosoftAuthUrl(clientId, redirectUri, scope, state);
      case OAuthProvider.linkedin: return this.buildLinkedInAuthUrl(clientId, redirectUri, scope, state);
      default: throw new BadRequestException(`Unsupported provider: ${provider}`);
    }
  }

  private getTokenEndpoints(provider: OAuthProvider): { token: string } {
    const endpoints: Record<OAuthProvider, string> = {
      [OAuthProvider.google]: 'https://oauth2.googleapis.com/token',
      [OAuthProvider.github]: 'https://github.com/login/oauth/access_token',
      [OAuthProvider.apple]: 'https://appleid.apple.com/auth/token',
      [OAuthProvider.facebook]: 'https://graph.facebook.com/v18.0/oauth/access_token',
      [OAuthProvider.microsoft]: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      [OAuthProvider.linkedin]: 'https://www.linkedin.com/oauth/v2/accessToken',
    };
    return { token: endpoints[provider] };
  }

  /**
   * OAuth `state` carries everything needed to route the user BACK to the app
   * they started sign-in from (platform web, platform admin, any tenant's
   * website or admin) — no env vars, no per-tenant hardcoding. v2 states are
   * base64url JSON: { n: nonce, t?: tenantId, r?: returnUrl }.
   */
  private generateState(tenantId?: string, returnUrl?: string): string {
    const payload = {
      n: Math.random().toString(36).substring(2, 15),
      ...(tenantId ? { t: tenantId } : {}),
      ...(returnUrl ? { r: returnUrl } : {}),
    };
    return 'v2.' + Buffer.from(JSON.stringify(payload)).toString('base64url');
  }

  /** Decode a state (v2 JSON or legacy `t:<id>:...` / `p:...`). */
  extractStateData(state: string): { tenantId: string | null; returnUrl: string | null } {
    if (state?.startsWith('v2.')) {
      try {
        const payload = JSON.parse(Buffer.from(state.slice(3), 'base64url').toString('utf8'));
        return { tenantId: payload.t || null, returnUrl: payload.r || null };
      } catch {
        return { tenantId: null, returnUrl: null };
      }
    }
    if (state?.startsWith('t:')) return { tenantId: state.split(':')[1], returnUrl: null };
    return { tenantId: null, returnUrl: null };
  }

  private extractTenantFromState(state: string): string | null {
    return this.extractStateData(state).tenantId;
  }

  /**
   * Open-redirect guard: only send tokens back to the platform's own domains
   * (apex, any subdomain — every tenant site qualifies automatically) or
   * localhost during development.
   */
  validateReturnUrl(returnUrl?: string): string | undefined {
    if (!returnUrl) return undefined;
    try {
      const url = new URL(returnUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
      const platformDomain = (this.configService.get('PLATFORM_DOMAIN') || 'onedexo.com').toLowerCase();
      const host = url.hostname.toLowerCase();
      const ok =
        host === platformDomain ||
        host.endsWith(`.${platformDomain}`) ||
        host === 'localhost' ||
        host.endsWith('.localhost');
      return ok ? returnUrl : undefined;
    } catch {
      return undefined;
    }
  }

  // ===================== ACCOUNT LINKING =====================

  async linkAccount(userId: string, profile: OAuthProfile): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.oAuthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      create: {
        userId,
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        providerEmail: profile.email,
        providerAvatar: profile.avatarUrl,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        idToken: profile.idToken,
        tokenExpiresAt: profile.tokenExpiresAt,
        rawProfile: profile.raw,
        isPrimary: false,
        tenantId: user.tenantId,
      },
      update: {
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        idToken: profile.idToken,
        tokenExpiresAt: profile.tokenExpiresAt,
        lastUsedAt: new Date(),
      },
    });
  }

  async unlinkAccount(userId: string, provider: OAuthProvider): Promise<void> {
    await this.prisma.oAuthAccount.deleteMany({
      where: { userId, provider },
    });
  }

  async getLinkedAccounts(userId: string) {
    return this.prisma.oAuthAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerEmail: true,
        providerUsername: true,
        providerAvatar: true,
        isPrimary: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  private async autoCreateMemberIfFitnessTenant(userId: string, tenantId: string) {
    try {
      const tenantDomain = await this.prisma.tenantDomain.findFirst({
        where: { tenantId, domain: { code: 'FITNESS_CENTER' } },
        include: { domain: true },
      });
      if (!tenantDomain) return;
      const existing = await this.prisma.member.findFirst({ where: { tenantId, userId } });
      if (existing) return;
      const firstBranch = await this.prisma.branch.findFirst({
        where: { tenantId, status: 'active' },
        orderBy: { isHeadquarters: 'desc' },
      });
      await this.prisma.member.create({
        data: {
          tenantId,
          userId,
          branchId: firstBranch?.id,
          membershipType: 'TRIAL',
          startDate: new Date(),
          status: 'PENDING_VERIFICATION',
          isVerified: false,
        },
      });
    } catch (err) {
      this.logger.warn(`autoCreateMemberIfFitnessTenant failed: ${(err as Error).message}`);
    }
  }
}
