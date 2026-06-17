import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload, JwtUser } from '../types';

const cookieExtractor = (req: Request): string | null =>
  (req?.cookies as Record<string, string | undefined>)?.['access_token'] ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET']!,
    });
  }

  validate(payload: JwtPayload): JwtUser {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
