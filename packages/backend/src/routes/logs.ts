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
