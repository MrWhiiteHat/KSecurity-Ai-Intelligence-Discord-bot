// Known suspicious TLDs commonly used in phishing
const SUSPICIOUS_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'gq', 'xyz', 'top', 'club', 'work', 'buzz',
  'link', 'info', 'biz', 'icu', 'cam', 'date', 'loan', 'win',
]);

// URL shorteners (often used to hide malicious links)
const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd',
  'short.link', 'cutt.ly', 'rebrand.ly', 'buff.ly',
]);

// Typosquatting patterns for common domains
const TYPOSQUAT_PATTERNS = [
  { target: 'discord', patterns: ['disc0rd', 'd1scord', 'discorcl', 'discrod', 'discordd', 'dlscord'] },
  { target: 'steam', patterns: ['stearn', 'stearn', 'stern', 'stean', 'stema'] },
  { target: 'google', patterns: ['gooqle', 'goog1e', 'googel', 'gogle'] },
  { target: 'microsoft', patterns: ['micros0ft', 'rnicrosoft', 'microsofft'] },
  { target: 'amazon', patterns: ['arnazon', 'arnazon', 'amazcn', 'amaz0n'] },
  { target: 'apple', patterns: ['app1e', 'appl3', 'aplle', 'appie'] },
  { target: 'paypal', patterns: ['paypa1', 'paypai', 'paypall', 'paypal'] },
  { target: 'netflix', patterns: ['netf1ix', 'netfliix', 'netflx'] },
  { target: 'spotify', patterns: ['spot1fy', 'spotifv', 'spotifty', 'spotiify'] },
];

// Phishing keyword patterns in URLs
const PHISHING_KEYWORDS = [
  'free-nitro', 'free-nitro', 'claim-nitro', 'nitro-gift', 'nitro-giveaway',
  'verify-account', 'account-suspended', 'confirm-identity', 'update-payment',
  'security-check', 'login-verify', 'account-locked', 'unusual-activity',
];

export interface UrlAnalysisResult {
  riskScore: number;
  urls: string[];
  reasons: string[];
}

/**
 * Extract URLs from text content
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex) || [];
  return matches.map(url => url.replace(/[.,;:!?)>]*$/, ''));
}

/**
 * Analyze URLs for phishing patterns
 */
export function analyzeUrls(text: string): UrlAnalysisResult {
  const urls = extractUrls(text);
  if (urls.length === 0) {
    return { riskScore: 0, urls: [], reasons: [] };
  }

  let maxRisk = 0;
  const reasons: string[] = [];

  for (const url of urls) {
    const urlRisk = analyzeSingleUrl(url, reasons);
    maxRisk = Math.max(maxRisk, urlRisk);
  }

  return {
    riskScore: Math.min(maxRisk, 100),
    urls,
    reasons,
  };
}

function analyzeSingleUrl(url: string, reasons: string[]): number {
  let risk = 0;
  let hostname: string;

  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return 0;
  }

  // Check URL shorteners
  for (const shortener of URL_SHORTENERS) {
    if (hostname === shortener || hostname.endsWith(`.${shortener}`)) {
      risk += 30;
      reasons.push(`URL shortener detected: ${hostname}`);
      break;
    }
  }

  // Check suspicious TLDs
  const tld = hostname.split('.').pop() || '';
  if (SUSPICIOUS_TLDS.has(tld)) {
    risk += 20;
    reasons.push(`Suspicious TLD: .${tld}`);
  }

  // Check typosquatting
  for (const { target, patterns } of TYPOSQUAT_PATTERNS) {
    for (const pattern of patterns) {
      if (hostname.includes(pattern)) {
        risk += 60;
        reasons.push(`Possible typosquatting of ${target}: ${hostname}`);
        break;
      }
    }
  }

  // Check phishing keywords in URL path
  const urlLower = url.toLowerCase();
  for (const keyword of PHISHING_KEYWORDS) {
    if (urlLower.includes(keyword)) {
      risk += 40;
      reasons.push(`Phishing keyword in URL: ${keyword}`);
      break;
    }
  }

  // Check for IP address instead of domain (common in phishing)
  const ipRegex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
  if (ipRegex.test(hostname)) {
    risk += 30;
    reasons.push('IP address used instead of domain name');
  }

  // Check for excessive subdomains (e.g., a.b.c.d.example.com)
  const subdomainCount = hostname.split('.').length - 2;
  if (subdomainCount > 3) {
    risk += 15;
    reasons.push(`Excessive subdomains (${subdomainCount})`);
  }

  return Math.min(risk, 100);
}
