import type { components } from '@/lib/api-types.gen';

export type Schema<T extends keyof components['schemas']> = components['schemas'][T];
