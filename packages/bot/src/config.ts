import dotenv from 'dotenv';

dotenv.config();

export const config = {
  token: process.env.DISCORD_BOT_TOKEN || '',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  apiKey: process.env.BOT_API_KEY || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
} as const;

if (!config.token) {
  throw new Error('DISCORD_BOT_TOKEN is required');
}

if (!config.apiKey) {
  throw new Error('BOT_API_KEY is required');
}
