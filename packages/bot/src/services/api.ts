import axios from 'axios';
import { config } from '../config';

export const apiClient = axios.create({
  baseURL: config.backendUrl,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
  },
  timeout: 5000,
});

export interface AnalyzeResponse {
  decision: 'delete' | 'warn' | 'allow';
  riskScore: number;
  breakdown: {
    ai: number;
    url: number;
    behavior: number;
  };
  reasons: string[];
  urls: string[];
}

export async function analyzeMessage(params: {
  serverId: string;
  userId: string;
  username: string;
  content: string;
  accountAgeDays: number;
}): Promise<AnalyzeResponse> {
  const response = await apiClient.post('/analyze/message', params);
  return response.data;
}
