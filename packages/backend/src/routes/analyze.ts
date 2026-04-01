import { Router } from 'express';
import { z } from 'zod';
import { authenticateApiKey } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { prisma } from '../db/prisma';
import { analyzeUrls } from '../detection/url-analyzer';
import { classifyMessage } from '../detection/ai-classifier';
import { trackBehavior } from '../detection/behavior-tracker';
import { calculateRiskScore } from '../detection/risk-scorer';
import { makeDecision } from '../detection/decision-engine';

const analyzeSchema = z.object({
  serverId: z.string(),
  userId: z.string(),
  username: z.string(),
  content: z.string(),
  accountAgeDays: z.number().optional().default(30),
});

export const analyzeRouter = Router();

analyzeRouter.post('/message', authenticateApiKey, validate(analyzeSchema), async (req, res) => {
  try {
    const { serverId, userId, username, content, accountAgeDays } = req.body;

    const [urlResult, aiResult, behaviorResult] = await Promise.all([
      analyzeUrls(content),
      classifyMessage(content),
      Promise.resolve(trackBehavior(serverId, userId, content, accountAgeDays)),
    ]);

    const serverConfig = await prisma.config.findUnique({
      where: { serverId },
    });

    const weights = serverConfig
      ? {
          aiWeight: serverConfig.aiWeight,
          urlWeight: serverConfig.urlWeight,
          behaviorWeight: serverConfig.behaviorWeight,
        }
      : undefined;

    const thresholds = serverConfig
      ? {
          deleteThreshold: serverConfig.deleteThreshold,
          warnThreshold: serverConfig.warnThreshold,
        }
      : undefined;

    const riskResult = calculateRiskScore(aiResult, urlResult, behaviorResult, weights);

    const decision = makeDecision(riskResult.finalScore, thresholds);

    const user = await prisma.user.upsert({
      where: { discordId_serverId: { discordId: userId, serverId } },
      update: { username },
      create: { discordId: userId, username, serverId },
    });

    const message = await prisma.message.create({
      data: {
        serverId,
        userId: user.id,
        content: content.slice(0, 2000),
        riskScore: riskResult.finalScore,
        action: decision.action,
      },
    });

    if (decision.action !== 'allow') {
      await prisma.threat.create({
        data: {
          messageId: message.id,
          type: aiResult.category === 'scam' ? 'scam' : 'suspicious',
          severity: decision.action === 'delete' ? 'high' : 'medium',
          reasoning: riskResult.reasons.join('; '),
        },
      });
    }

    res.json({
      decision: decision.action,
      riskScore: riskResult.finalScore,
      breakdown: {
        ai: riskResult.aiScore,
        url: riskResult.urlScore,
        behavior: riskResult.behaviorScore,
      },
      reasons: riskResult.reasons,
      urls: urlResult.urls,
    });
  } catch (error) {
    console.error('Analyze message error:', error);
    res.status(500).json({ error: 'Failed to analyze message' });
  }
});
