import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService, AuditService } from '@dexo/shared';
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

    const user = await this.validateUser(email, password);

    if (!user) {
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

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      isPlatformAdmin: user.isPlatformAdmin || false,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION') || '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get('REFRESH_TOKEN_SECRET') || (this.jwtService as any).options.secret,
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION') || '7d',
    });

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

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get('REFRESH_TOKEN_SECRET') || (this.jwtService as any).options.secret,
      expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION') || '7d',
    });

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

    // Queue verification email (would be handled by background job)
    // await this.sendVerificationEmail(user, verificationToken);

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
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get('REFRESH_TOKEN_SECRET') || (this.jwtService as any).options.secret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

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

      return {
        accessToken,
      };
    } catch (error: any) {
      throw new UnauthorizedException('Invalid refresh token');
    }
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

    // Store token hash in user record (or separate table for production)
    // For simplicity, we'd send this via email
    const _resetLink = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Queue password reset email
    // await this.emailService.sendTemplateEmail('password-reset', user.email, { resetLink });

    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
      resetToken, // Only for development
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

  async checkLoginAttempts(
    email: string,
  ): Promise<{ allowed: boolean; remainingAttempts?: number }> {
    const _maxAttempts = parseInt(this.configService.get('MAX_LOGIN_ATTEMPTS') || '5', 10);
    const lockoutDuration =
      parseInt(this.configService.get('LOCKOUT_DURATION') || '900', 10) * 1000;

    // This would typically use Redis for rate limiting
    // For now, we'll do a simplified version

    // Check if user is locked
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && user.status === 'locked') {
      // Check if lockout period has expired
      if (user.updatedAt && new Date(user.updatedAt.getTime() + lockoutDuration) > new Date()) {
        return { allowed: false };
      } else {
        // Unlock the user
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: 'active' },
        });
      }
    }

    return { allowed: true };
  }

  async recordFailedLogin(_email: string): Promise<void> {
    const _maxAttempts = parseInt(this.configService.get('MAX_LOGIN_ATTEMPTS') || '5', 10);

    const user = await this.prisma.user.findUnique({
      where: { email: _email },
    });

    if (!user) return;

    // This would use Redis for tracking attempts
    // For now, simplified version

    // If too many failed attempts, lock the account
    // In production, use Redis to track attempts with expiration
  }

  async recordSuccessfulLogin(_email: string): Promise<void> {
    // Clear failed login attempts
    // In production, clear from Redis
  }
}
