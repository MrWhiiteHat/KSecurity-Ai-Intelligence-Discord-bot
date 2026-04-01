import { UrlAnalysisResult } from './url-analyzer';
import { AiClassificationResult, categoryToRiskScore } from './ai-classifier';

export interface RiskScoreResult {
  finalScore: number;
  aiScore: number;
  urlScore: number;
  behaviorScore: number;
  reasons: string[];
}

export interface ServerWeights {
  aiWeight: number;
  urlWeight: number;
  behaviorWeight: number;
}

const DEFAULT_WEIGHTS: ServerWeights = {
  aiWeight: 0.5,
  urlWeight: 0.3,
  behaviorWeight: 0.2,
};

/**
 * Calculate weighted risk score from all detection signals
 */
export function calculateRiskScore(
  aiResult: AiClassificationResult,
  urlResult: UrlAnalysisResult,
  behaviorResult: { riskScore: number; reasons: string[] },
  weights: ServerWeights = DEFAULT_WEIGHTS
): RiskScoreResult {
  const aiScore = categoryToRiskScore(aiResult.category, aiResult.confidence);
  const urlScore = urlResult.riskScore;
  const behaviorScore = behaviorResult.riskScore;

  const finalScore = Math.round(
    aiScore * weights.aiWeight +
    urlScore * weights.urlWeight +
    behaviorScore * weights.behaviorWeight
  );

  const reasons = [
    ...aiResult.reasoning ? [`AI: ${aiResult.reasoning}`] : [],
    ...urlResult.reasons.map(r => `URL: ${r}`),
    ...behaviorResult.reasons.map(r => `Behavior: ${r}`),
  ];

  return {
    finalScore: Math.min(finalScore, 100),
    aiScore,
    urlScore,
    behaviorScore,
    reasons,
  };
}
