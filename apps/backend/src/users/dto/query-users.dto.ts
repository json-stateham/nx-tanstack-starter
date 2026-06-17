import type { UserRole, UserStatus } from '@prisma/client';

export type QueryUsersDto = {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
};
