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

async function start() {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`Backend API running on 0.0.0.0:${config.port}`);
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
