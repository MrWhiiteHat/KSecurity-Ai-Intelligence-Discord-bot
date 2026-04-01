export type DecisionAction = 'delete' | 'warn' | 'allow';

export interface DecisionResult {
  action: DecisionAction;
  riskScore: number;
  reasons: string[];
  shouldNotifyMods: boolean;
}

export interface ThresholdConfig {
  deleteThreshold: number;
  warnThreshold: number;
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  deleteThreshold: 80,
  warnThreshold: 50,
};

/**
 * Determine action based on risk score and configured thresholds
 */
export function makeDecision(
  riskScore: number,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): DecisionResult {
  if (riskScore > thresholds.deleteThreshold) {
    return {
      action: 'delete',
      riskScore,
      reasons: [`Risk score ${riskScore} exceeds delete threshold (${thresholds.deleteThreshold})`],
      shouldNotifyMods: true,
    };
  }

  if (riskScore > thresholds.warnThreshold) {
    return {
      action: 'warn',
      riskScore,
      reasons: [`Risk score ${riskScore} exceeds warn threshold (${thresholds.warnThreshold})`],
      shouldNotifyMods: false,
    };
  }

  return {
    action: 'allow',
    riskScore,
    reasons: [`Risk score ${riskScore} is within acceptable range`],
    shouldNotifyMods: false,
  };
}
