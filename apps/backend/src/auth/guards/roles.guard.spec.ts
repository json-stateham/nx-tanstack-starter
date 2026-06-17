import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import type { JwtUser } from '../types';

const makeContext = (user: JwtUser | undefined, path = '/test', method = 'GET'): ExecutionContext =>
  ({
    getHandler: vi.fn().mockReturnValue({}),
    getClass: vi.fn().mockReturnValue({}),
    switchToHttp: vi.fn().mockReturnValue({
      getRequest: vi.fn().mockReturnValue({ user, method, path }),
    }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('denies when no @Roles() decorator is present', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(makeContext({ id: 'u1', email: 'a@b.com', role: 'ADMIN' }))).toBe(false);
  });

  it('denies when @Roles() is an empty array', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    expect(guard.canActivate(makeContext({ id: 'u1', email: 'a@b.com', role: 'ADMIN' }))).toBe(false);
  });

  it('allows when user role matches the required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    expect(guard.canActivate(makeContext({ id: 'u1', email: 'a@b.com', role: 'ADMIN' }))).toBe(true);
  });

  it('allows when user role is one of several required roles', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'MODERATOR']);

    expect(guard.canActivate(makeContext({ id: 'u1', email: 'a@b.com', role: 'MODERATOR' }))).toBe(true);
  });

  it('denies when user role is not in the required roles list', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    expect(guard.canActivate(makeContext({ id: 'u1', email: 'a@b.com', role: 'BUYER' }))).toBe(false);
  });

  it('denies when there is no authenticated user on the request', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    expect(guard.canActivate(makeContext(undefined))).toBe(false);
  });
});
