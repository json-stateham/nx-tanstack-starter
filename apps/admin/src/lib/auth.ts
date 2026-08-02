import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';

import { API_BASE } from '@/lib/api';
import type { Schema } from '@/lib/api-schema';

export type CurrentUserDto = Schema<'CurrentUserDto'>;

const USER_ROLES = ['BUYER', 'ADMIN', 'MODERATOR'] as const satisfies readonly CurrentUserDto['role'][];

const isCurrentUserDto = (value: unknown): value is CurrentUserDto => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || !('email' in value) || !('role' in value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.role === 'string' &&
    USER_ROLES.some((role) => role === value.role)
  );
};

// Server-only: SSR has no browser cookie jar, so the incoming request's
// Cookie header is forwarded manually to the backend.
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentUserDto | null> => {
    const cookie = getRequestHeader('Cookie');
    const apiOrigin = process.env['VITE_API_URL'] ?? 'http://localhost:3000';

    const res = await fetch(`${apiOrigin}${API_BASE}/auth/me`, {
      headers: cookie ? { Cookie: cookie } : {},
    });

    if (res.status === 401) return null;
    if (!res.ok) throw new Error('Failed to load current user');

    const data: unknown = await res.json();
    if (!isCurrentUserDto(data)) throw new Error('Unexpected /auth/me response shape');

    return data;
  },
);
