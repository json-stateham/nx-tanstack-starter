import type { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export type JwtUser = {
  id: string;
  email: string;
  role: UserRole;
};
