interface UserActivity {
  messageCount: number;
  lastMessageTime: number;
  messageContents: string[];
  firstSeen: number;
  windowStart: number;
}

// In-memory behavior tracker (per server)
const activityWindows = new Map<string, Map<string, UserActivity>>();

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_MESSAGES_PER_WINDOW = 10;
const SIMILARITY_THRESHOLD = 0.8;

/**
 * Track user message activity and detect behavioral anomalies
 */
export function trackBehavior(
  serverId: string,
  userId: string,
  content: string,
  accountAgeDays: number
): { riskScore: number; reasons: string[] } {
  const serverMap = activityWindows.get(serverId) || new Map();
  activityWindows.set(serverId, serverMap);

  const now = Date.now();
  let activity = serverMap.get(userId);

  // Initialize or reset window
  if (!activity || now - activity.windowStart > WINDOW_MS) {
    activity = {
      messageCount: 0,
      lastMessageTime: 0,
      messageContents: [],
      firstSeen: now,
      windowStart: now,
    };
    serverMap.set(userId, activity);
  }

  activity.messageCount++;
  activity.lastMessageTime = now;
  activity.messageContents.push(content);

  // Keep only last 10 messages for similarity check
  if (activity.messageContents.length > 10) {
    activity.messageContents = activity.messageContents.slice(-10);
  }

  const reasons: string[] = [];
  let riskScore = 0;

  // Check message frequency (spam detection)
  if (activity.messageCount > MAX_MESSAGES_PER_WINDOW) {
    riskScore += 40;
    reasons.push(`High message frequency: ${activity.messageCount} messages in 5min window`);
  } else if (activity.messageCount > 6) {
    riskScore += 20;
    reasons.push(`Elevated message frequency: ${activity.messageCount} messages in 5min window`);
  }

  // Check for repeated content (copy-paste spam)
  const repeatedCount = countSimilarMessages(activity.messageContents);
  if (repeatedCount > 2) {
    riskScore += 35;
    reasons.push(`Repeated similar content detected (${repeatedCount} times)`);
  }

  // Check for new account (less than 7 days old)
  if (accountAgeDays < 1) {
    riskScore += 30;
    reasons.push('Brand new account (less than 24 hours old)');
  } else if (accountAgeDays < 7) {
    riskScore += 15;
    reasons.push(`New account (${Math.floor(accountAgeDays)} days old)`);
  }

  // Check rapid burst (messages within 1 second of each other)
  if (activity.messageCount > 3 && activity.lastMessageTime - activity.windowStart < 5000) {
    riskScore += 25;
    reasons.push('Message burst detected (3+ messages in 5 seconds)');
  }

  return {
    riskScore: Math.min(riskScore, 100),
    reasons,
  };
}

/**
 * Simple string similarity check (Jaccard-like)
 */
function stringSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));

  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 1 : intersection.size / union.size;
}

function countSimilarMessages(messages: string[]): number {
  let maxSimilar = 0;

  for (let i = 0; i < messages.length; i++) {
    let similar = 1;
    for (let j = i + 1; j < messages.length; j++) {
      if (stringSimilarity(messages[i], messages[j]) > SIMILARITY_THRESHOLD) {
        similar++;
      }
    }
    maxSimilar = Math.max(maxSimilar, similar);
  }

  return maxSimilar;
}

/**
 * Clean up old activity windows (call periodically)
 */
export function cleanupOldActivity(): void {
  const now = Date.now();
  for (const [serverId, users] of activityWindows.entries()) {
    for (const [userId, activity] of users.entries()) {
      if (now - activity.windowStart > WINDOW_MS * 2) {
        users.delete(userId);
      }
    }
    if (users.size === 0) {
      activityWindows.delete(serverId);
    }
  }
}

// Clean up every 10 minutes
setInterval(cleanupOldActivity, 10 * 60 * 1000);
