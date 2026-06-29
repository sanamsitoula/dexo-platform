import { AuthService } from './auth.service';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('@dexo/shared', () => ({
  PrismaService: jest.fn(),
  AuditService: jest.fn(),
}));

function makeUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-pw',
    firstName: 'Test',
    lastName: 'User',
    tenantId: 'tenant-1',
    emailVerified: false,
    isPlatformAdmin: false,
    status: 'active',
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    userRoles: {
      create: jest.fn(),
    },
    tenantDomain: {
      findFirst: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    branch: {
      findFirst: jest.fn(),
    },
  } as any;
}

function buildJwtMock() {
  return {
    sign: jest.fn().mockReturnValue('signed-token'),
    verify: jest.fn(),
    options: { secret: 'jwt-secret' },
  } as any;
}

function buildConfigMock() {
  return {
    get: jest.fn().mockReturnValue(undefined),
  } as any;
}

function buildAuditMock() {
  return {
    logAuthEvent: jest.fn().mockResolvedValue(undefined),
    logUserAction: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let jwt: ReturnType<typeof buildJwtMock>;
  let config: ReturnType<typeof buildConfigMock>;
  let audit: ReturnType<typeof buildAuditMock>;

  beforeEach(() => {
    prisma = buildPrismaMock();
    jwt = buildJwtMock();
    config = buildConfigMock();
    audit = buildAuditMock();
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash as jest.Mock).mockReset();
    service = new AuthService(prisma, jwt, config, audit);
  });

  describe('validateUser', () => {
    it('returns null when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.validateUser('none@example.com', 'pw');
      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('returns null when password is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const result = await service.validateUser('test@example.com', 'wrong');
      expect(result).toBeNull();
    });

    it('returns user without passwordHash when password is valid', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateUser('test@example.com', 'pw');
      expect(result.passwordHash).toBeUndefined();
      expect(result.id).toBe('user-1');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'none@example.com', password: 'pw' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(audit.logAuthEvent).toHaveBeenCalledWith(
        'user.failed_login',
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('throws BadRequestException when account is locked', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ status: 'locked' }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(
        service.login({ email: 'test@example.com', password: 'pw' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when status is not active/pending_verification', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ status: 'disabled' }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(
        service.login({ email: 'test@example.com', password: 'pw' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException when tenantId does not match', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ tenantId: 'tenant-1' }));
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(
        service.login({ email: 'test@example.com', password: 'pw', tenantId: 'other-tenant' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('resolves subdomain to tenantId then succeeds', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-1' });
      prisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(makeUser());

      const result = await service.login({
        email: 'test@example.com',
        password: 'pw',
        subdomain: 'vrfitness',
      });

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { subdomain: 'vrfitness' },
        select: { id: true },
      });
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBe('signed-token');
      expect(result.user.id).toBe('user-1');
      expect(audit.logAuthEvent).toHaveBeenCalledWith('user.login', 'user-1', 'tenant-1');
    });

    it('returns tokens and user on successful login', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(makeUser());

      const result = await service.login({ email: 'test@example.com', password: 'pw' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user.emailVerified).toBe(false);
    });
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password1',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a user and returns tokens with requiresVerification=true (no tenantId)', async () => {
      const createdUser = makeUser({
        email: 'new@example.com',
        passwordHash: 'new-hash',
        tenantId: undefined,
        firstName: 'A',
        lastName: 'B',
      });
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password1',
        firstName: 'A',
        lastName: 'B',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Password1', 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          passwordHash: 'new-hash',
          firstName: 'A',
          lastName: 'B',
          phone: undefined,
          tenantId: undefined,
          status: 'pending_verification',
        },
      });
      expect(result.requiresVerification).toBe(true);
      expect(result.accessToken).toBe('signed-token');
      expect(audit.logUserAction).toHaveBeenCalledWith(
        'user.created',
        'user-1',
        undefined,
        'user-1',
        { email: 'new@example.com', method: 'self-registration' },
      );
    });

    it('assigns tenant admin role and auto-creates member for fitness tenant', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      prisma.user.create.mockResolvedValue(makeUser({ tenantId: 'tenant-1', passwordHash: 'new-hash' }));
      prisma.role.findFirst.mockResolvedValue({ id: 'role-admin' });
      prisma.userRoles.create.mockResolvedValue({});
      prisma.tenantDomain.findFirst.mockResolvedValue({
        id: 'td-1',
        domain: { id: 'd-1', code: 'FITNESS_CENTER' },
      });
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.branch.findFirst.mockResolvedValue({ id: 'branch-1' });
      prisma.member.create.mockResolvedValue({});

      const result = await service.register({
        email: 'new@example.com',
        password: 'Password1',
        tenantId: 'tenant-1',
      });

      expect(prisma.userRoles.create).toHaveBeenCalled();
      expect(prisma.member.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          membershipType: 'TRIAL',
          status: 'PENDING_VERIFICATION',
        }),
      });
      expect(result.requiresVerification).toBe(true);
    });
  });

  describe('validateToken', () => {
    it('throws UnauthorizedException when jwt.verify fails', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('bad token');
      });
      await expect(service.validateToken('bad')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateToken('ok')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is not active', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue(makeUser({ status: 'locked' }));
      await expect(service.validateToken('ok')).rejects.toThrow(UnauthorizedException);
    });

    it('returns valid=true with user on success', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue(makeUser());
      const result = await service.validateToken('ok');
      expect(result.valid).toBe(true);
      expect(result.user.id).toBe('user-1');
      expect(result.user.passwordHash).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    it('throws UnauthorizedException when refresh token is invalid', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('bad');
      });
      await expect(service.refreshToken('bad')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not active', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue(makeUser({ status: 'locked' }));
      await expect(service.refreshToken('ok')).rejects.toThrow(UnauthorizedException);
    });

    it('returns a new accessToken on success', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1' });
      prisma.user.findUnique.mockResolvedValue(makeUser());
      jwt.sign.mockReturnValue('new-access');
      const result = await service.refreshToken('ok');
      expect(result.accessToken).toBe('new-access');
    });
  });

  describe('getUserProfile', () => {
    it('throws BadRequestException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserProfile('nope')).rejects.toThrow(BadRequestException);
    });

    it('returns user without passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...makeUser(),
        userRoles: [],
        tenant: { id: 'tenant-1', name: 'VR Fitness' },
      });
      const result = await service.getUserProfile('user-1');
      expect(result.id).toBe('user-1');
      expect(result.passwordHash).toBeUndefined();
      expect(result.tenant).toEqual({ id: 'tenant-1', name: 'VR Fitness' });
    });
  });

  describe('requestPasswordReset', () => {
    it('returns generic message when user not found (no enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.requestPasswordReset({ email: 'none@example.com' });
      expect(result.message).toContain('If an account exists');
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when account is locked', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ status: 'locked' }));
      await expect(
        service.requestPasswordReset({ email: 'test@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns message and resetToken when ok', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      jwt.sign.mockReturnValue('reset-token');
      const result = await service.requestPasswordReset({ email: 'test@example.com' });
      expect(result.resetToken).toBe('reset-token');
      expect(result.message).toContain('If an account exists');
    });
  });

  describe('resetPassword', () => {
    it('throws BadRequestException when token is invalid', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('bad');
      });
      await expect(
        service.resetPassword({ token: 'bad', newPassword: 'Password1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token type is wrong', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'email_verification' });
      await expect(
        service.resetPassword({ token: 'ok', newPassword: 'Password1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when user not found', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'password_reset' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'ok', newPassword: 'Password1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the password hash on success', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'password_reset' });
      prisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.resetPassword({ token: 'ok', newPassword: 'Password1' });

      expect(bcrypt.hash).toHaveBeenCalledWith('Password1', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'new-hash' },
      });
      expect(result.message).toContain('Password reset successfully');
    });
  });

  describe('verifyEmail', () => {
    it('throws BadRequestException when token is invalid', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('bad');
      });
      await expect(service.verifyEmail({ token: 'bad' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token type is wrong', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'password_reset' });
      await expect(service.verifyEmail({ token: 'ok' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when user not found', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'email_verification' });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail({ token: 'ok' })).rejects.toThrow(BadRequestException);
    });

    it('returns already-verified message when email already verified', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'email_verification' });
      prisma.user.findUnique.mockResolvedValue(makeUser({ emailVerified: true }));
      const result = await service.verifyEmail({ token: 'ok' });
      expect(result.message).toContain('already verified');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('verifies email and activates user on success', async () => {
      jwt.verify.mockReturnValue({ sub: 'user-1', type: 'email_verification' });
      prisma.user.findUnique.mockResolvedValue(makeUser({ emailVerified: false }));
      prisma.user.update.mockResolvedValue(makeUser());

      const result = await service.verifyEmail({ token: 'ok' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerified: true, status: 'active' },
      });
      expect(result.message).toContain('Email verified successfully');
    });
  });

  describe('resendVerificationEmail', () => {
    it('returns generic message when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.resendVerificationEmail({ email: 'none@example.com' });
      expect(result.message).toContain('If an account exists');
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when email already verified', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ emailVerified: true }));
      await expect(
        service.resendVerificationEmail({ email: 'test@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns message and verificationToken on success', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ emailVerified: false }));
      jwt.sign.mockReturnValue('verify-token');
      const result = await service.resendVerificationEmail({ email: 'test@example.com' });
      expect(result.verificationToken).toBe('verify-token');
      expect(result.message).toContain('If an account exists');
    });
  });

  describe('changePassword', () => {
    it('throws BadRequestException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.changePassword('nope', { oldPassword: 'old', newPassword: 'Password1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when old password is wrong', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.changePassword('user-1', { oldPassword: 'wrong', newPassword: 'Password1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates password on success', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      const result = await service.changePassword('user-1', {
        oldPassword: 'old',
        newPassword: 'Password1',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Password1', 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'new-hash' },
      });
      expect(result.message).toContain('Password changed successfully');
    });
  });

  describe('checkLoginAttempts', () => {
    it('returns allowed=true when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.checkLoginAttempts('none@example.com');
      expect(result.allowed).toBe(true);
    });

    it('returns allowed=false when locked and lockout not expired', async () => {
      const justNow = new Date();
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ status: 'locked', updatedAt: justNow }),
      );
      const result = await service.checkLoginAttempts('test@example.com');
      expect(result.allowed).toBe(false);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('unlocks and returns allowed=true when lockout expired', async () => {
      const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
      prisma.user.findUnique.mockResolvedValue(
        makeUser({ status: 'locked', updatedAt: old }),
      );
      prisma.user.update.mockResolvedValue(makeUser());
      const result = await service.checkLoginAttempts('test@example.com');
      expect(result.allowed).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: 'active' },
      });
    });
  });

  describe('recordFailedLogin / recordSuccessfulLogin', () => {
    it('recordFailedLogin resolves without throwing when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.recordFailedLogin('none@example.com')).resolves.toBeUndefined();
    });

    it('recordFailedLogin resolves when user exists', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      await expect(service.recordFailedLogin('test@example.com')).resolves.toBeUndefined();
    });

    it('recordSuccessfulLogin resolves without throwing', async () => {
      await expect(service.recordSuccessfulLogin('test@example.com')).resolves.toBeUndefined();
    });
  });
});
