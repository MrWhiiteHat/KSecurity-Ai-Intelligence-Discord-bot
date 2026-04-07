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

function normalizeToken(value: string | undefined): string {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  return trimmed.toLowerCase().startsWith('bot ')
    ? trimmed.slice(4).trim()
    : trimmed;
}

function firstNonEmpty(values: Array<string | undefined>): string {
  for (const value of values) {
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }

  return '';
}

const parsedPort = Number.parseInt(String(process.env.PORT ?? ''), 10);
const healthPort = Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535
  ? parsedPort
  : 3002;

const resolvedToken = normalizeToken(
  firstNonEmpty([
    process.env.DISCORD_BOT_TOKEN,
    process.env.DISCORD_TOKEN,
    process.env.BOT_TOKEN,
    process.env.TOKEN,
  ])
);

const resolvedApiKey = firstNonEmpty([
  process.env.BOT_API_KEY,
  process.env.API_KEY,
  process.env.BACKEND_API_KEY,
]);

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

if (!process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_TOKEN && process.env.BOT_TOKEN) {
  console.warn('[bot config] Using BOT_TOKEN fallback for bot authentication.');
}

if (!process.env.BOT_API_KEY && process.env.API_KEY) {
  console.warn('[bot config] Using API_KEY fallback for bot backend authentication.');
}

if (!process.env.BOT_API_KEY && !process.env.API_KEY && process.env.BACKEND_API_KEY) {
  console.warn('[bot config] Using BACKEND_API_KEY fallback for bot backend authentication.');
}

if (!config.token) {
  console.warn('[bot config] No Discord token found (checked DISCORD_BOT_TOKEN, DISCORD_TOKEN, BOT_TOKEN, TOKEN). Bot login will be skipped.');
}

if (!config.apiKey) {
  console.warn('[bot config] No backend API key found (checked BOT_API_KEY, API_KEY, BACKEND_API_KEY). Backend moderation calls will fail until configured.');
}
