import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/whatsapp_crm'),
  AUTH_ADAPTER: z.enum(['local', 'jwt', 'session', 'mock']).default('local'),
  JWT_SECRET: z.string().default('dev-secret'),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_ALGORITHM: z.enum(['HS256', 'RS256']).default('HS256'),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),
  JWT_USER_ID_CLAIM: z.string().default('sub'),
  JWT_TENANT_ID_CLAIM: z.string().default('tenantId'),
  JWT_ROLE_CLAIM: z.string().default('role'),
  JWT_PERMISSIONS_CLAIM: z.string().default('permissions'),
  JWT_INTROSPECTION_URL: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SESSION_INTROSPECTION_URL: z.string().optional(),
  MOCK_USER_ID: z.string().default('user-001'),
  MOCK_TENANT_ID: z.string().default('tenant-001'),
  MOCK_USER_ROLE: z.enum(['ADMIN', 'USER']).default('ADMIN'),
  MOCK_USER_EMAIL: z.string().default('admin@example.com'),
  MOCK_USER_NAME: z.string().default('Admin User'),
  DEFAULT_TENANT_ID: z.string().default('tenant-001'),
  META_API_VERSION: z.string().default('v21.0'),
  META_APP_SECRET: z.string().default(''),
  META_VERIFY_TOKEN: z.string().default('verify-token'),
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  ENCRYPTION_KEY: z.string().min(64),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('whatsapp-crm-media'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  PRESIGNED_URL_EXPIRY: z.coerce.number().default(3600),
  CALLING_ENABLED: z.coerce.boolean().default(false),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().default(60),
  OTP_EXPIRES_MINUTES: z.coerce.number().default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(20),
  CACHE_TTL_MS: z.coerce.number().default(60000),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(16),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

export const env = envSchema
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== 'production') {
      return;
    }

    if (!data.JWT_SECRET || data.JWT_SECRET === 'dev-secret' || data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        message:
          'JWT_SECRET must be set to a strong value (at least 32 characters) in production',
        path: ['JWT_SECRET'],
      });
    }
  })
  .parse(process.env);
