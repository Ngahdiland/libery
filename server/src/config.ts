import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB: z.string().min(1).default('libery'),
  JWT_ACCESS_SECRET: z.string().min(32),
  ADMIN_API_KEY: z.string().min(32).optional(),
  CORS_ORIGINS: z.string().default('http://localhost:19006,http://localhost:8081'),
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
}).superRefine((value, context) => {
  const cloudinaryValues = [
    value.CLOUDINARY_CLOUD_NAME,
    value.CLOUDINARY_API_KEY,
    value.CLOUDINARY_API_SECRET,
  ];
  if (cloudinaryValues.some(Boolean) && cloudinaryValues.some((item) => !item)) {
    context.addIssue({
      code: 'custom',
      message: 'Cloudinary cloud name, API key, and API secret must be configured together.',
      path: ['CLOUDINARY_CLOUD_NAME'],
    });
  }
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  trustProxyHops: number;
  mongoUri: string;
  mongoDb: string;
  jwtAccessSecret: string;
  adminApiKey?: string;
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  corsOrigins: string[];
};

export function readConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse(environment);
  if (!parsed.success) {
    const invalidKeys = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Invalid server configuration: ${invalidKeys}`);
  }

  if (parsed.data.NODE_ENV === 'production' && !parsed.data.ADMIN_API_KEY) {
    throw new Error('ADMIN_API_KEY is required in production.');
  }

  const corsOrigins = parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (parsed.data.NODE_ENV === 'production' && corsOrigins.some((origin) => {
    try {
      return new URL(origin).protocol !== 'https:';
    } catch {
      return true;
    }
  })) {
    throw new Error('Production CORS_ORIGINS must contain only valid HTTPS origins.');
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    trustProxyHops: parsed.data.TRUST_PROXY_HOPS,
    mongoUri: parsed.data.MONGODB_URI,
    mongoDb: parsed.data.MONGODB_DB,
    jwtAccessSecret: parsed.data.JWT_ACCESS_SECRET,
    adminApiKey: parsed.data.ADMIN_API_KEY,
    ...(parsed.data.CLOUDINARY_CLOUD_NAME && parsed.data.CLOUDINARY_API_KEY && parsed.data.CLOUDINARY_API_SECRET
      ? {
          cloudinary: {
            cloudName: parsed.data.CLOUDINARY_CLOUD_NAME,
            apiKey: parsed.data.CLOUDINARY_API_KEY,
            apiSecret: parsed.data.CLOUDINARY_API_SECRET,
          },
        }
      : {}),
    corsOrigins,
  };
}
