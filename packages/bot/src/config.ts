import dotenv from 'dotenv';

dotenv.config();

function parseBooleanEnv(value: string | undefined, fallback = false): boolean {
  if (value == null) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

const parsedPort = Number.parseInt(String(process.env.PORT ?? ''), 10);
const healthPort = Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535
  ? parsedPort
  : 3002;

const resolvedToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '';
const resolvedApiKey = process.env.BOT_API_KEY || process.env.API_KEY || '';

export const config = {
  token: resolvedToken,
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3001',
  apiKey: resolvedApiKey,
  clientId: process.env.DISCORD_CLIENT_ID || '',
  healthPort,
  enableMessageContentIntent: parseBooleanEnv(process.env.ENABLE_MESSAGE_CONTENT_INTENT, false),
  enableGuildMembersIntent: parseBooleanEnv(process.env.ENABLE_GUILD_MEMBERS_INTENT, false),
} as const;

if (!process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_TOKEN) {
  console.warn('[bot config] Using DISCORD_TOKEN fallback for bot authentication.');
}

if (!process.env.BOT_API_KEY && process.env.API_KEY) {
  console.warn('[bot config] Using API_KEY fallback for bot backend authentication.');
}

if (!config.token) {
  console.warn('[bot config] DISCORD_BOT_TOKEN or DISCORD_TOKEN is not set. Bot login will be skipped.');
}

if (!config.apiKey) {
  console.warn('[bot config] BOT_API_KEY or API_KEY is not set. Backend moderation calls will fail until configured.');
}
