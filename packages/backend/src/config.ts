import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  apiKey: process.env.API_KEY || 'change-me-in-production',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (!config.openaiApiKey) {
  console.warn('[config] OPENAI_API_KEY is not set. AI classification will use fallback mode.');
}
