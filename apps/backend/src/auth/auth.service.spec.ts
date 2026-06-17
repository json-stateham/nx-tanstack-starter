import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service';
import type { EmailService } from '../common/email/email.service';

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_secret'),
  compare: vi.fn(),
}));

vi.mock('node:crypto', () => ({
  randomBytes: vi.fn().mockReturnValue({ toString: () => 'raw_token_hex' }),
  randomInt: vi.fn().mockReturnValue(23456),
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue('sha256_hash'),
  }),
}));

import { AuthService } from './auth.service';
import { compare } from 'bcryptjs';

type MockPrisma = {
  authProvider: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  user: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  otpCode: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  refreshToken: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const makeTokens = () => ({
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
});

describe('AuthService', () => {
  let service: AuthService;
  let prisma: MockPrisma;
  let jwtService: { sign: ReturnType<typeof vi.fn>; verify: ReturnType<typeof vi.fn> };
  let emailService: { sendVerificationEmail: ReturnType<typeof vi.fn>; sendInviteEmail: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    prisma = {
      authProvider: {
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({}),
      },
      user: {
        create: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      otpCode: {
        findFirst: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
      },
      refreshToken: {
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };

    jwtService = {
      sign: vi.fn().mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token'),
      verify: vi.fn(),
    };

    emailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
      sendInviteEmail: vi.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      emailService as unknown as EmailService,
    );
  });

  // ────────────────────────────────────────────────────────────
  // register
  // ────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user and sends verification email', async () => {
      prisma.authProvider.findUnique.mockResolvedValue(null);

      await service.register({ email: 'test@example.com', password: 'pass1234' });

      expect(prisma.user.create).toHaveBeenCalledOnce();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
    });

    it('normalizes email to lowercase and trims whitespace', async () => {
      prisma.authProvider.findUnique.mockResolvedValue(null);

      await service.register({ email: '  TEST@EXAMPLE.COM  ', password: 'pass1234' });

      expect(prisma.authProvider.findUnique).toHaveBeenCalledWith({
        where: { type_identifier: { type: 'EMAIL', identifier: 'test@example.com' } },
      });
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
    });

    it('throws ConflictException when email is already registered', async () => {
      prisma.authProvider.findUnique.mockResolvedValue({ id: 'existing-provider' });

      await expect(service.register({ email: 'taken@example.com', password: 'pass1234' }))
        .rejects.toBeInstanceOf(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('includes profile when firstName is provided', async () => {
      prisma.authProvider.findUnique.mockResolvedValue(null);

      await service.register({
        email: 'test@example.com',
        password: 'pass',
        firstName: 'John',
        lastName: 'Doe',
      });

      const { data } = prisma.user.create.mock.calls[0][0] as { data: { profile?: { create: { firstName: string; lastName: string } } } };
      expect(data.profile).toEqual({ create: { firstName: 'John', lastName: 'Doe' } });
    });

    it('omits profile block when firstName is absent', async () => {
      prisma.authProvider.findUnique.mockResolvedValue(null);

      await service.register({ email: 'test@example.com', password: 'pass' });

      const { data } = prisma.user.create.mock.calls[0][0] as { data: { profile?: unknown } };
      expect(data.profile).toBeUndefined();
    });
  });

  // ────────────────────────────────────────────────────────────
  // login
  // ────────────────────────────────────────────────────────────

  describe('login', () => {
    const activeUser = { id: 'u1', email: 'test@example.com', status: 'ACTIVE', role: 'BUYER' };

    it('returns tokens and updates lastLoginAt on valid credentials', async () => {
      prisma.authProvider.findUnique.mockResolvedValue({ secret: 'hashed', user: activeUser });
      vi.mocked(compare).mockResolvedValue(true as never);

      const result = await service.login({ email: 'test@example.com', password: 'correct' });

      expect(result).toEqual(makeTokens());
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('normalizes email before lookup', async () => {
      prisma.authProvider.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: '  UPPER@CASE.COM  ', password: 'pass' }))
        .rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.authProvider.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type_identifier: { type: 'EMAIL', identifier: 'upper@case.com' } },
        }),
      );
    });

    it('throws UnauthorizedException for an unknown email', async () => {
      prisma.authProvider.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'ghost@example.com', password: 'pass' }))
        .rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when password is incorrect', async () => {
      prisma.authProvider.findUnique.mockResolvedValue({ secret: 'hashed', user: activeUser });
      vi.mocked(compare).mockResolvedValue(false as never);

      await expect(service.login({ email: 'test@example.com', password: 'wrong' }))
        .rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user account is not ACTIVE', async () => {
      const pendingUser = { ...activeUser, status: 'PENDING_VERIFICATION' };
      prisma.authProvider.findUnique.mockResolvedValue({ secret: 'hashed', user: pendingUser });
      vi.mocked(compare).mockResolvedValue(true as never);

      await expect(service.login({ email: 'test@example.com', password: 'pass' }))
        .rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ────────────────────────────────────────────────────────────
  // verifyEmail
  // ────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    const mockUser = { id: 'u1', email: 'test@example.com', role: 'BUYER' };
    const mockOtp = { id: 'otp-1' };

    it('activates user and returns tokens on valid code', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.otpCode.findFirst.mockResolvedValue(mockOtp);

      const result = await service.verifyEmail({ email: 'test@example.com', code: '123456' });

      expect(result).toEqual(makeTokens());
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('throws UnauthorizedException when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail({ email: 'ghost@example.com', code: '123456' }))
        .rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.otpCode.findFirst).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when OTP is invalid or expired', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail({ email: 'test@example.com', code: '000000' }))
        .rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('looks up user with normalized email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.otpCode.findFirst.mockResolvedValue(mockOtp);

      await service.verifyEmail({ email: '  TEST@EXAMPLE.COM  ', code: '123456' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
      });
    });
  });

  // ────────────────────────────────────────────────────────────
  // acceptInvite
  // ────────────────────────────────────────────────────────────

  describe('acceptInvite', () => {
    const inviteUser = { id: 'u1', email: 'invited@example.com', role: 'BUYER' };
    const mockOtp = { id: 'otp-1', userId: 'u1', user: inviteUser };

    it('creates auth provider, activates user, and returns tokens', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(mockOtp);

      const result = await service.acceptInvite({ token: 'raw_invite', password: 'newpass123' });

      expect(result).toEqual(makeTokens());
      expect(prisma.$transaction).toHaveBeenCalledOnce();
    });

    it('throws UnauthorizedException for an invalid or expired invite', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(service.acceptInvite({ token: 'bad_token', password: 'pass' }))
        .rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────
  // createInviteToken
  // ────────────────────────────────────────────────────────────

  describe('createInviteToken', () => {
    it('stores the hashed token and sends the raw token by email', async () => {
      await service.createInviteToken('u1', 'user@example.com');

      expect(prisma.otpCode.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          code: 'sha256_hash',
          type: 'USER_INVITE',
          expiresAt: expect.any(Date),
        }),
      });
      expect(emailService.sendInviteEmail).toHaveBeenCalledWith('user@example.com', 'raw_token_hex');
    });
  });

  // ────────────────────────────────────────────────────────────
  // resendVerification
  // ────────────────────────────────────────────────────────────

  describe('resendVerification', () => {
    it('invalidates old OTPs and sends a fresh verification email', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'PENDING_VERIFICATION' });

      await service.resendVerification('test@example.com');

      expect(prisma.otpCode.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', type: 'EMAIL_VERIFICATION', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.otpCode.create).toHaveBeenCalledOnce();
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
    });

    it('normalizes email for lookup', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.resendVerification('  UPPER@CASE.COM  ');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'upper@case.com', deletedAt: null },
      });
    });

    it('returns silently when email does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await service.resendVerification('ghost@example.com');

      expect(prisma.otpCode.updateMany).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('returns silently when user is already ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVE' });

      await service.resendVerification('active@example.com');

      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────
  // refreshTokens
  // ────────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    const jwtPayload = { sub: 'u1', email: 'test@example.com', role: 'BUYER' };
    const activeUser = { id: 'u1', email: 'test@example.com', role: 'BUYER', status: 'ACTIVE' };
    const validStoredToken = {
      id: 't1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: activeUser,
    };

    it('rotates the refresh token and returns a new token pair', async () => {
      jwtService.verify.mockReturnValue(jwtPayload);
      prisma.refreshToken.findUnique.mockResolvedValue(validStoredToken);

      const result = await service.refreshTokens('valid_refresh_token');

      expect(result).toEqual(makeTokens());
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('throws UnauthorizedException when JWT is malformed', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(service.refreshTokens('bad_jwt')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('revokes all user tokens and throws when token hash is not in DB', async () => {
      jwtService.verify.mockReturnValue(jwtPayload);
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('unknown_token')).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('revokes all user tokens and throws when token was already revoked', async () => {
      jwtService.verify.mockReturnValue(jwtPayload);
      prisma.refreshToken.findUnique.mockResolvedValue({ ...validStoredToken, revokedAt: new Date() });

      await expect(service.refreshTokens('revoked_token')).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user is not ACTIVE', async () => {
      jwtService.verify.mockReturnValue(jwtPayload);
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...validStoredToken,
        user: { ...activeUser, status: 'BANNED' },
      });

      await expect(service.refreshTokens('token')).rejects.toBeInstanceOf(UnauthorizedException);

      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────
  // logout
  // ────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes the refresh token by its hash', async () => {
      await service.logout('my_refresh_token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: 'sha256_hash', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
