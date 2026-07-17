import type { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
};

export type JwtUser = {
  id: string;
  email: string;
  role: UserRole;
};
