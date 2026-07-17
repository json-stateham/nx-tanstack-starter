import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { randomBytes, randomInt, createHmac } from 'node:crypto';
import { EmailService } from '../common/email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AppConfig } from '../config/app.config';
import type { JwtPayload } from './types';

type RegisterInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

const generateOtp = (): string => String(100000 + randomInt(900000)); // guarantees no leading zero
const generateInviteToken = (): string => randomBytes(32).toString('hex'); // 256-bit entropy
const hmacSha256 = (value: string, secret: string): string =>
  createHmac('sha256', secret).update(value).digest('hex'); // store hash, never the raw token

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds: number;
  private readonly refreshTtlMs: number;
  private readonly otpTtlMs: number;
  private readonly inviteTtlMs: number;
  private readonly hmacSecret: string;
  // Hashed at the same configured cost as real credentials, so the login()
  // timing-safety compare below can't be distinguished from a real user's
  // hash by cost alone (see bcryptRounds).
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    config: ConfigService<AppConfig>,
  ) {
    this.bcryptRounds = config.getOrThrow('BCRYPT_ROUNDS');
    this.refreshTtlMs = config.getOrThrow('REFRESH_TOKEN_TTL_DAYS') * 24 * 60 * 60 * 1000;
    this.otpTtlMs = config.getOrThrow('OTP_TTL_MINUTES') * 60 * 1000;
    this.inviteTtlMs = config.getOrThrow('INVITE_TTL_HOURS') * 60 * 60 * 1000;
    this.hmacSecret = config.getOrThrow('HMAC_SECRET');
    this.dummyHash = hash('dummy-password-for-timing-safety', this.bcryptRounds);
  }

  async register(input: RegisterInput): Promise<void> {
    const email = input.email.toLowerCase().trim();

    const existing = await this.prisma.authProvider.findUnique({
      where: { type_identifier: { type: 'EMAIL', identifier: email } },
    });
    if (existing) throw new ConflictException('Email already registered');

    const secret = await hash(input.password, this.bcryptRounds);
    const code = generateOtp();

    await this.prisma.user.create({
      data: {
        email,
        status: 'PENDING_VERIFICATION',
        authProviders: {
          create: { type: 'EMAIL', identifier: email, secret },
        },
        ...(input.firstName && {
          profile: {
            create: { firstName: input.firstName, lastName: input.lastName ?? '' },
          },
        }),
        otpCodes: {
          create: {
            code,
            type: 'EMAIL_VERIFICATION',
            expiresAt: new Date(Date.now() + this.otpTtlMs),
          },
        },
      },
    });

    await this.emailService.sendVerificationEmail(email, code);
  }

  async login(input: LoginInput): Promise<Tokens> {
    const email = input.email.toLowerCase().trim();

    const provider = await this.prisma.authProvider.findFirst({
      where: { type: 'EMAIL', identifier: email, user: { deletedAt: null } },
      include: { user: true },
    });

    // Always run bcrypt regardless of whether the email exists — prevents
    // timing-based email enumeration. dummyHash is costed at this.bcryptRounds
    // so the unknown-email branch can't be distinguished from a real one by
    // whatever cost factor is currently configured.
    const valid = await compare(input.password, provider?.secret ?? (await this.dummyHash));

    if (!valid || !provider || provider.user.status !== 'ACTIVE') {
      this.logger.warn(`Failed login attempt: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: provider.user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`Successful login: ${email} (userId: ${provider.user.id})`);
    return this.generateTokens(provider.user.id, email, provider.user.role);
  }

  async verifyEmail(input: { email: string; code: string }): Promise<Tokens> {
    const email = input.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    // Same error for "not found", "invalid code", and "already active/suspended"
    // to avoid enumeration and to stop a stale OTP from reactivating a
    // since-suspended/banned account.
    if (!user || user.status !== 'PENDING_VERIFICATION') {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
        code: input.code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) throw new UnauthorizedException('Invalid or expired code');

    await this.prisma.$transaction([
      this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      }),
    ]);

    return this.generateTokens(user.id, user.email, user.role);
  }

  async acceptInvite(input: { token: string; password: string }): Promise<Tokens> {
    const tokenHash = hmacSha256(input.token, this.hmacSecret);

    const otp = await this.prisma.otpCode.findFirst({
      where: {
        type: 'USER_INVITE',
        code: tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
        user: { deletedAt: null },
      },
      include: { user: true },
    });

    // Same guard as verifyEmail: a stale, unused invite must not be able to
    // reactivate a user whose status has since moved on (suspended/banned/etc).
    if (!otp || otp.user.status !== 'PENDING_VERIFICATION') {
      throw new UnauthorizedException('Invalid or expired invite');
    }

    const secret = await hash(input.password, this.bcryptRounds);

    await this.prisma.$transaction([
      this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } }),
      this.prisma.authProvider.create({
        data: { userId: otp.userId, type: 'EMAIL', identifier: otp.user.email, secret },
      }),
      this.prisma.user.update({
        where: { id: otp.userId },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      }),
    ]);

    return this.generateTokens(otp.user.id, otp.user.email, otp.user.role);
  }

  async createInviteToken(userId: string, email: string): Promise<void> {
    const token = generateInviteToken();
    await this.prisma.otpCode.create({
      data: {
        userId,
        code: hmacSha256(token, this.hmacSecret),
        type: 'USER_INVITE',
        expiresAt: new Date(Date.now() + this.inviteTtlMs),
      },
    });
    await this.emailService.sendInviteEmail(email, token);
  }

  async resendVerification(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail, deletedAt: null },
    });

    // Always return silently — never reveal whether the email exists
    if (!user || user.status !== 'PENDING_VERIFICATION') return;

    // Invalidate all existing unused OTP codes before issuing a new one
    await this.prisma.otpCode.updateMany({
      where: { userId: user.id, type: 'EMAIL_VERIFICATION', usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = generateOtp();
    await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        code,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + this.otpTtlMs),
      },
    });

    await this.emailService.sendVerificationEmail(normalizedEmail, code);
  }

  async refreshToken(token: string): Promise<Tokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, { algorithms: ['RS256'] });
    } catch {
      throw new UnauthorizedException();
    }

    const tokenHash = hmacSha256(token, this.hmacSecret);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      // Revoked or missing token may indicate theft — invalidate all active tokens
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException();
    }

    if (stored.user.status !== 'ACTIVE' || stored.user.deletedAt !== null) {
      throw new UnauthorizedException('Account is suspended or banned');
    }

    // Rotate: revoke old token, issue a new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(token: string): Promise<void> {
    const tokenHash = hmacSha256(token, this.hmacSecret);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokens(userId: string, email: string, role: UserRole): Promise<Tokens> {
    const accessToken = this.jwtService.sign(
      { sub: userId, email, role, type: 'access' } satisfies JwtPayload,
      { expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, email, role, type: 'refresh' } satisfies JwtPayload,
      { expiresIn: '7d' },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hmacSha256(refreshToken, this.hmacSecret),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
      },
    });

    return { accessToken, refreshToken };
  }
}
