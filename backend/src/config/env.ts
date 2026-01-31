import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ENCRYPTION_KEY: string;
  FRONTEND_URL: string;
}

function validateEnv(): EnvConfig {
  const required = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'FRONTEND_URL'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3001', 10),
    DATABASE_URL: process.env.DATABASE_URL!,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
    FRONTEND_URL: process.env.FRONTEND_URL!
  };
}

export const env = validateEnv();
