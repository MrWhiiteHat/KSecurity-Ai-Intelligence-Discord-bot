# Community Threat Intelligence Platform - Design Spec

**Date:** 2026-04-01
**Status:** Approved

## Overview

AI-powered security SaaS platform that detects scams, phishing, malicious links, and suspicious user behavior in Discord communities in real-time.

## Architecture

### Three Independent Subsystems

1. **Backend API** (Node.js + Express + Prisma + PostgreSQL)
   - REST API for threat analysis
   - Detection engine (URL analysis, AI classification, behavior tracking, risk scoring)
   - Decision engine (configurable thresholds for delete/warn/allow)
   - Authentication (JWT for dashboard, API key for bot)

2. **Discord Bot** (discord.js)
   - Real-time message monitoring
   - Extract URLs, attachments, user metadata
   - Send data to backend API
   - Slash commands (/setup, /config)
   - Execute actions (delete messages, warn users, alert moderators)

3. **Admin Dashboard** (Next.js + Tailwind CSS)
   - Login page
   - Dashboard with threat overview
   - Logs table with filtering
   - Settings panel for per-server configuration

### Data Flow

```
Discord Message → Bot → POST /analyze-message → Backend
  → Detection Engine (URL + AI + Behavior) → Risk Score
  → Decision Engine → Action (delete/warn/allow)
  → Store in PostgreSQL → Dashboard displays results
```

## Database Schema (PostgreSQL via Prisma)

### Tables

- **User**: id (PK), discordId, username, discriminator, createdAt, trustScore, serverId (FK)
- **Server**: id (PK), discordId, name, moderationRoleId, createdAt
- **Message**: id (PK), serverId (FK), userId (FK), content, riskScore, action, createdAt
- **Threat**: id (PK), messageId (FK), type, severity, reasoning, detectedAt
- **Config**: serverId (PK, FK), aiWeight, urlWeight, behaviorWeight, deleteThreshold, warnThreshold

### Indexing Strategy

- Messages: composite index on (serverId, createdAt) for filtering
- Threats: index on (type, detectedAt) for analytics
- Users: unique index on discordId + serverId

## Detection Engine

### URL Analysis
- Extract URLs via regex
- Check against known phishing patterns (typosquatting, suspicious TLDs, URL shorteners)
- Risk score 0-100 based on pattern matching

### AI Classification
- OpenAI API classifies message content
- Returns: category (scam/suspicious/safe), confidence (0-1), reasoning
- Timeout: 3s max, fallback to rule-based only

### Behavior Tracking
- In-memory Map tracking: messages per user per window, repeated content, new account flag
- Window: 5 minutes, reset periodically

### Risk Scoring
- Weighted formula: AI (50%) + URL (30%) + Behavior (20%)
- Configurable weights per server

## Decision Engine

- Risk > deleteThreshold (default 80): delete message, alert moderators
- Risk > warnThreshold (default 50): warn user, log event
- Risk < warnThreshold: allow, log message

## Security

- API key authentication for bot → backend
- JWT authentication for dashboard
- Rate limiting on all API endpoints
- Input validation on all endpoints
- Environment variables for all secrets

## Deployment

- Railway platform
- PostgreSQL addon
- Three separate services (backend, bot, dashboard)
- Docker support for local development

## Performance Targets

- Message processing < 500ms
- Async processing for non-critical paths
- Efficient Prisma queries with proper indexing
