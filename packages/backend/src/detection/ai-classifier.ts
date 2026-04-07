import OpenAI from 'openai';
import { config } from '../config';

export interface AiClassificationResult {
  category: 'scam' | 'suspicious' | 'safe';
  confidence: number;
  reasoning: string;
}

const openai = config.openaiApiKey ? new OpenAI({ apiKey: config.openaiApiKey }) : null;

const SYSTEM_PROMPT = `You are a cybersecurity threat detection AI. Analyze Discord messages and classify them into one of three categories:

- "scam": Clear scam, phishing, fraud attempt, malicious link sharing, impersonation
- "suspicious": Potentially suspicious but not definitively malicious, unusual behavior
- "safe": Normal conversation, no threat indicators

Respond with ONLY a JSON object in this exact format:
{"category": "scam"|"suspicious"|"safe", "confidence": 0.0-1.0, "reasoning": "brief explanation"}

Consider these threat indicators:
- Requests for personal information, passwords, or payment details
- Fake giveaway or free offer claims
- Urgency or pressure tactics
- Impersonation of staff or trusted entities
- Links to suspicious websites
- Requests to download files or run commands
- Crypto/NFT scam patterns
- Social engineering attempts`;

export async function classifyMessage(content: string): Promise<AiClassificationResult> {
  if (!openai) {
    return {
      category: 'suspicious',
      confidence: 0.3,
      reasoning: 'OPENAI_API_KEY is not configured; using fallback classification',
    };
  }

  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI classification timeout')), 3000);
    });

    const result = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyze this Discord message: "${content}"` },
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
      timeout,
    ]);

    const responseText = result.choices[0].message.content || '{}';
    const parsed = JSON.parse(responseText);

    return {
      category: parsed.category || 'safe',
      confidence: parsed.confidence || 0.5,
      reasoning: parsed.reasoning || 'No reasoning provided',
    };
  } catch (error) {
    console.error('AI classification failed:', error);
    // Fallback: return neutral classification
    return {
      category: 'suspicious',
      confidence: 0.3,
      reasoning: 'AI classification failed, falling back to rule-based analysis',
    };
  }
}

/**
 * Convert AI category to numeric risk score
 */
export function categoryToRiskScore(category: string, confidence: number): number {
  const baseScores: Record<string, number> = {
    scam: 85,
    suspicious: 55,
    safe: 10,
  };

  const base = baseScores[category] || 30;
  // Scale by confidence
  return Math.round(base * confidence);
}
