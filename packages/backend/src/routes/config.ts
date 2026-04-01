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

    await prisma.server.upsert({
      where: { discordId: serverId },
      update: {},
      create: { discordId: serverId, name: `Server ${serverId}` },
    });

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
