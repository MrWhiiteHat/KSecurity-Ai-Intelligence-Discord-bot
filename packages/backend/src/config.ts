import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_PORT = 3001;
const parsedPort = Number.parseInt(String(process.env.PORT ?? ''), 10);
const resolvedPort = Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535
  ? parsedPort
  : DEFAULT_PORT;

if (process.env.PORT && resolvedPort === DEFAULT_PORT && parsedPort !== DEFAULT_PORT) {
  console.warn(`[config] Invalid PORT value "${process.env.PORT}". Falling back to ${DEFAULT_PORT}.`);
}

export const config = {
  port: resolvedPort,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  apiKey: process.env.API_KEY || 'change-me-in-production',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
} as const;

if (!config.databaseUrl) {
  console.warn('[config] DATABASE_URL is not set. Database-backed endpoints will be unavailable until configured.');
}

if (!config.openaiApiKey) {
  console.warn('[config] OPENAI_API_KEY is not set. AI classification will use fallback mode.');
}
