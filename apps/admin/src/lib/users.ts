import { API_BASE } from '@/lib/api';
import type { Schema } from '@/lib/api-schema';

export type UserListItemDto = Schema<'UserListItemDto'>;
export type PaginatedUsersDto = Schema<'PaginatedUsersDto'>;

const isPaginatedUsersDto = (value: unknown): value is PaginatedUsersDto => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('data' in value) || !('total' in value) || !('page' in value) || !('limit' in value)) {
    return false;
  }

  return (
    Array.isArray(value.data) &&
    typeof value.total === 'number' &&
    typeof value.page === 'number' &&
    typeof value.limit === 'number'
  );
};

export const fetchUsers = async (options: { page: number; limit: number }): Promise<PaginatedUsersDto> => {
  const params = new URLSearchParams({
    page: String(options.page),
    limit: String(options.limit),
  });

  const res = await fetch(`${API_BASE}/users?${params.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Failed to load users');

  const data: unknown = await res.json();
  if (!isPaginatedUsersDto(data)) throw new Error('Unexpected /users response shape');

  return data;
};
