import type { UserRole, UserStatus } from '@prisma/client';

export type UpdateUserDto = {
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
};
