import type { UserRole, UserStatus } from '@prisma/client';

export type CreateUserDto = {
  email: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
};
