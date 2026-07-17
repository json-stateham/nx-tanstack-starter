export type AppConfig = {
  DATABASE_URL: string;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  HMAC_SECRET: string;
  NODE_ENV: string;
  PORT: number;
  FRONTEND_URL: string;
  BCRYPT_ROUNDS: number;
  REFRESH_TOKEN_TTL_DAYS: number;
  OTP_TTL_MINUTES: number;
  INVITE_TTL_HOURS: number;
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM: string;
};

export const validateEnv = (env: Record<string, unknown>): AppConfig => {
  const missing: string[] = [];
  if (!env['DATABASE_URL']) missing.push('DATABASE_URL');
  if (!env['JWT_PRIVATE_KEY']) missing.push('JWT_PRIVATE_KEY');
  if (!env['JWT_PUBLIC_KEY']) missing.push('JWT_PUBLIC_KEY');
  if (!env['HMAC_SECRET']) missing.push('HMAC_SECRET');
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(', ')}`);

  return {
    DATABASE_URL: String(env['DATABASE_URL']),
    JWT_PRIVATE_KEY: String(env['JWT_PRIVATE_KEY']),
    JWT_PUBLIC_KEY: String(env['JWT_PUBLIC_KEY']),
    HMAC_SECRET: String(env['HMAC_SECRET']),
    NODE_ENV: String(env['NODE_ENV'] ?? 'development'),
    BCRYPT_ROUNDS: Number(env['BCRYPT_ROUNDS'] ?? 10),
    REFRESH_TOKEN_TTL_DAYS: Number(env['REFRESH_TOKEN_TTL_DAYS'] ?? 7),
    OTP_TTL_MINUTES: Number(env['OTP_TTL_MINUTES'] ?? 15),
    INVITE_TTL_HOURS: Number(env['INVITE_TTL_HOURS'] ?? 48),
    PORT: Number(env['PORT'] ?? 3000),
    FRONTEND_URL: String(env['FRONTEND_URL'] || 'http://localhost:4200'),
    SMTP_HOST: env['SMTP_HOST'] ? String(env['SMTP_HOST']) : undefined,
    SMTP_PORT: Number(env['SMTP_PORT'] ?? 587),
    SMTP_USER: env['SMTP_USER'] ? String(env['SMTP_USER']) : undefined,
    SMTP_PASS: env['SMTP_PASS'] ? String(env['SMTP_PASS']) : undefined,
    SMTP_FROM: String(env['SMTP_FROM'] ?? 'noreply@marketplace.dev'),
  };
};
