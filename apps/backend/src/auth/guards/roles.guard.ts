import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { JwtUser } from '../types';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator means no access — deny by default
    if (!roles?.length) return false;

    const request = context.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const user = request.user;
    const allowed = user !== undefined && roles.includes(user.role);

    if (!allowed) {
      this.logger.warn(
        `Authorization denied: userId=${user?.id ?? 'unknown'} role=${user?.role ?? 'none'} required=[${roles.join(',')}] ${request.method} ${request.path}`,
      );
    }

    return allowed;
  }
}
