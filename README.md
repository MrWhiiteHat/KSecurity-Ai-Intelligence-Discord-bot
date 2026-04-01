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
