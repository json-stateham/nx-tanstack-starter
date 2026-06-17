import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// prisma.config.ts is evaluated before Prisma loads .env — read it manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
}

export default defineConfig({
  schema: path.join('apps', 'backend', 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env['DATABASE_URL']!,
  },
  migrate: {
    async adapter(env) {
      const { PrismaPg } = await import('@prisma/adapter-pg');
      return new PrismaPg({ connectionString: env['DATABASE_URL'] });
    },
  },
});
