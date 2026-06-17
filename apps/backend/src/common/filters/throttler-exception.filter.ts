import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ThrottlerGuard');

  catch(_exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    this.logger.warn(
      `Rate limit exceeded: ${req.method} ${req.path} — IP: ${req.ip ?? 'unknown'}`,
    );

    res.status(429).json({ statusCode: 429, message: 'Too Many Requests' });
  }
}
