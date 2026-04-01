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
      actionBreakdown: actionBreakdown.reduce((acc: Record<string, number>, item: { action: string; _count: number }) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>),
      threatTypes: threatTypes.map((t: { type: string; _count: number }) => ({ type: t.type, count: t._count })),
      dailyTrend,
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
