import { Router } from 'express';
import { z } from 'zod';
import { authenticateApiKeyOrJWT } from '../middleware/auth';
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
  moderationRole: z.string().nullable().optional(),
});

export const configRouter = Router();

configRouter.post('/', authenticateApiKeyOrJWT, validate(configSchema), async (req, res) => {
  try {
    const {
      serverId,
      moderationRoleId,
      moderationRole,
      ...configUpdates
    } = req.body;

    const resolvedModerationRoleId =
      moderationRoleId !== undefined ? moderationRoleId : moderationRole;

    const server = await prisma.server.upsert({
      where: { discordId: serverId },
      update: {},
      create: { discordId: serverId, name: `Server ${serverId}` },
    });

    const config = await prisma.config.upsert({
      where: { serverId: server.id },
      update: configUpdates,
      create: {
        serverId: server.id,
        aiWeight: configUpdates.aiWeight ?? 0.5,
        urlWeight: configUpdates.urlWeight ?? 0.3,
        behaviorWeight: configUpdates.behaviorWeight ?? 0.2,
        deleteThreshold: configUpdates.deleteThreshold ?? 80,
        warnThreshold: configUpdates.warnThreshold ?? 50,
      },
    });

    if (resolvedModerationRoleId !== undefined) {
      await prisma.server.update({
        where: { discordId: serverId },
        data: { moderationRoleId: resolvedModerationRoleId },
      });
    }

    res.json({ success: true, config });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

configRouter.get('/:serverId', authenticateApiKeyOrJWT, async (req, res) => {
  try {
    const config = await prisma.config.findFirst({
      where: {
        server: {
          discordId: req.params.serverId,
        },
      },
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
