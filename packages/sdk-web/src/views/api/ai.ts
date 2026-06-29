import { SUMMARY_POINTS, SUGGESTED_REPLY } from '../data/seed';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

export async function callSummarise(threadId: string, token?: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/threads/${threadId}/ai/summarise`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { keyPoints?: string[] };
    if (Array.isArray(data.keyPoints) && data.keyPoints.length > 0) return data.keyPoints;
    throw new Error('empty response');
  } catch {
    return SUMMARY_POINTS;
  }
}

export async function callSuggest(threadId: string, token?: string): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/threads/${threadId}/ai/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { suggestion?: string };
    if (data.suggestion) return data.suggestion;
    throw new Error('empty response');
  } catch {
    return SUGGESTED_REPLY;
  }
}
