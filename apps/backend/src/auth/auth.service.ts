import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@prisma/client';
import { hash, compare } from 'bcryptjs';
import { createHash } from 'node:crypto';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<Tokens> {
    const existing = await this.prisma.authProvider.findUnique({
      where: { type_identifier: { type: 'EMAIL', identifier: input.email } },
    });
    if (existing) throw new ConflictException('Email already registered');

    const secret = await hash(input.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        status: 'ACTIVE',
        authProviders: {
          create: { type: 'EMAIL', identifier: input.email, secret },
        },
        ...(input.firstName && {
          profile: {
            create: {
              firstName: input.firstName,
              lastName: input.lastName ?? '',
            },
          },
        }),
      },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(input: LoginInput): Promise<Tokens> {
    const provider = await this.prisma.authProvider.findUnique({
      where: { type_identifier: { type: 'EMAIL', identifier: input.email } },
      include: { user: true },
    });

    // Use the same error for both "not found" and "wrong password" to avoid user enumeration
    if (!provider?.secret) throw new UnauthorizedException('Invalid credentials');

    const valid = await compare(input.password, provider.secret);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (provider.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended or banned');
    }

    await this.prisma.user.update({
      where: { id: provider.user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(provider.user.id, provider.user.email, provider.user.role);
  }

  async generateTokens(userId: string, email: string, role: UserRole): Promise<Tokens> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(token: string): Promise<Tokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    // Rotate: revoke old token, issue a new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(payload.sub, payload.email, payload.role);
  }

  async logout(token: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
