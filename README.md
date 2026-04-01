# Community Threat Intelligence Platform

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
