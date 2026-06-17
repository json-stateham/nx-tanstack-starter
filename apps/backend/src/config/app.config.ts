export type AppConfig = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM: string;
};

export const validateEnv = (env: Record<string, unknown>): AppConfig => {
  const missing: string[] = [];
  if (!env['DATABASE_URL']) missing.push('DATABASE_URL');
  if (!env['JWT_SECRET']) missing.push('JWT_SECRET');
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);

  return {
    DATABASE_URL: String(env['DATABASE_URL']),
    JWT_SECRET: String(env['JWT_SECRET']),
    NODE_ENV: String(env['NODE_ENV'] ?? 'development'),
    PORT: Number(env['PORT'] ?? 3000),
    FRONTEND_URL: String(env['FRONTEND_URL'] || 'http://localhost:4200'),
    SMTP_HOST: env['SMTP_HOST'] ? String(env['SMTP_HOST']) : undefined,
    SMTP_PORT: Number(env['SMTP_PORT'] ?? 587),
    SMTP_USER: env['SMTP_USER'] ? String(env['SMTP_USER']) : undefined,
    SMTP_PASS: env['SMTP_PASS'] ? String(env['SMTP_PASS']) : undefined,
    SMTP_FROM: String(env['SMTP_FROM'] ?? 'noreply@marketplace.dev'),
  };
};
