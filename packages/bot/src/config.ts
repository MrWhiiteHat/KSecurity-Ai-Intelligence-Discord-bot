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

function pickEnv(...keys: string[]): string {
  return firstNonEmpty(keys.map((key) => process.env[key]));
}

type InferredEnvValue = {
  key: string;
  value: string;
};

type ScoredEnvValue = InferredEnvValue & {
  score: number;
};

function isKnownTokenKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return [
    'discord_bot_token',
    'discord_token',
    'bot_token',
    'token',
    'discord_bottoken',
    'discord_auth_token',
    'bot_auth_token',
    'discord_secret',
    'bot_secret',
  ].includes(normalized);
}

function isKnownApiKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return [
    'bot_api_key',
    'api_key',
    'backend_api_key',
    'bot_apikey',
  ].includes(normalized);
}

function looksLikeDiscordToken(value: string): boolean {
  const token = normalizeToken(value);
  const parts = token.split('.');
  return token.length >= 50 && parts.length === 3;
}

function scoreDiscordTokenCandidate(key: string, value: string): number {
  const normalizedKey = key.toLowerCase();
  const normalizedValue = normalizeToken(value);

  if (!normalizedValue) {
    return 0;
  }

  const excludedKeyHints = [
    'github',
    'gitlab',
    'npm',
    'railway',
    'sentry',
    'jwt',
    'bearer',
    'access',
    'refresh',
    'session',
    'cookie',
    'auth',
    'stripe',
  ];

  const hasDiscordTokenShape = looksLikeDiscordToken(normalizedValue);

  // If value strongly matches Discord token format, keep it as candidate even
  // if key includes generic auth-related words.
  if (!hasDiscordTokenShape && excludedKeyHints.some((hint) => normalizedKey.includes(hint))) {
    return 0;
  }

  let score = 0;

  if (hasDiscordTokenShape) {
    score += 120;
  }

  if (normalizedKey.includes('discord') && normalizedKey.includes('token')) {
    score += 100;
  }

  if (normalizedKey.includes('bot') && normalizedKey.includes('token')) {
    score += 70;
  }

  if (normalizedKey.includes('discord') && normalizedKey.includes('secret')) {
    score += 60;
  }

  if (normalizedKey.includes('token')) {
    score += 10;
  }

  return score;
}

function getRelevantEnvKeys(max = 12): string[] {
  const keys = Object.keys(process.env)
    .filter((key) => {
      const normalized = key.toLowerCase();
      return normalized.includes('discord') || normalized.includes('token') || normalized.includes('api');
    })
    .sort((a, b) => a.localeCompare(b));

  return keys.slice(0, max);
}

function inferDiscordTokenFromEnv(): InferredEnvValue | null {
  const candidates: ScoredEnvValue[] = [];

  for (const [rawKey, rawValue] of Object.entries(process.env)) {
    if (!rawValue || isKnownTokenKey(rawKey)) {
      continue;
    }

    const value = normalizeToken(rawValue);
    if (!value) {
      continue;
    }

    const score = scoreDiscordTokenCandidate(rawKey, value);
    if (score > 0) {
      candidates.push({ key: rawKey, value, score });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const second = candidates[1];

  if (second && second.score === best.score) {
    return null;
  }

  return { key: best.key, value: best.value };
}

function inferBackendApiKeyFromEnv(): InferredEnvValue | null {
  const candidates: InferredEnvValue[] = [];

  for (const [rawKey, rawValue] of Object.entries(process.env)) {
    if (!rawValue || isKnownApiKey(rawKey)) {
      continue;
    }

    const key = rawKey.toLowerCase();
    const value = rawValue.trim();
    if (!value) {
      continue;
    }

    const excludedApiKeyPrefixes = [
      'openai',
      'gemini',
      'discord',
      'github',
      'railway',
      'sentry',
      'stripe',
    ];

    const isGenericApiKey = key.includes('api') && key.includes('key');
    const isLikelyBackendBotKey =
      (key.includes('backend') && isGenericApiKey) ||
      (key.includes('bot') && isGenericApiKey) ||
      (key.includes('threat') && isGenericApiKey) ||
      (key.includes('security') && isGenericApiKey);

    const isExcluded = excludedApiKeyPrefixes.some((prefix) => key.includes(prefix));

    if (isLikelyBackendBotKey || (isGenericApiKey && !isExcluded)) {
      candidates.push({ key: rawKey, value });
    }
  }

  return candidates.length === 1 ? candidates[0] : null;
}

const parsedPort = Number.parseInt(String(process.env.PORT ?? ''), 10);
const healthPort = Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535
  ? parsedPort
  : 3002;

const explicitToken = normalizeToken(
  firstNonEmpty([
    pickEnv('DISCORD_BOT_TOKEN', 'discord_bot_token'),
    pickEnv('DISCORD_TOKEN', 'discord_token'),
    pickEnv('BOT_TOKEN', 'bot_token'),
    pickEnv('TOKEN', 'token'),
    pickEnv('DISCORD_BOTTOKEN', 'discord_bottoken'),
    pickEnv('DISCORD_AUTH_TOKEN', 'discord_auth_token'),
    pickEnv('BOT_AUTH_TOKEN', 'bot_auth_token'),
    pickEnv('DISCORD_SECRET', 'discord_secret'),
    pickEnv('BOT_SECRET', 'bot_secret'),
  ])
);

const inferredToken = explicitToken ? null : inferDiscordTokenFromEnv();
const resolvedToken = explicitToken || inferredToken?.value || '';

const explicitApiKey = firstNonEmpty([
  pickEnv('BOT_API_KEY', 'bot_api_key'),
  pickEnv('API_KEY', 'api_key'),
  pickEnv('BACKEND_API_KEY', 'backend_api_key'),
  pickEnv('BOT_APIKEY', 'bot_apikey'),
]);

const inferredApiKey = explicitApiKey ? null : inferBackendApiKeyFromEnv();
const resolvedApiKey = explicitApiKey || inferredApiKey?.value || '';

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

if (!process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_TOKEN && process.env.discord_bot_token) {
  console.warn('[bot config] Using lowercase discord_bot_token fallback for bot authentication.');
}

if (!process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_TOKEN && process.env.BOT_TOKEN) {
  console.warn('[bot config] Using BOT_TOKEN fallback for bot authentication.');
}

if (!process.env.DISCORD_BOT_TOKEN && !process.env.DISCORD_TOKEN && !process.env.BOT_TOKEN && process.env.DISCORD_BOTTOKEN) {
  console.warn('[bot config] Using DISCORD_BOTTOKEN fallback for bot authentication.');
}

if (!explicitToken && inferredToken) {
  console.warn(`[bot config] Inferred Discord token from ${inferredToken.key}. Consider renaming to DISCORD_BOT_TOKEN.`);
}

if (!process.env.BOT_API_KEY && process.env.API_KEY) {
  console.warn('[bot config] Using API_KEY fallback for bot backend authentication.');
}

if (!process.env.BOT_API_KEY && !process.env.API_KEY && process.env.bot_api_key) {
  console.warn('[bot config] Using lowercase bot_api_key fallback for bot backend authentication.');
}

if (!process.env.BOT_API_KEY && !process.env.API_KEY && process.env.BACKEND_API_KEY) {
  console.warn('[bot config] Using BACKEND_API_KEY fallback for bot backend authentication.');
}

if (!explicitApiKey && inferredApiKey) {
  console.warn(`[bot config] Inferred backend API key from ${inferredApiKey.key}. Consider renaming to BOT_API_KEY.`);
}

if (!config.token) {
  console.warn('[bot config] No Discord token found (checked known names and token-like env keys). Bot login will be skipped.');
  const hintKeys = getRelevantEnvKeys();
  if (hintKeys.length > 0) {
    console.warn(`[bot config] Relevant env keys seen: ${hintKeys.join(', ')}`);
  }
}

if (!config.apiKey) {
  console.warn('[bot config] No backend API key found (checked known names and backend-like API key env keys). Backend moderation calls will fail until configured.');
  const hintKeys = getRelevantEnvKeys();
  if (hintKeys.length > 0) {
    console.warn(`[bot config] Relevant env keys seen: ${hintKeys.join(', ')}`);
  }
}
