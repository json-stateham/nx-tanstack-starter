import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { randomBytes, randomInt, createHash } from 'node:crypto';
import { EmailService } from '../common/email/email.service';
import { PrismaService } from '../prisma/prisma.service';
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

const BCRYPT_ROUNDS = 10;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 15 * 60 * 1000;
const INVITE_TTL_MS = 48 * 60 * 60 * 1000;

const generateOtp = (): string => String(100000 + randomInt(900000));
const generateInviteToken = (): string => randomBytes(32).toString('hex');
const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(input: RegisterInput): Promise<void> {
    const email = input.email.toLowerCase().trim();

    const existing = await this.prisma.authProvider.findUnique({
      where: { type_identifier: { type: 'EMAIL', identifier: email } },
    });
    if (existing) throw new ConflictException('Email already registered');

    const secret = await hash(input.password, BCRYPT_ROUNDS);
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
            expiresAt: new Date(Date.now() + OTP_TTL_MS),
          },
        },
      },
    });

    await this.emailService.sendVerificationEmail(email, code);
  }

  async login(input: LoginInput): Promise<Tokens> {
    const email = input.email.toLowerCase().trim();

    const provider = await this.prisma.authProvider.findUnique({
      where: { type_identifier: { type: 'EMAIL', identifier: email } },
      include: { user: true },
    });

    if (!provider?.secret) {
      this.logger.warn(`Failed login — unknown email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Always run bcrypt to prevent timing-based status enumeration
    const valid = await compare(input.password, provider.secret);

    if (!valid || provider.user.status !== 'ACTIVE') {
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

    // Same error for "not found" and "invalid code" to avoid enumeration
    if (!user) throw new UnauthorizedException('Invalid or expired code');

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
    // Invite tokens are stored as SHA-256 hashes — same pattern as refresh tokens
    const tokenHash = sha256(input.token);

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

    if (!otp) throw new UnauthorizedException('Invalid or expired invite');

    const secret = await hash(input.password, BCRYPT_ROUNDS);

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
    // Store the hash — never the raw token (same pattern as refresh tokens)
    await this.prisma.otpCode.create({
      data: {
        userId,
        code: sha256(token),
        type: 'USER_INVITE',
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
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
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await this.emailService.sendVerificationEmail(normalizedEmail, code);
  }

  async refreshTokens(token: string): Promise<Tokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    const tokenHash = sha256(token);
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

    if (stored.user.status !== 'ACTIVE') {
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
    const tokenHash = sha256(token);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokens(userId: string, email: string, role: UserRole): Promise<Tokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }
}
