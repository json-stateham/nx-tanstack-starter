import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { JwtUser } from './types';

const IS_PROD = process.env['NODE_ENV'] === 'production';

const ACCESS_COOKIE: CookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax',
  maxAge: 15 * 60 * 1000,
};

// Scope the refresh cookie to its own endpoint to limit exposure
const REFRESH_COOKIE: CookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth/refresh',
};

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const { accessToken, refreshToken } = await this.authService.register(dto);
    res.cookie('access_token', accessToken, ACCESS_COOKIE);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { ok: true };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.cookie('access_token', accessToken, ACCESS_COOKIE);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { ok: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const token = (req.cookies as Record<string, string | undefined>)?.['refresh_token'];
    if (!token) throw new UnauthorizedException();

    const { accessToken, refreshToken } = await this.authService.refreshTokens(token);
    res.cookie('access_token', accessToken, ACCESS_COOKIE);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE);
    return { ok: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const token = (req.cookies as Record<string, string | undefined>)?.['refresh_token'];
    if (token) await this.authService.logout(token);

    res.clearCookie('access_token');
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtUser): JwtUser {
    return user;
  }
}
