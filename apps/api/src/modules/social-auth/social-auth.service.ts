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

  async getPlatformAuthUrl(provider: OAuthProvider, redirectUri?: string): Promise<string> {
    const config = await this.prisma.platformOAuthConfig.findUnique({
      where: { provider },
    });

    if (!config || !config.isEnabled) {
      throw new BadRequestException(`Platform ${provider} OAuth is not configured`);
    }

    const finalRedirectUri = redirectUri || config.redirectUri;
    const state = this.generateState();

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

  async getTenantAuthUrl(tenantId: string, provider: OAuthProvider, redirectUri?: string): Promise<string> {
    const config = await this.prisma.tenantOAuthConfig.findUnique({
      where: { tenantId_provider: { tenantId, provider } },
    });

    if (!config || !config.isEnabled) {
      throw new BadRequestException(`Tenant ${provider} OAuth is not configured`);
    }

    const finalRedirectUri = redirectUri || config.redirectUri;
    const state = this.generateState(tenantId);

    return this.buildProviderAuthUrl(provider, config.clientId, finalRedirectUri, config.scope, state);
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

    const config = isPlatformLevel
      ? await this.prisma.platformOAuthConfig.findUnique({ where: { provider } })
      : await this.prisma.tenantOAuthConfig.findUnique({
          where: { tenantId_provider: { tenantId: tenantId!, provider } },
        });

    if (!config) {
      throw new BadRequestException(`${provider} OAuth is not configured`);
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(provider, code, config.clientId, config.clientSecret, redirectUri || config.redirectUri);

    // Get user profile
    const profile = await this.fetchUserProfile(provider, tokens);

    // Find or create user
    const result = await this.findOrCreateUser(profile, tenantId, isPlatformLevel);

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
    return this.prisma.platformOAuthConfig.upsert({
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

  private generateState(tenantId?: string): string {
    const random = Math.random().toString(36).substring(2, 15);
    const prefix = tenantId ? `t:${tenantId}:` : 'p:';
    return prefix + random;
  }

  private extractTenantFromState(state: string): string | null {
    if (state.startsWith('t:')) {
      return state.split(':')[1];
    }
    return null;
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
