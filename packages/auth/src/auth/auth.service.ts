import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  HttpException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { generateTotpSecret, verifyTotp, buildOtpauthUrl } from './totp.util';
import { ConfigService } from '@nestjs/config';
import { PrismaService, AuditService, TenantMailService } from '@dexo/shared';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ChangePasswordDto,
} from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private audit: AuditService,
    private tenantMail: TenantMailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    let { tenantId } = loginDto;

    // Resolve subdomain → tenantId for the tenant app login flow
    if (!tenantId && loginDto.subdomain) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain: loginDto.subdomain },
        select: { id: true },
      });
      if (tenant) tenantId = tenant.id;
    }

    // Account lockout gate — before password verification so locked accounts
    // cannot be brute-forced (returns 423 with remaining lock time).
    const attemptCheck = await this.checkLoginAttempts(email);
    if (!attemptCheck.allowed) {
      throw new HttpException(
        {
          statusCode: 423,
          error: 'Locked',
          message: `Account is temporarily locked due to too many failed login attempts. Try again in ${attemptCheck.lockedForSeconds} seconds.`,
          lockedForSeconds: attemptCheck.lockedForSeconds,
        },
        423,
      );
    }

    const user = await this.validateUser(email, password);

    if (!user) {
      await this.recordFailedLogin(email);
      // Log failed login attempt with the email that was tried
      await this.audit.logAuthEvent(
        'user.failed_login',
        undefined,
        undefined,
        undefined,
        undefined,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'locked') {
      throw new BadRequestException('Account is locked. Please contact support.');
    }

    if (user.status !== 'active' && user.status !== 'pending_verification') {
      throw new BadRequestException('User account is not active');
    }

    if (user.status === 'pending_verification' && process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Please verify your email before logging in');
    }

    if (tenantId && user.tenantId !== tenantId) {
      throw new UnauthorizedException('User does not belong to this tenant');
    }

    await this.recordSuccessfulLogin(email);

    // MFA gate: don't issue tokens yet — hand back a short-lived, mfa-scoped
    // token that must be exchanged via POST /auth/mfa/verify.
    if (user.mfaEnabled) {
      const mfaToken = this.jwtService.sign(
        { sub: user.id, email: user.email, scope: 'mfa' },
        { expiresIn: '5m' },
      );
      return { mfaRequired: true, mfaToken };
    }

    return this.issueSessionTokens(user);
  }

  /**
   * Issues the standard login response: JWT access token + opaque, DB-backed
   * refresh token (rotation-capable). Response shape matches the historical
   * login contract exactly.
   */
  private async issueSessionTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isPlatformAdmin: user.isPlatformAdmin || false,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION') || '1h',
    });

    const refreshToken = await this.createRefreshToken(user.id);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.logAuthEvent('user.login', user.id, user.tenantId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        emailVerified: user.emailVerified,
        isPlatformAdmin: user.isPlatformAdmin || false,
      },
    };
  }

  // ---------------------------------------------------------------------
  // Opaque refresh tokens (rotation + revocation)
  // ---------------------------------------------------------------------

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private refreshTokenTtlMs(): number {
    const raw = this.configService.get('REFRESH_TOKEN_EXPIRATION') || '7d';
    const m = /^(\d+)\s*([smhd])?$/.exec(String(raw).trim());
    if (!m) return 7 * 24 * 3600 * 1000;
    const mult: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return parseInt(m[1], 10) * (mult[m[2] || 's'] || 1000);
  }

  /** Creates and persists a new opaque refresh token; returns the plaintext. */
  private async createRefreshToken(
    userId: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + this.refreshTokenTtlMs()),
        userAgent: meta?.userAgent,
        ip: meta?.ip,
      },
    });
    return token;
  }

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, phone, tenantId, signupAs, specialization } =
      registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const saltRounds = parseInt(this.configService.get('BCRYPT_SALT_ROUNDS') || '10', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    let userTenantId = tenantId;

    if (!userTenantId && this.configService.get('DEFAULT_TENANT_ID')) {
      userTenantId = this.configService.get('DEFAULT_TENANT_ID');
    }

    const verificationToken = this.generateVerificationToken();

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        tenantId: userTenantId,
        status: 'pending_verification',
      },
    });

    // Assign a tenant role appropriate to how the user signed up. Customers
    // (MEMBER) and trainers must NOT get the admin/owner role — only true
    // admin self-registration (no signupAs, i.e. the tenant-admin app) does.
    if (userTenantId) {
      try {
        const isMemberSignup = signupAs === 'MEMBER' || signupAs === 'TRAINER';
        const roleNameContains = (needle: string) => ({
          tenantId: userTenantId,
          name: { contains: needle, mode: 'insensitive' as const },
        });

        let targetRole = null;
        if (signupAs === 'TRAINER') {
          targetRole = await this.prisma.role.findFirst({ where: roleNameContains('trainer') });
        } else if (signupAs === 'MEMBER') {
          targetRole =
            (await this.prisma.role.findFirst({ where: roleNameContains('member') })) ||
            (await this.prisma.role.findFirst({ where: roleNameContains('customer') }));
        }

        // Admin path only when this is NOT a member/trainer signup.
        if (!targetRole && !isMemberSignup) {
          targetRole =
            (await this.prisma.role.findFirst({
              where: {
                tenantId: userTenantId,
                OR: [
                  { name: { contains: 'admin', mode: 'insensitive' } },
                  { name: { contains: 'owner', mode: 'insensitive' } },
                  { name: { contains: 'manager', mode: 'insensitive' } },
                ],
              },
            })) ||
            (await this.prisma.role.findFirst({
              where: { tenantId: userTenantId },
              orderBy: { createdAt: 'asc' },
            }));
        }

        if (targetRole) {
          await this.prisma.userRoles
            .create({
              data: {
                userId: user.id,
                roleId: targetRole.id,
                assignedById: user.id,
              },
            })
            .catch(() => null); // unique constraint might trip
        }
      } catch (err) {
        this.logger.warn('Failed to assign tenant role to new user', err as Error);
      }
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isPlatformAdmin: false,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION') || '1h',
    });

    const refreshToken = await this.createRefreshToken(user.id);

    const { passwordHash: _, ...result } = user;

    await this.audit.logUserAction('user.created', user.id, user.tenantId || undefined, user.id, {
      email: user.email,
      method: 'self-registration',
    });

    if (userTenantId) {
      await this.autoCreateMemberIfFitnessTenant(user.id, userTenantId);
      if (signupAs === 'TRAINER') {
        await this.autoCreateTrainerIfFitnessTenant(user, userTenantId, specialization);
      }
    }

    // Onboarding welcome email via the tenant's SMTP (platform SMTP fallback).
    // Best-effort: a mail failure must never fail registration.
    if (userTenantId) {
      this.tenantMail
        .sendWelcome(userTenantId, user.email, firstName || 'there')
        .catch((err) => this.logger.warn(`Welcome email failed: ${err?.message}`));
    }

    return {
      accessToken,
      refreshToken,
      user: result,
      requiresVerification: true,
      verificationToken,
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid token');
      }

      const { passwordHash: _ph, ...result } = user;

      return {
        valid: true,
        user: result,
      };
    } catch (error: any) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) throw new UnauthorizedException('Invalid refresh token');

    let userId: string | null = null;
    let rotatedFromId: string | null = null;

    // 1) New-style opaque token: look up its sha256 in the RefreshToken table.
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
    });

    if (stored) {
      if (stored.revokedAt) {
        // Reuse of a rotated/revoked token = likely theft → kill every session.
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        this.logger.warn(`Refresh token reuse detected for user ${stored.userId} — all sessions revoked`);
        await this.audit.logAuthEvent('user.refresh_token_reuse', stored.userId);
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (stored.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      userId = stored.userId;
      rotatedFromId = stored.id;
    } else {
      // 2) Legacy JWT refresh token (pre-rotation clients). Accept while it is
      //    still cryptographically valid and migrate the client to an opaque
      //    token in the response.
      try {
        const payload = this.jwtService.verify(refreshToken, {
          secret:
            this.configService.get('REFRESH_TOKEN_SECRET') ||
            (this.jwtService as any).options.secret,
        });
        userId = payload.sub;
      } catch {
        throw new UnauthorizedException('Invalid refresh token');
      }
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId! } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isPlatformAdmin: user.isPlatformAdmin || false,
    };

    const accessToken = this.jwtService.sign(newPayload, {
      expiresIn: this.configService.get('JWT_EXPIRATION') || '1h',
    });

    // Rotation: revoke the presented opaque token and chain to its replacement.
    const newRefreshToken = await this.createRefreshToken(user.id);
    if (rotatedFromId) {
      const replacement = await this.prisma.refreshToken.findUnique({
        where: { tokenHash: this.hashToken(newRefreshToken) },
        select: { id: true },
      });
      await this.prisma.refreshToken.update({
        where: { id: rotatedFromId },
        data: { revokedAt: new Date(), replacedById: replacement?.id },
      });
    }

    // Backward compatible: old clients only read accessToken; new clients
    // should persist the rotated refreshToken.
    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /** Revokes the presented refresh token (or every session with `all`). */
  async logout(userId: string, refreshToken?: string, all = false) {
    if (all) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash: this.hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.logAuthEvent('user.logout', userId);
    return { message: 'Logged out successfully' };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        tenant: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const { passwordHash: _ph2, ...result } = user;

    return result;
  }

  async requestPasswordReset(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    if (user.status === 'locked') {
      throw new BadRequestException('Account is locked. Please contact support.');
    }

    // Generate reset token
    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'password_reset',
      },
      {
        secret: this.configService.get('JWT_SECRET') || 'secret',
        expiresIn: '1h',
      },
    );

    const resetLink = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Send via the user's tenant SMTP (platform SMTP fallback). Best-effort so
    // the endpoint stays constant-time-ish and never leaks config problems.
    this.tenantMail
      .sendPasswordReset(user.tenantId, user.email, user.firstName || 'there', resetLink)
      .catch((err) => this.logger.warn(`Password reset email failed: ${err?.message}`));

    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { resetToken } : {}), // dev convenience only
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'secret',
      });

      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new BadRequestException('Invalid token');
      }

      const saltRounds = parseInt(this.configService.get('BCRYPT_SALT_ROUNDS') || '10', 10);
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return {
        message: 'Password reset successfully. You can now log in with your new password.',
      };
    } catch (error: any) {
      throw new BadRequestException('Invalid or expired token');
    }
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { token } = verifyEmailDto;

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET') || 'secret',
      });

      if (payload.type !== 'email_verification') {
        throw new BadRequestException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new BadRequestException('Invalid token');
      }

      if (user.emailVerified) {
        return {
          message: 'Email is already verified',
        };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          status: 'active',
        },
      });

      return {
        message: 'Email verified successfully. You can now log in.',
      };
    } catch (error: any) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  async resendVerificationEmail(resendVerificationDto: ResendVerificationDto) {
    const { email } = resendVerificationDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success to prevent email enumeration
      return {
        message: 'If an account exists, a verification email has been sent.',
      };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'email_verification',
      },
      {
        secret: this.configService.get('JWT_SECRET') || 'secret',
        expiresIn: '24h',
      },
    );

    const _verificationLink = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    // Queue verification email
    // await this.emailService.sendTemplateEmail('email-verification', user.email, { verificationLink });

    return {
      message: 'If an account exists, a verification email has been sent.',
      verificationToken, // Only for development
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isOldPasswordValid = user.passwordHash
      ? await bcrypt.compare(oldPassword, user.passwordHash)
      : false;

    if (!isOldPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const saltRounds = parseInt(this.configService.get('BCRYPT_SALT_ROUNDS') || '10', 10);
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  private generateVerificationToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
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
      this.logger.log(`Auto-created Member for user ${userId} in fitness tenant ${tenantId}`);
    } catch (err) {
      this.logger.warn(
        `Failed to auto-create Member for user ${userId}: ${(err as Error).message}`,
      );
    }
  }

  private async autoCreateTrainerIfFitnessTenant(
    user: any,
    tenantId: string,
    specialization?: string,
  ) {
    try {
      const tenantDomain = await this.prisma.tenantDomain.findFirst({
        where: { tenantId, domain: { code: 'FITNESS_CENTER' } },
      });
      if (!tenantDomain) return;
      const existing = await this.prisma.trainer.findFirst({
        where: { tenantId, userId: user.id },
      });
      if (existing) return;
      const firstBranch = await this.prisma.branch.findFirst({
        where: { tenantId, status: 'active' },
        orderBy: { isHeadquarters: 'desc' },
      });
      await this.prisma.trainer.create({
        data: {
          tenantId,
          userId: user.id,
          branchId: firstBranch?.id,
          name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
          email: user.email,
          phone: user.phone,
          specialization: specialization || 'General Fitness',
        },
      });
      this.logger.log(`Auto-created Trainer for user ${user.id} in fitness tenant ${tenantId}`);
    } catch (err) {
      this.logger.warn(
        `Failed to auto-create Trainer for user ${user.id}: ${(err as Error).message}`,
      );
    }
  }

  // ---------------------------------------------------------------------
  // Account lockout (DB-based: User.failedLoginCount / User.lockedUntil)
  // ---------------------------------------------------------------------

  async checkLoginAttempts(
    email: string,
  ): Promise<{ allowed: boolean; remainingAttempts?: number; lockedForSeconds?: number }> {
    const maxAttempts = parseInt(this.configService.get('MAX_LOGIN_ATTEMPTS') || '5', 10);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { allowed: true };

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return {
        allowed: false,
        lockedForSeconds: Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000),
      };
    }

    return {
      allowed: true,
      remainingAttempts: Math.max(1, maxAttempts - ((user.failedLoginCount || 0) % maxAttempts)),
    };
  }

  async recordFailedLogin(email: string): Promise<void> {
    const maxAttempts = parseInt(this.configService.get('MAX_LOGIN_ATTEMPTS') || '5', 10);
    const baseLockSeconds = parseInt(this.configService.get('LOCKOUT_DURATION') || '900', 10);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const failedLoginCount = (user.failedLoginCount || 0) + 1;
    const data: any = { failedLoginCount };

    if (failedLoginCount % maxAttempts === 0) {
      // 5 failures → 15 min; each subsequent batch doubles: 30 min, 60 min, ...
      const lockRound = failedLoginCount / maxAttempts; // 1, 2, 3, ...
      const lockMs = baseLockSeconds * 1000 * Math.pow(2, lockRound - 1);
      data.lockedUntil = new Date(Date.now() + lockMs);
      this.logger.warn(`Account ${email} locked for ${lockMs / 60000} min after ${failedLoginCount} failed logins`);
      await this.audit.logAuthEvent('user.account_locked', user.id, user.tenantId || undefined);
    }

    await this.prisma.user.update({ where: { id: user.id }, data });
  }

  async recordSuccessfulLogin(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    if ((user.failedLoginCount || 0) > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null },
      });
    }
  }

  // ---------------------------------------------------------------------
  // TOTP MFA (RFC 6238, implemented in totp.util.ts with node:crypto)
  // ---------------------------------------------------------------------

  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.toUpperCase().replace(/[\s-]/g, '')).digest('hex');
  }

  /** Step 1: generate a secret. Stored immediately but MFA stays OFF until enable. */
  async setupMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled. Disable it before re-running setup.');
    }

    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: false },
    });

    return {
      secret,
      otpauthUrl: buildOtpauthUrl(secret, user.email, 'Dexo'),
    };
  }

  /** Step 2: verify a live code and switch MFA on. Returns backup codes ONCE. */
  async enableMfa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA setup has not been started. Call /auth/mfa/setup first.');
    }
    if (user.mfaEnabled) throw new BadRequestException('MFA is already enabled');
    if (!verifyTotp(user.mfaSecret, code)) {
      throw new BadRequestException('Invalid verification code');
    }

    // 8 backup codes: 10 hex chars each, shown once, stored sha256-hashed.
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase(),
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        recoveryCodes: JSON.stringify(backupCodes.map((c) => this.hashBackupCode(c))),
      },
    });
    await this.audit.logAuthEvent('user.mfa_enabled', userId, user.tenantId || undefined);

    return {
      enabled: true,
      backupCodes,
      message: 'MFA enabled. Store these backup codes safely — they will not be shown again.',
    };
  }

  /** Disable MFA with a live TOTP code or an unused backup code. */
  async disableMfa(userId: string, code?: string, backupCode?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaEnabled) throw new BadRequestException('MFA is not enabled');

    let verified = false;
    if (code && user.mfaSecret && verifyTotp(user.mfaSecret, code)) verified = true;
    if (!verified && backupCode) {
      verified = this.consumeBackupCodeSync(user.recoveryCodes, backupCode).ok;
    }
    if (!verified) throw new BadRequestException('Invalid verification or backup code');

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null, recoveryCodes: null },
    });
    await this.audit.logAuthEvent('user.mfa_disabled', userId, user.tenantId || undefined);
    return { enabled: false, message: 'MFA disabled' };
  }

  private consumeBackupCodeSync(
    recoveryCodesJson: string | null,
    backupCode: string,
  ): { ok: boolean; remaining?: string[] } {
    if (!recoveryCodesJson) return { ok: false };
    let hashes: string[];
    try {
      hashes = JSON.parse(recoveryCodesJson);
    } catch {
      return { ok: false };
    }
    const hash = this.hashBackupCode(backupCode);
    const idx = hashes.indexOf(hash);
    if (idx === -1) return { ok: false };
    hashes.splice(idx, 1);
    return { ok: true, remaining: hashes };
  }

  /** Step 3 of an MFA login: exchange the 5-min mfaToken + TOTP/backup code for real tokens. */
  async verifyMfaLogin(mfaToken: string, code?: string, backupCode?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(mfaToken);
    } catch {
      throw new UnauthorizedException('MFA session expired — please log in again');
    }
    if (payload.scope !== 'mfa') {
      throw new UnauthorizedException('Invalid MFA token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    let verified = false;
    if (code && verifyTotp(user.mfaSecret, code)) verified = true;

    if (!verified && backupCode) {
      const result = this.consumeBackupCodeSync(user.recoveryCodes, backupCode);
      if (result.ok) {
        verified = true;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { recoveryCodes: JSON.stringify(result.remaining) },
        });
      }
    }

    if (!verified) {
      await this.audit.logAuthEvent('user.mfa_failed', user.id, user.tenantId || undefined);
      throw new UnauthorizedException('Invalid MFA code');
    }

    const { passwordHash: _ph, ...safeUser } = user as any;
    return this.issueSessionTokens(safeUser);
  }

  /** MFA status for the security settings pages. */
  async getMfaStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, recoveryCodes: true },
    });
    if (!user) throw new BadRequestException('User not found');
    let backupCodesRemaining = 0;
    try {
      backupCodesRemaining = user.recoveryCodes ? JSON.parse(user.recoveryCodes).length : 0;
    } catch {}
    return { mfaEnabled: user.mfaEnabled, backupCodesRemaining };
  }
}
