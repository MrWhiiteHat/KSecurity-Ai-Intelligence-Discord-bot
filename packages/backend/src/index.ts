import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { spawnSync } from 'child_process';
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

// Fallback health response for platforms that probe root path.
app.get('/', (_req, res) => {
  res.status(200).send('ok');
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

function ensureSchema(): void {
  if (!config.databaseUrl) {
    return;
  }

  console.log('[backend] Ensuring Prisma schema with db push');
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(
    npxCommand,
    ['prisma', 'db', 'push', '--schema=packages/backend/prisma/schema.prisma'],
    {
      stdio: 'inherit',
      shell: false,
      env: process.env,
    }
  );

  if (result.error) {
    console.error('[backend] Prisma db push execution failed:', result.error);
    return;
  }

  if (result.status !== 0) {
    console.error(`[backend] Prisma db push exited with status ${result.status}; continuing startup.`);
    return;
  }

  console.log('[backend] Prisma schema sync complete.');
}

async function start() {
  console.log('[backend] Startup context:', {
    appService: process.env.APP_SERVICE || null,
    railwayServiceName: process.env.RAILWAY_SERVICE_NAME || null,
    nodeEnv: config.nodeEnv,
  });

  ensureSchema();

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Backend API running on 0.0.0.0:${config.port} (NODE_ENV=${config.nodeEnv})`);
  });

  if (!config.databaseUrl) {
    console.warn('Skipping initial database connection: DATABASE_URL is not configured.');
    return;
  }

  // Do not block health checks on initial DB availability during deploy.
  const maxAttempts = 12;
  const retryDelayMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      console.log('Database connected');
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Database connection attempt ${attempt}/${maxAttempts} failed: ${message}`);

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  console.error('Database connection retries exhausted; API remains up for health checks.');
}

start();
