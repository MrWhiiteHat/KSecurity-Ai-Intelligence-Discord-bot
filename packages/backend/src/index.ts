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
