# Community Threat Intelligence Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready MVP Discord threat detection platform with backend API, Discord bot, detection engine, and admin dashboard.

**Architecture:** Monorepo with three independent packages (backend, bot, dashboard) sharing a PostgreSQL database via Prisma ORM. Backend handles threat detection and REST API, bot monitors Discord messages in real-time, dashboard provides admin UI.

**Tech Stack:** Node.js, Express, TypeScript, Prisma, PostgreSQL, discord.js, OpenAI API, Next.js, Tailwind CSS, Docker

---

### Task 1: Project Scaffolding & Root Configuration

**Files:**
- Create: `package.json` (root workspace)
- Create: `.env.example`
- Create: `docker-compose.yml`
- Create: `README.md`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "discord-threat-detector",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev:backend": "npm run dev --workspace=packages/backend",
    "dev:bot": "npm run dev --workspace=packages/bot",
    "dev:dashboard": "npm run dev --workspace=packages/dashboard",
    "build": "npm run build --workspaces",
    "start:backend": "npm run start --workspace=packages/backend",
    "start:bot": "npm run start --workspace=packages/bot",
    "start:dashboard": "npm run start --workspace=packages/dashboard"
  }
}
```

- [ ] **Step 2: Create .env.example**

```env
# Backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/threat_detector?schema=public"
PORT=3001
JWT_SECRET=your-jwt-secret-change-in-production
API_KEY=your-api-key-change-in-production
OPENAI_API_KEY=sk-your-openai-key

# Bot
DISCORD_BOT_TOKEN=your-discord-bot-token
BACKEND_URL=http://localhost:3001
BOT_API_KEY=your-api-key-change-in-production

# Dashboard
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
DASHBOARD_JWT_SECRET=your-jwt-secret-change-in-production
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: threat_detector
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./packages/backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/threat_detector?schema=public
      PORT: 3001
      JWT_SECRET: dev-jwt-secret
      API_KEY: dev-api-key
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    depends_on:
      - postgres

  bot:
    build: ./packages/bot
    environment:
      DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN}
      BACKEND_URL: http://backend:3001
      BOT_API_KEY: dev-api-key
    depends_on:
      - backend

  dashboard:
    build: ./packages/dashboard
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_BACKEND_URL: http://backend:3001
    depends_on:
      - backend

volumes:
  postgres_data:
```

- [ ] **Step 4: Create README.md**

```markdown
# 🛡️ Community Threat Intelligence Platform

AI-powered security platform that detects scams, phishing, malicious links, and suspicious behavior in Discord communities.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start PostgreSQL
docker-compose up -d postgres

# 4. Run database migrations
npm run db:migrate --workspace=packages/backend

# 5. Start all services
npm run dev:backend
npm run dev:bot
npm run dev:dashboard
```

## Services

- **Backend API**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3000
- **Discord Bot**: Runs as background process

## Tech Stack

- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL
- Bot: discord.js + TypeScript
- Dashboard: Next.js + Tailwind CSS
- AI: OpenAI API
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: scaffold monorepo with root config"
```

---

### Task 2: Database Schema & Prisma Setup

**Files:**
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/prisma/schema.prisma`
- Create: `packages/backend/src/db/prisma.ts`

- [ ] **Step 1: Create backend package.json**

```json
{
  "name": "@threat-detector/backend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.10.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "openai": "^4.28.0",
    "zod": "^3.22.4",
    "dotenv": "^16.4.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.11.5",
    "prisma": "^5.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Create backend tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Server {
  id                 String   @id @default(uuid())
  discordId          String   @unique
  name               String
  moderationRoleId   String?
  createdAt          DateTime @default(now())
  users              User[]
  messages           Message[]
  config             Config?
}

model User {
  id          String   @id @default(uuid())
  discordId   String
  username    String
  serverId    String
  trustScore  Int      @default(50)
  createdAt   DateTime @default(now())
  messages    Message[]
  server      Server   @relation(fields: [serverId], references: [id])

  @@unique([discordId, serverId])
  @@index([serverId])
}

model Message {
  id         String   @id @default(uuid())
  serverId   String
  userId     String
  content    String
  riskScore  Int      @default(0)
  action     String   @default("allow")
  createdAt  DateTime @default(now())
  server     Server   @relation(fields: [serverId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
  threats    Threat[]

  @@index([serverId, createdAt])
  @@index([userId])
}

model Threat {
  id         String   @id @default(uuid())
  messageId  String
  type       String
  severity   String
  reasoning  String
  detectedAt DateTime @default(now())
  message    Message  @relation(fields: [messageId], references: [id])

  @@index([type, detectedAt])
}

model Config {
  serverId         String  @id
  aiWeight         Float   @default(0.5)
  urlWeight        Float   @default(0.3)
  behaviorWeight   Float   @default(0.2)
  deleteThreshold  Int     @default(80)
  warnThreshold    Int     @default(50)
  server           Server  @relation(fields: [serverId], references: [id])
}
```

- [ ] **Step 4: Create Prisma client singleton**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 5: Commit**

```bash
git add packages/backend/
git commit -m "feat: add database schema and prisma setup"
```

---

### Task 3: Backend Configuration & Middleware

**Files:**
- Create: `packages/backend/src/config.ts`
- Create: `packages/backend/src/middleware/auth.ts`
- Create: `packages/backend/src/middleware/validation.ts`
- Create: `packages/backend/src/index.ts`

- [ ] **Step 1: Create config.ts**

```typescript
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
  throw new Error('OPENAI_API_KEY is required');
}
```

- [ ] **Step 2: Create auth middleware**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || apiKey !== config.apiKey) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }

  next();
}

export function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

- [ ] **Step 3: Create validation middleware**

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors?.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
  };
}
```

- [ ] **Step 4: Create main Express app (index.ts)**

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { prisma } from './db/prisma';
import { analyzeRouter } from './routes/analyze';
import { logsRouter } from './routes/logs';
import { statsRouter } from './routes/stats';
import { configRouter } from './routes/config';
import { authRouter } from './routes/auth';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRouter);
app.use('/analyze', analyzeRouter);
app.use('/logs', logsRouter);
app.use('/stats', statsRouter);
app.use('/config', configRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    app.listen(config.port, () => {
      console.log(`Backend API running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
```

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/config.ts packages/backend/src/middleware/ packages/backend/src/index.ts
git commit -m "feat: add backend config, middleware, and Express app"
```

---

### Task 4: Detection Engine - URL Analyzer

**Files:**
- Create: `packages/backend/src/detection/url-analyzer.ts`

- [ ] **Step 1: Create URL analyzer**

```typescript
// Known suspicious TLDs commonly used in phishing
const SUSPICIOUS_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'club', 'work', 'buzz',
  'link', 'info', 'biz', 'icu', 'cam', 'date', 'loan', 'win',
]);

// URL shorteners (often used to hide malicious links)
const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd',
  'short.link', 'cutt.ly', 'rebrand.ly', 'buff.ly',
]);

// Typosquatting patterns for common domains
const TYPOSQUAT_PATTERNS = [
  { target: 'discord', patterns: ['disc0rd', 'd1scord', 'discorcl', 'discrod', 'discordd', 'dlscord'] },
  { target: 'steam', patterns: ['stearn', 'stearn', 'stern', 'stean', 'stema'] },
  { target: 'google', patterns: ['gooqle', 'goog1e', 'googel', 'gogle'] },
  { target: 'microsoft', patterns: ['micros0ft', 'rnicrosoft', 'microsofft'] },
  { target: 'amazon', patterns: ['arnazon', 'arnazon', 'amazcn', 'amaz0n'] },
  { target: 'apple', patterns: ['app1e', 'appl3', 'aplle', 'appie'] },
  { target: 'paypal', patterns: ['paypa1', 'paypai', 'paypall', 'paypal'] },
  { target: 'netflix', patterns: ['netf1ix', 'netfliix', 'netflx'] },
  { target: 'spotify', patterns: ['spot1fy', 'spotifv', 'spotifty', 'spotiify'] },
];

// Phishing keyword patterns in URLs
const PHISHING_KEYWORDS = [
  'free-nitro', 'free-nitro', 'claim-nitro', 'nitro-gift', 'nitro-giveaway',
  'verify-account', 'account-suspended', 'confirm-identity', 'update-payment',
  'security-check', 'login-verify', 'account-locked', 'unusual-activity',
];

export interface UrlAnalysisResult {
  riskScore: number;
  urls: string[];
  reasons: string[];
}

/**
 * Extract URLs from text content
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map(url => url.replace(/[.,;:!?)>]*$/, ''));
}

/**
 * Analyze URLs for phishing patterns
 */
export function analyzeUrls(text: string): UrlAnalysisResult {
  const urls = extractUrls(text);
  if (urls.length === 0) {
    return { riskScore: 0, urls: [], reasons: [] };
  }

  let maxRisk = 0;
  const reasons: string[] = [];

  for (const url of urls) {
    const urlRisk = analyzeSingleUrl(url, reasons);
    maxRisk = Math.max(maxRisk, urlRisk);
  }

  return {
    riskScore: Math.min(maxRisk, 100),
    urls,
    reasons,
  };
}

function analyzeSingleUrl(url: string, reasons: string[]): number {
  let risk = 0;
  let hostname: string;

  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return 0;
  }

  // Check URL shorteners
  for (const shortener of URL_SHORTENERS) {
    if (hostname === shortener || hostname.endsWith(`.${shortener}`)) {
      risk += 30;
      reasons.push(`URL shortener detected: ${hostname}`);
      break;
    }
  }

  // Check suspicious TLDs
  const tld = hostname.split('.').pop() || '';
  if (SUSPICIOUS_TLDS.has(tld)) {
    risk += 20;
    reasons.push(`Suspicious TLD: .${tld}`);
  }

  // Check typosquatting
  for (const { target, patterns } of TYPOSQUAT_PATTERNS) {
    for (const pattern of patterns) {
      if (hostname.includes(pattern)) {
        risk += 60;
        reasons.push(`Possible typosquatting of ${target}: ${hostname}`);
        break;
      }
    }
  }

  // Check phishing keywords in URL path
  const urlLower = url.toLowerCase();
  for (const keyword of PHISHING_KEYWORDS) {
    if (urlLower.includes(keyword)) {
      risk += 40;
      reasons.push(`Phishing keyword in URL: ${keyword}`);
      break;
    }
  }

  // Check for IP address instead of domain (common in phishing)
  const ipRegex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
  if (ipRegex.test(hostname)) {
    risk += 30;
    reasons.push('IP address used instead of domain name');
  }

  // Check for excessive subdomains (e.g., a.b.c.d.example.com)
  const subdomainCount = hostname.split('.').length - 2;
  if (subdomainCount > 3) {
    risk += 15;
    reasons.push(`Excessive subdomains (${subdomainCount})`);
  }

  return Math.min(risk, 100);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/detection/url-analyzer.ts
git commit -m "feat: add URL analysis engine with phishing detection"
```

---

### Task 5: Detection Engine - AI Classifier

**Files:**
- Create: `packages/backend/src/detection/ai-classifier.ts`

- [ ] **Step 1: Create AI classifier**

```typescript
import OpenAI from 'openai';
import { config } from '../config';

export interface AiClassificationResult {
  category: 'scam' | 'suspicious' | 'safe';
  confidence: number;
  reasoning: string;
}

const openai = new OpenAI({ apiKey: config.openaiApiKey });

const SYSTEM_PROMPT = `You are a cybersecurity threat detection AI. Analyze Discord messages and classify them into one of three categories:

- "scam": Clear scam, phishing, fraud attempt, malicious link sharing, impersonation
- "suspicious": Potentially suspicious but not definitively malicious, unusual behavior
- "safe": Normal conversation, no threat indicators

Respond with ONLY a JSON object in this exact format:
{"category": "scam"|"suspicious"|"safe", "confidence": 0.0-1.0, "reasoning": "brief explanation"}

Consider these threat indicators:
- Requests for personal information, passwords, or payment details
- Fake giveaway or free offer claims
- Urgency or pressure tactics
- Impersonation of staff or trusted entities
- Links to suspicious websites
- Requests to download files or run commands
- Crypto/NFT scam patterns
- Social engineering attempts`;

export async function classifyMessage(content: string): Promise<AiClassificationResult> {
  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI classification timeout')), 3000);
    });

    const result = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze this Discord message: "${content}"` },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
      timeout,
    ]);

    const responseText = result.choices[0].message.content || '{}';
    const parsed = JSON.parse(responseText);

    return {
      category: parsed.category || 'safe',
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    console.error('AI classification failed:', error);
    // Fallback: return neutral classification
    return {
      category: 'suspicious',
      confidence: 0.3,
      reasoning: 'AI classification failed, falling back to rule-based analysis',
    };
  }
}

/**
 * Convert AI category to numeric risk score
 */
export function categoryToRiskScore(category: string, confidence: number): number {
  const baseScores: Record<string, number> = {
    scam: 85,
    suspicious: 55,
    safe: 10,
  };

  const base = baseScores[category] || 30;
  // Scale by confidence
  return Math.round(base * confidence);
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/detection/ai-classifier.ts
git commit -m "feat: add AI message classifier with OpenAI integration"
```

---

### Task 6: Detection Engine - Behavior Tracker

**Files:**
- Create: `packages/backend/src/detection/behavior-tracker.ts`

- [ ] **Step 1: Create behavior tracker**

```typescript
interface UserActivity {
  messageCount: number;
  lastMessageTime: number;
  messageContents: string[];
  firstSeen: number;
  windowStart: number;
}

// In-memory behavior tracker (per server)
const activityWindows = new Map<string, Map<string, UserActivity>>();

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_MESSAGES_PER_WINDOW = 10;
const SIMILARITY_THRESHOLD = 0.8;

/**
 * Track user message activity and detect behavioral anomalies
 */
export function trackBehavior(
  serverId: string,
  userId: string,
  content: string,
  accountAgeDays: number
): { riskScore: number; reasons: string[] } {
  const serverMap = activityWindows.get(serverId) || new Map();
  activityWindows.set(serverId, serverMap);

  const now = Date.now();
  let activity = serverMap.get(userId);

  // Initialize or reset window
  if (!activity || now - activity.windowStart > WINDOW_MS) {
    activity = {
      messageCount: 0,
      lastMessageTime: 0,
      messageContents: [],
      firstSeen: now,
      windowStart: now,
    };
    serverMap.set(userId, activity);
  }

  activity.messageCount++;
  activity.lastMessageTime = now;
  activity.messageContents.push(content);

  // Keep only last 10 messages for similarity check
  if (activity.messageContents.length > 10) {
    activity.messageContents = activity.messageContents.slice(-10);
  }

  const reasons: string[] = [];
  let riskScore = 0;

  // Check message frequency (spam detection)
  if (activity.messageCount > MAX_MESSAGES_PER_WINDOW) {
    riskScore += 40;
    reasons.push(`High message frequency: ${activity.messageCount} messages in 5min window`);
  } else if (activity.messageCount > 6) {
    riskScore += 20;
    reasons.push(`Elevated message frequency: ${activity.messageCount} messages in 5min window`);
  }

  // Check for repeated content (copy-paste spam)
  const repeatedCount = countSimilarMessages(activity.messageContents);
  if (repeatedCount > 2) {
    riskScore += 35;
    reasons.push(`Repeated similar content detected (${repeatedCount} times)`);
  }

  // Check for new account (less than 7 days old)
  if (accountAgeDays < 1) {
    riskScore += 30;
    reasons.push('Brand new account (less than 24 hours old)');
  } else if (accountAgeDays < 7) {
    riskScore += 15;
    reasons.push(`New account (${Math.floor(accountAgeDays)} days old)`);
  }

  // Check rapid burst (messages within 1 second of each other)
  if (activity.messageCount > 3 && activity.lastMessageTime - activity.windowStart < 5000) {
    riskScore += 25;
    reasons.push('Message burst detected (3+ messages in 5 seconds)');
  }

  return {
    riskScore: Math.min(riskScore, 100),
    reasons,
  };
}

/**
 * Simple string similarity check (Jaccard-like)
 */
function stringSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 1 : intersection.size / union.size;
}

function countSimilarMessages(messages: string[]): number {
  let maxSimilar = 0;

  for (let i = 0; i < messages.length; i++) {
    let similar = 1;
    for (let j = i + 1; j < messages.length; j++) {
      if (stringSimilarity(messages[i], messages[j]) > SIMILARITY_THRESHOLD) {
        similar++;
      }
    }
    maxSimilar = Math.max(maxSimilar, similar);
  }

  return maxSimilar;
}

/**
 * Clean up old activity windows (call periodically)
 */
export function cleanupOldActivity(): void {
  const now = Date.now();
  for (const [serverId, users] of activityWindows.entries()) {
    for (const [userId, activity] of users.entries()) {
      if (now - activity.windowStart > WINDOW_MS * 2) {
        users.delete(userId);
      }
    }
    if (users.size === 0) {
      activityWindows.delete(serverId);
    }
  }
}

// Clean up every 10 minutes
setInterval(cleanupOldActivity, 10 * 60 * 1000);
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/src/detection/behavior-tracker.ts
git commit -m "feat: add behavior tracking with spam and anomaly detection"
```

---

### Task 7: Detection Engine - Risk Scorer & Decision Engine

**Files:**
- Create: `packages/backend/src/detection/risk-scorer.ts`
- Create: `packages/backend/src/detection/decision-engine.ts`

- [ ] **Step 1: Create risk scorer**

```typescript
import { UrlAnalysisResult } from './url-analyzer';
import { AiClassificationResult, categoryToRiskScore } from './ai-classifier';

export interface RiskScoreResult {
  finalScore: number;
  aiScore: number;
  urlScore: number;
  behaviorScore: number;
  reasons: string[];
}

export interface ServerWeights {
  aiWeight: number;
  urlWeight: number;
  behaviorWeight: number;
}

const DEFAULT_WEIGHTS: ServerWeights = {
  aiWeight: 0.5,
  urlWeight: 0.3,
  behaviorWeight: 0.2,
};

/**
 * Calculate weighted risk score from all detection signals
 */
export function calculateRiskScore(
  aiResult: AiClassificationResult,
  urlResult: UrlAnalysisResult,
  behaviorResult: { riskScore: number; reasons: string[] },
  weights: ServerWeights = DEFAULT_WEIGHTS
): RiskScoreResult {
  const aiScore = categoryToRiskScore(aiResult.category, aiResult.confidence);
  const urlScore = urlResult.riskScore;
  const behaviorScore = behaviorResult.riskScore;

  const finalScore = Math.round(
    aiScore * weights.aiWeight +
    urlScore * weights.urlWeight +
    behaviorScore * weights.behaviorWeight
  );

  const reasons = [
    ...aiResult.reasoning ? [`AI: ${aiResult.reasoning}`] : [],
    ...urlResult.reasons.map(r => `URL: ${r}`),
    ...behaviorResult.reasons.map(r => `Behavior: ${r}`),
  ];

  return {
    finalScore: Math.min(finalScore, 100),
    aiScore,
    urlScore,
    behaviorScore,
    reasons,
  };
}
```

- [ ] **Step 2: Create decision engine**

```typescript
export type DecisionAction = 'delete' | 'warn' | 'allow';

export interface DecisionResult {
  action: DecisionAction;
  riskScore: number;
  reasons: string[];
  shouldNotifyMods: boolean;
}

export interface ThresholdConfig {
  deleteThreshold: number;
  warnThreshold: number;
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  deleteThreshold: 80,
  warnThreshold: 50,
};

/**
 * Determine action based on risk score and configured thresholds
 */
export function makeDecision(
  riskScore: number,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): DecisionResult {
  if (riskScore > thresholds.deleteThreshold) {
    return {
      action: 'delete',
      riskScore,
      reasons: [`Risk score ${riskScore} exceeds delete threshold (${thresholds.deleteThreshold})`],
      shouldNotifyMods: true,
    };
  }

  if (riskScore > thresholds.warnThreshold) {
    return {
      action: 'warn',
      riskScore,
      reasons: [`Risk score ${riskScore} exceeds warn threshold (${thresholds.warnThreshold})`],
      shouldNotifyMods: false,
    };
  }

  return {
    action: 'allow',
    riskScore,
    reasons: [`Risk score ${riskScore} is within acceptable range`],
    shouldNotifyMods: false,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/detection/risk-scorer.ts packages/backend/src/detection/decision-engine.ts
git commit -m "feat: add risk scoring and decision engine"
```

---

### Task 8: Backend API Routes

**Files:**
- Create: `packages/backend/src/routes/auth.ts`
- Create: `packages/backend/src/routes/analyze.ts`
- Create: `packages/backend/src/routes/logs.ts`
- Create: `packages/backend/src/routes/stats.ts`
- Create: `packages/backend/src/routes/config.ts`

- [ ] **Step 1: Create auth route**

```typescript
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { validate } from '../middleware/validation';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), (req, res) => {
  const { username, password } = req.body;

  // MVP: Simple hardcoded auth (replace with proper auth in production)
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin';

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: 'admin', role: 'admin' },
    config.jwtSecret,
    { expiresIn: '24h' }
  );

  res.json({ token, expiresIn: '24h' });
});
```

- [ ] **Step 2: Create analyze route**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { authenticateApiKey } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { prisma } from '../db/prisma';
import { analyzeUrls } from '../detection/url-analyzer';
import { classifyMessage } from '../detection/ai-classifier';
import { trackBehavior } from '../detection/behavior-tracker';
import { calculateRiskScore } from '../detection/risk-scorer';
import { makeDecision } from '../detection/decision-engine';

const analyzeSchema = z.object({
  serverId: z.string(),
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  accountAgeDays: z.number().optional().default(30),
});

export const analyzeRouter = Router();

analyzeRouter.post('/message', authenticateApiKey, validate(analyzeSchema), async (req, res) => {
  try {
    const { serverId, userId, username, content, accountAgeDays } = req.body;

    // Run all detection engines in parallel
    const [urlResult, aiResult, behaviorResult] = await Promise.all([
      analyzeUrls(content),
      classifyMessage(content),
      Promise.resolve(trackBehavior(serverId, userId, content, accountAgeDays)),
    ]);

    // Get server config for weights
    const serverConfig = await prisma.config.findUnique({
      where: { serverId },
    });

    const weights = serverConfig
      ? {
          aiWeight: serverConfig.aiWeight,
          urlWeight: serverConfig.urlWeight,
          behaviorWeight: serverConfig.behaviorWeight,
        }
      : undefined;

    const thresholds = serverConfig
      ? {
          deleteThreshold: serverConfig.deleteThreshold,
          warnThreshold: serverConfig.warnThreshold,
        }
      : undefined;

    // Calculate risk score
    const riskResult = calculateRiskScore(aiResult, urlResult, behaviorResult, weights);

    // Make decision
    const decision = makeDecision(riskResult.finalScore, thresholds);

    // Find or create user
    const user = await prisma.user.upsert({
      where: { discordId_serverId: { discordId: userId, serverId } },
      update: { username },
      create: { discordId: userId, username, serverId },
    });

    // Store message log
    const message = await prisma.message.create({
      data: {
        serverId,
        userId: user.id,
        content: content.slice(0, 2000),
        riskScore: riskResult.finalScore,
        action: decision.action,
      },
    });

    // Store threats if detected
    if (decision.action !== 'allow') {
      await prisma.threat.create({
        data: {
          messageId: message.id,
          type: aiResult.category === 'scam' ? 'scam' : 'suspicious',
          severity: decision.action === 'delete' ? 'high' : 'medium',
          reasoning: riskResult.reasons.join('; '),
        },
      });
    }

    res.json({
      decision: decision.action,
      riskScore: riskResult.finalScore,
      breakdown: {
        ai: riskResult.aiScore,
        url: riskResult.urlScore,
        behavior: riskResult.behaviorScore,
      },
      reasons: riskResult.reasons,
      urls: urlResult.urls,
    });
  } catch (error) {
    console.error('Analyze message error:', error);
    res.status(500).json({ error: 'Failed to analyze message' });
  }
});
```

- [ ] **Step 3: Create logs route**

```typescript
import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { prisma } from '../db/prisma';

export const logsRouter = Router();

logsRouter.get('/', authenticateJWT, async (req, res) => {
  try {
    const { serverId, action, page = '1', limit = '50' } = req.query;

    const where: any = {};
    if (serverId) where.serverId = serverId as string;
    if (action && action !== 'all') where.action = action as string;

    const messages = await prisma.message.findMany({
      where,
      include: {
        user: true,
        threats: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    });

    const total = await prisma.message.count({ where });

    res.json({
      messages,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Logs fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});
```

- [ ] **Step 4: Create stats route**

```typescript
import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { prisma } from '../db/prisma';

export const statsRouter = Router();

statsRouter.get('/', authenticateJWT, async (req, res) => {
  try {
    const { serverId } = req.query;
    const where = serverId ? { serverId: serverId as string } : {};

    const [totalMessages, totalThreats, actionBreakdown, threatTypes] = await Promise.all([
      prisma.message.count({ where }),
      prisma.threat.count({ where: { message: where } }),
      prisma.message.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      prisma.threat.groupBy({
        by: ['type'],
        where: { message: where },
        _count: true,
      }),
    ]);

    // Last 7 days trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyTrend = await prisma.message.groupBy({
      by: ['createdAt'],
      where: {
        ...where,
        createdAt: { gte: sevenDaysAgo },
      },
      _count: true,
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      totalMessages,
      totalThreats,
      actionBreakdown: actionBreakdown.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>),
      threatTypes: threatTypes.map(t => ({ type: t.type, count: t._count })),
      dailyTrend,
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
```

- [ ] **Step 5: Create config route**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { prisma } from '../db/prisma';

const configSchema = z.object({
  serverId: z.string(),
  aiWeight: z.number().min(0).max(1).optional(),
  urlWeight: z.number().min(0).max(1).optional(),
  behaviorWeight: z.number().min(0).max(1).optional(),
  deleteThreshold: z.number().min(0).max(100).optional(),
  warnThreshold: z.number().min(0).max(100).optional(),
  moderationRoleId: z.string().nullable().optional(),
});

export const configRouter = Router();

configRouter.post('/', authenticateJWT, validate(configSchema), async (req, res) => {
  try {
    const { serverId, ...updates } = req.body;

    // Upsert server
    await prisma.server.upsert({
      where: { discordId: serverId },
      update: {},
      create: { discordId: serverId, name: `Server ${serverId}` },
    });

    // Upsert config
    const config = await prisma.config.upsert({
      where: { serverId },
      update: updates,
      create: {
        serverId,
        aiWeight: updates.aiWeight ?? 0.5,
        urlWeight: updates.urlWeight ?? 0.3,
        behaviorWeight: updates.behaviorWeight ?? 0.2,
        deleteThreshold: updates.deleteThreshold ?? 80,
        warnThreshold: updates.warnThreshold ?? 50,
      },
    });

    // Update moderation role if provided
    if ('moderationRoleId' in updates) {
      await prisma.server.update({
        where: { discordId: serverId },
        data: { moderationRoleId: updates.moderationRoleId },
      });
    }

    res.json({ success: true, config });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

configRouter.get('/:serverId', authenticateJWT, async (req, res) => {
  try {
    const config = await prisma.config.findUnique({
      where: { serverId: req.params.serverId },
      include: { server: true },
    });

    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});
```

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/routes/
git commit -m "feat: add all backend API routes (auth, analyze, logs, stats, config)"
```

---

### Task 9: Backend Dockerfile

**Files:**
- Create: `packages/backend/Dockerfile`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Commit**

```bash
git add packages/backend/Dockerfile
git commit -m "chore: add backend Dockerfile"
```

---

### Task 10: Discord Bot - Setup & Configuration

**Files:**
- Create: `packages/bot/package.json`
- Create: `packages/bot/tsconfig.json`
- Create: `packages/bot/src/config.ts`
- Create: `packages/bot/src/index.ts`

- [ ] **Step 1: Create bot package.json**

```json
{
  "name": "@threat-detector/bot",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "deploy-commands": "tsx src/commands/deploy.ts"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "axios": "^1.6.5",
    "dotenv": "^16.4.1"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Create bot tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create bot config**

```typescript
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
```

- [ ] **Step 4: Create bot entry point**

```typescript
import { Client, GatewayIntentBits, Collection, SlashCommandBuilder } from 'discord.js';
import { config } from './config';
import { setupCommands } from './commands/setup';
import { configCommands } from './commands/config';
import { handleMessage } from './events/message';
import { handleReady } from './events/ready';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// Register commands
setupCommands(client);
configCommands(client);

// Event handlers
client.on('ready', () => handleReady(client));
client.on('messageCreate', (message) => handleMessage(message, client));
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);
    await interaction.reply({
      content: 'There was an error executing this command!',
      ephemeral: true,
    });
  }
});

client.login(config.token);
```

- [ ] **Step 5: Extend Discord.js Client types**

Create `packages/bot/src/types.d.ts`:

```typescript
import { Collection, Client } from 'discord.js';
import { SlashCommand } from './commands/types';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, SlashCommand>;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/bot/
git commit -m "feat: scaffold Discord bot with config and event handlers"
```

---

### Task 11: Discord Bot - Commands

**Files:**
- Create: `packages/bot/src/commands/types.ts`
- Create: `packages/bot/src/commands/setup.ts`
- Create: `packages/bot/src/commands/config.ts`
- Create: `packages/bot/src/commands/deploy.ts`

- [ ] **Step 1: Create command types**

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export interface SlashCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
```

- [ ] **Step 2: Create setup command**

```typescript
import { Client, ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { SlashCommand } from './types';
import { apiClient } from '../services/api';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Initialize threat detection for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const guild = interaction.guild;
      if (!guild) {
        return interaction.editReply('❌ This command can only be used in a server.');
      }

      // Register server in backend
      await apiClient.post('/config', {
        serverId: guild.id,
      });

      await interaction.editReply(
        `✅ **Threat detection initialized for ${guild.name}!**\n\n` +
        `I will now monitor messages for scams, phishing, and suspicious behavior.\n\n` +
        `Use \`/config\` to customize detection settings.`
      );
    } catch (error) {
      console.error('Setup error:', error);
      await interaction.editReply('❌ Failed to initialize threat detection. Please try again.');
    }
  },
};

export function setupCommands(client: Client) {
  client.commands.set(command.data.name, command);
}
```

- [ ] **Step 3: Create config command**

```typescript
import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { SlashCommand } from './types';
import { apiClient } from '../services/api';

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure threat detection settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('setting')
        .setDescription('The setting to change')
        .setRequired(true)
        .addChoices(
          { name: 'Delete Threshold (default: 80)', value: 'deleteThreshold' },
          { name: 'Warn Threshold (default: 50)', value: 'warnThreshold' },
          { name: 'AI Weight (default: 0.5)', value: 'aiWeight' },
          { name: 'URL Weight (default: 0.3)', value: 'urlWeight' },
          { name: 'Behavior Weight (default: 0.2)', value: 'behaviorWeight' },
          { name: 'Moderation Role', value: 'moderationRole' }
        )
    )
    .addStringOption(option =>
      option.setName('value')
        .setDescription('The new value')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const setting = interaction.options.getString('setting', true);
    const value = interaction.options.getString('value', true);
    const guildId = interaction.guild?.id;

    if (!guildId) {
      return interaction.editReply('❌ This command can only be used in a server.');
    }

    try {
      let parsedValue: string | number | null = value;

      if (setting === 'moderationRole') {
        // Extract role ID from mention
        const roleId = value.match(/\d+/)?.[0] || value;
        parsedValue = roleId;
      } else {
        parsedValue = parseFloat(value);
        if (isNaN(parsedValue)) {
          return interaction.editReply('❌ Invalid value. Please provide a number.');
        }
      }

      const body: any = { serverId: guildId };
      body[setting] = parsedValue;

      await apiClient.post('/config', body);

      await interaction.editReply(
        `✅ **Setting updated!**\n\`${setting}\` → \`${parsedValue}\``
      );
    } catch (error) {
      console.error('Config error:', error);
      await interaction.editReply('❌ Failed to update configuration.');
    }
  },
};

export function configCommands(client: any) {
  client.commands.set(command.data.name, command);
}
```

- [ ] **Step 4: Create deploy commands script**

```typescript
import { REST, Routes } from 'discord.js';
import { config } from '../config';

const commands = [
  {
    name: 'setup',
    description: 'Initialize threat detection for this server',
  },
  {
    name: 'config',
    description: 'Configure threat detection settings',
    options: [
      {
        name: 'setting',
        description: 'The setting to change',
        type: 3,
        required: true,
        choices: [
          { name: 'Delete Threshold', value: 'deleteThreshold' },
          { name: 'Warn Threshold', value: 'warnThreshold' },
          { name: 'AI Weight', value: 'aiWeight' },
          { name: 'URL Weight', value: 'urlWeight' },
          { name: 'Behavior Weight', value: 'behaviorWeight' },
          { name: 'Moderation Role', value: 'moderationRole' },
        ],
      },
      {
        name: 'value',
        description: 'The new value',
        type: 3,
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
})();
```

- [ ] **Step 5: Commit**

```bash
git add packages/bot/src/commands/
git commit -m "feat: add Discord bot slash commands (setup, config)"
```

---

### Task 12: Discord Bot - Event Handlers & API Service

**Files:**
- Create: `packages/bot/src/services/api.ts`
- Create: `packages/bot/src/events/message.ts`
- Create: `packages/bot/src/events/ready.ts`

- [ ] **Step 1: Create API client service**

```typescript
import axios from 'axios';
import { config } from '../config';

export const apiClient = axios.create({
  baseURL: config.backendUrl,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
  },
  timeout: 5000,
});

export interface AnalyzeResponse {
  decision: 'delete' | 'warn' | 'allow';
  riskScore: number;
  breakdown: {
    ai: number;
    url: number;
    behavior: number;
  };
  reasons: string[];
  urls: string[];
}

export async function analyzeMessage(params: {
  serverId: string;
  userId: string;
  username: string;
  content: string;
  accountAgeDays: number;
}): Promise<AnalyzeResponse> {
  const response = await apiClient.post('/analyze/message', params);
  return response.data;
}
```

- [ ] **Step 2: Create message handler**

```typescript
import { Message, Client } from 'discord.js';
import { analyzeMessage } from '../services/api';

export async function handleMessage(message: Message, client: Client) {
  // Ignore bot messages
  if (message.author.bot) return;

  // Ignore DMs
  if (!message.guild) return;

  // Ignore messages from servers that haven't run /setup
  // (We'll let the backend handle this gracefully)

  try {
    // Calculate account age
    const accountAgeMs = Date.now() - message.author.createdTimestamp;
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

    // Send to backend for analysis
    const result = await analyzeMessage({
      serverId: message.guild.id,
      userId: message.author.id,
      username: message.author.username,
      content: message.content,
      accountAgeDays: Math.floor(accountAgeDays),
    });

    // Execute decision
    switch (result.decision) {
      case 'delete':
        await handleDeleteAction(message, result);
        break;
      case 'warn':
        await handleWarnAction(message, result);
        break;
      case 'allow':
        // Log only, no action needed
        break;
    }
  } catch (error: any) {
    // Log error but don't disrupt the conversation
    if (error.response?.status === 401) {
      console.error('Bot API key rejected by backend');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Backend service unavailable');
    } else {
      console.error('Message analysis failed:', error.message);
    }
  }
}

async function handleDeleteAction(message: Message, result: any) {
  try {
    await message.delete();

    // Alert moderators if role is configured
    const modRoleId = message.guild?.members.me
      ? (await message.guild?.members.fetchMe()).roles.highest.id
      : null;

    // Send alert to channel (MVP: simple message)
    await message.channel.send({
      content: `🚨 **Threat Detected**\n` +
        `Message from ${message.author} was deleted.\n` +
        `Risk Score: **${result.riskScore}/100**\n` +
        `Reasons:\n${result.reasons.map((r: string) => `• ${r}`).join('\n')}`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    console.error('Failed to delete message:', error);
  }
}

async function handleWarnAction(message: Message, result: any) {
  try {
    // Send warning in channel
    await message.channel.send({
      content: `⚠️ ${message.author}, your message was flagged as potentially suspicious.\n` +
        `Risk Score: **${result.riskScore}/100**\n` +
        `Please be cautious with links and requests.`,
      allowedMentions: { parse: [] },
    });
  } catch (error) {
    console.error('Failed to send warning:', error);
  }
}
```

- [ ] **Step 3: Create ready handler**

```typescript
import { Client } from 'discord.js';

export function handleReady(client: Client) {
  console.log(`🛡️ Threat Detector bot logged in as ${client.user?.tag}`);
  console.log(`Monitoring ${client.guilds.cache.size} servers`);

  client.user?.setActivity('🛡️ protecting servers', { type: 2 });
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/bot/src/services/ packages/bot/src/events/
git commit -m "feat: add bot event handlers and API service"
```

---

### Task 13: Discord Bot - Dockerfile

**Files:**
- Create: `packages/bot/Dockerfile`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build

CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Commit**

```bash
git add packages/bot/Dockerfile
git commit -m "chore: add bot Dockerfile"
```

---

### Task 14: Dashboard - Project Setup

**Files:**
- Create: `packages/dashboard/package.json`
- Create: `packages/dashboard/tsconfig.json`
- Create: `packages/dashboard/next.config.js`
- Create: `packages/dashboard/tailwind.config.ts`
- Create: `packages/dashboard/postcss.config.js`

- [ ] **Step 1: Create dashboard package.json**

```json
{
  "name": "@threat-detector/dashboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000"
  },
  "dependencies": {
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.5"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
```

- [ ] **Step 4: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        danger: '#ef4444',
        warning: '#f59e0b',
        safe: '#22c55e',
        dark: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add packages/dashboard/package.json packages/dashboard/tsconfig.json packages/dashboard/next.config.js packages/dashboard/tailwind.config.ts packages/dashboard/postcss.config.js
git commit -m "chore: scaffold Next.js dashboard with Tailwind CSS"
```

---

### Task 15: Dashboard - Layout & Global Styles

**Files:**
- Create: `packages/dashboard/src/app/layout.tsx`
- Create: `packages/dashboard/src/app/globals.css`

- [ ] **Step 1: Create global styles**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-dark-900 text-gray-100;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-dark-800;
}

::-webkit-scrollbar-thumb {
  @apply bg-dark-600 rounded;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-dark-700;
}
```

- [ ] **Step 2: Create root layout**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Threat Detector | Admin Dashboard',
  description: 'Community Threat Intelligence Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-dark-900">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/dashboard/src/app/layout.tsx packages/dashboard/src/app/globals.css
git commit -m "feat: add dashboard layout and global styles"
```

---

### Task 16: Dashboard - Auth & API Client

**Files:**
- Create: `packages/dashboard/src/lib/api.ts`
- Create: `packages/dashboard/src/lib/auth.ts`

- [ ] **Step 1: Create API client**

```typescript
import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export async function login(username: string, password: string) {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
}

export async function fetchLogs(params?: {
  serverId?: string;
  action?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get('/logs', { params });
  return response.data;
}

export async function fetchStats(serverId?: string) {
  const response = await api.get('/stats', { params: { serverId } });
  return response.data;
}

export async function updateConfig(data: any) {
  const response = await api.post('/config', data);
  return response.data;
}

export async function fetchConfig(serverId: string) {
  const response = await api.get(`/config/${serverId}`);
  return response.data;
}
```

- [ ] **Step 2: Create auth helpers**

```typescript
export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/dashboard/src/lib/
git commit -m "feat: add dashboard API client and auth helpers"
```

---

### Task 17: Dashboard - Login Page

**Files:**
- Create: `packages/dashboard/src/app/login/page.tsx`

- [ ] **Step 1: Create login page**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setToken } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (typeof window !== 'undefined' && isAuthenticated()) {
    router.push('/');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      setToken(data.token);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="w-full max-w-md p-8 bg-dark-800 rounded-lg border border-dark-700">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">🛡️ Threat Detector</h1>
          <p className="text-gray-400 mt-2">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/30 rounded-md text-danger text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-md transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/src/app/login/page.tsx
git commit -m "feat: add dashboard login page"
```

---

### Task 18: Dashboard - Components

**Files:**
- Create: `packages/dashboard/src/components/Header.tsx`
- Create: `packages/dashboard/src/components/ThreatCard.tsx`
- Create: `packages/dashboard/src/components/LogsTable.tsx`
- Create: `packages/dashboard/src/components/SettingsForm.tsx`

- [ ] **Step 1: Create Header component**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { removeToken } from '@/lib/auth';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/logs', label: 'Logs' },
  { href: '/settings', label: 'Settings' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    removeToken();
    router.push('/login');
  };

  return (
    <header className="bg-dark-800 border-b border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-white">
              🛡️ Threat Detector
            </Link>
            <nav className="flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-dark-700 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-dark-700'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create ThreatCard component**

```tsx
interface ThreatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  color: 'danger' | 'warning' | 'safe' | 'blue';
}

const colorClasses = {
  danger: 'border-danger/30 bg-danger/5',
  warning: 'border-warning/30 bg-warning/5',
  safe: 'border-safe/30 bg-safe/5',
  blue: 'border-blue-500/30 bg-blue-500/5',
};

const textClasses = {
  danger: 'text-danger',
  warning: 'text-warning',
  safe: 'text-safe',
  blue: 'text-blue-500',
};

export default function ThreatCard({ title, value, trend, color }: ThreatCardProps) {
  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]}`}>
      <h3 className="text-sm font-medium text-gray-400">{title}</h3>
      <p className={`text-3xl font-bold mt-2 ${textClasses[color]}`}>{value}</p>
      {trend && <p className="text-xs text-gray-500 mt-2">{trend}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Create LogsTable component**

```tsx
'use client';

interface Message {
  id: string;
  content: string;
  riskScore: number;
  action: string;
  createdAt: string;
  user: {
    username: string;
    discordId: string;
  };
  threats: Array<{
    type: string;
    severity: string;
    reasoning: string;
  }>;
}

interface LogsTableProps {
  messages: Message[];
}

const actionColors: Record<string, string> = {
  delete: 'bg-danger/20 text-danger',
  warn: 'bg-warning/20 text-warning',
  allow: 'bg-safe/20 text-safe',
};

function getRiskColor(score: number): string {
  if (score > 80) return 'text-danger';
  if (score > 50) return 'text-warning';
  return 'text-safe';
}

export default function LogsTable({ messages }: LogsTableProps) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No messages found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-700">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Content</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Risk</th>
            <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Action</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Threat Type</th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Time</th>
          </tr>
        </thead>
        <tbody>
          {messages.map((msg) => (
            <tr key={msg.id} className="border-b border-dark-700/50 hover:bg-dark-800/50">
              <td className="py-3 px-4 text-sm text-white">
                {msg.user?.username || 'Unknown'}
              </td>
              <td className="py-3 px-4 text-sm text-gray-300 max-w-xs truncate">
                {msg.content}
              </td>
              <td className="py-3 px-4 text-sm text-center">
                <span className={`font-bold ${getRiskColor(msg.riskScore)}`}>
                  {msg.riskScore}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-center">
                <span className={`px-2 py-1 rounded text-xs font-medium ${actionColors[msg.action] || ''}`}>
                  {msg.action.toUpperCase()}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-400">
                {msg.threats?.[0]?.type || '—'}
              </td>
              <td className="py-3 px-4 text-sm text-gray-500 text-right">
                {new Date(msg.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Create SettingsForm component**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchConfig, updateConfig } from '@/lib/api';

interface SettingsFormProps {
  serverId: string;
}

export default function SettingsForm({ serverId }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    aiWeight: 0.5,
    urlWeight: 0.3,
    behaviorWeight: 0.2,
    deleteThreshold: 80,
    warnThreshold: 50,
    moderationRoleId: '',
  });

  useEffect(() => {
    if (serverId) {
      fetchConfig(serverId)
        .then((config) => {
          setFormData({
            aiWeight: config.aiWeight ?? 0.5,
            urlWeight: config.urlWeight ?? 0.3,
            behaviorWeight: config.behaviorWeight ?? 0.2,
            deleteThreshold: config.deleteThreshold ?? 80,
            warnThreshold: config.warnThreshold ?? 50,
            moderationRoleId: config.server?.moderationRoleId || '',
          });
        })
        .catch(() => {
          // Use defaults if config not found
        });
    }
  }, [serverId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      await updateConfig({ serverId, ...formData });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Error handled by API
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: parseFloat(value) || value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI Weight ({formData.aiWeight})
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.aiWeight}
            onChange={(e) => handleChange('aiWeight', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            URL Weight ({formData.urlWeight})
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.urlWeight}
            onChange={(e) => handleChange('urlWeight', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Behavior Weight ({formData.behaviorWeight})
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.behaviorWeight}
            onChange={(e) => handleChange('behaviorWeight', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Delete Threshold ({formData.deleteThreshold})
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={formData.deleteThreshold}
            onChange={(e) => handleChange('deleteThreshold', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Warn Threshold ({formData.warnThreshold})
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={formData.warnThreshold}
            onChange={(e) => handleChange('warnThreshold', e.target.value)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Moderation Role ID
          </label>
          <input
            type="text"
            value={formData.moderationRoleId}
            onChange={(e) => handleChange('moderationRoleId', e.target.value)}
            className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Role ID for mod alerts"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-md transition-colors"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>

        {saved && (
          <span className="text-safe text-sm">✓ Settings saved!</span>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/dashboard/src/components/
git commit -m "feat: add dashboard components (Header, ThreatCard, LogsTable, SettingsForm)"
```

---

### Task 19: Dashboard - Pages

**Files:**
- Create: `packages/dashboard/src/app/page.tsx`
- Create: `packages/dashboard/src/app/logs/page.tsx`
- Create: `packages/dashboard/src/app/settings/page.tsx`

- [ ] **Step 1: Create dashboard home page**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ThreatCard from '@/components/ThreatCard';
import { fetchStats } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Dashboard Overview</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ThreatCard
            title="Total Messages Scanned"
            value={stats?.totalMessages || 0}
            color="blue"
          />
          <ThreatCard
            title="Threats Detected"
            value={stats?.totalThreats || 0}
            color="danger"
          />
          <ThreatCard
            title="Messages Deleted"
            value={stats?.actionBreakdown?.delete || 0}
            color="danger"
            trend="Auto-removed"
          />
          <ThreatCard
            title="Warnings Issued"
            value={stats?.actionBreakdown?.warn || 0}
            color="warning"
            trend="Flagged for review"
          />
        </div>

        {stats?.threatTypes && stats.threatTypes.length > 0 && (
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Threat Breakdown</h2>
            <div className="space-y-3">
              {stats.threatTypes.map((t: any) => (
                <div key={t.type} className="flex justify-between items-center">
                  <span className="text-gray-300 capitalize">{t.type}</span>
                  <span className="text-white font-medium">{t.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create logs page**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LogsTable from '@/components/LogsTable';
import { fetchLogs } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function LogsPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchLogs({ action: filter === 'all' ? undefined : filter, page })
      .then((data) => {
        setMessages(data.messages);
        setPagination(data.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, page, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Message Logs</h1>

          <div className="flex gap-2">
            {['all', 'delete', 'warn', 'allow'].map((action) => (
              <button
                key={action}
                onClick={() => {
                  setFilter(action);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === action
                    ? 'bg-blue-600 text-white'
                    : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
          <LogsTable messages={messages} />
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-dark-700 rounded-md text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 bg-dark-700 rounded-md text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create settings page**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SettingsForm from '@/components/SettingsForm';
import { isAuthenticated } from '@/lib/auth';

export default function SettingsPage() {
  const router = useRouter();
  const [serverId, setServerId] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Select Server</h2>
          <input
            type="text"
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter Discord Server ID"
          />
          <p className="text-sm text-gray-500 mt-2">
            Right-click your server icon → Copy Server ID (enable Developer Mode in Discord settings)
          </p>
        </div>

        {serverId && (
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-6">
              Detection Configuration
            </h2>
            <SettingsForm serverId={serverId} />
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/dashboard/src/app/page.tsx packages/dashboard/src/app/logs/page.tsx packages/dashboard/src/app/settings/page.tsx
git commit -m "feat: add dashboard pages (home, logs, settings)"
```

---

### Task 20: Dashboard - Dockerfile

**Files:**
- Create: `packages/dashboard/Dockerfile`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
```

- [ ] **Step 2: Commit**

```bash
git add packages/dashboard/Dockerfile
git commit -m "chore: add dashboard Dockerfile"
```

---

### Task 21: Deployment Configuration & Documentation

**Files:**
- Create: `railway.json`
- Update: `README.md`

- [ ] **Step 1: Create railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- [ ] **Step 2: Update README.md with deployment instructions**

```markdown
# 🛡️ Community Threat Intelligence Platform

AI-powered security platform that detects scams, phishing, malicious links, and suspicious behavior in Discord communities.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 3. Start PostgreSQL
docker-compose up -d postgres

# 4. Run database migrations
npm run db:migrate --workspace=packages/backend

# 5. Start all services
npm run dev:backend
npm run dev:bot
npm run dev:dashboard
```

## Services

- **Backend API**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3000
- **Discord Bot**: Runs as background process

## Deploying to Railway

### 1. Database

1. Create a new project on Railway
2. Add a PostgreSQL database
3. Copy the `DATABASE_URL` to your environment variables

### 2. Backend

1. Connect your GitHub repo to Railway
2. Set the root directory to `packages/backend`
3. Add environment variables:
   - `DATABASE_URL` (from Railway PostgreSQL)
   - `JWT_SECRET` (random string)
   - `API_KEY` (random string for bot auth)
   - `OPENAI_API_KEY` (from OpenAI dashboard)
4. Deploy

### 3. Bot

1. Add another service in the same Railway project
2. Set root directory to `packages/bot`
3. Add environment variables:
   - `DISCORD_BOT_TOKEN` (from Discord Developer Portal)
   - `BACKEND_URL` (Railway backend URL)
   - `BOT_API_KEY` (same as backend API_KEY)
4. Deploy

### 4. Dashboard

1. Add another service
2. Set root directory to `packages/dashboard`
3. Add environment variables:
   - `NEXT_PUBLIC_BACKEND_URL` (Railway backend URL)
4. Deploy

## Discord Bot Setup

1. Create a Discord application at https://discord.com/developers/applications
2. Create a bot and copy the token
3. Enable these intents:
   - MESSAGE CONTENT INTENT
   - SERVER MEMBERS INTENT
4. Invite bot to your server with these permissions:
   - View Channels
   - Send Messages
   - Manage Messages
   - Read Message History
5. Run `/setup` in your server to initialize

## Tech Stack

- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL
- Bot: discord.js + TypeScript
- Dashboard: Next.js + Tailwind CSS
- AI: OpenAI API
- Deployment: Docker + Railway
```

- [ ] **Step 3: Commit**

```bash
git add railway.json README.md
git commit -m "chore: add Railway deployment config and update README"
```

---

## Final Verification Checklist

- [ ] All three packages build without errors (`npm run build --workspaces`)
- [ ] Database migrations run successfully (`npm run db:migrate --workspace=packages/backend`)
- [ ] Backend health endpoint returns 200 (`curl http://localhost:3001/health`)
- [ ] Bot connects to Discord and responds to `/setup`
- [ ] Dashboard login works with default credentials (admin/admin)
- [ ] Message analysis flow works end-to-end (bot → backend → AI → decision → action)
- [ ] Docker compose starts all services (`docker-compose up`)
