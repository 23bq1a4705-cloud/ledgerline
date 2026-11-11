import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((v) => parseInt(v, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('ledgerline-super-secret-jwt-key-2026!'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  INITIAL_ADMIN_EMAIL: z.string().email().default('admin@ledgerline.internal'),
  INITIAL_ADMIN_PASSWORD: z.string().min(8).default('AdminSecureVault2026!'),
  INITIAL_ADMIN_NAME: z.string().default('System Administrator'),
  SYSTEM_CLEARING_ACCOUNT_NUMBER: z.string().default('SYS-CLEARING-000000'),
});

export const env = envSchema.parse(process.env);

