import { SUMMARY_POINTS, SUGGESTED_REPLY } from '../data/seed';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function callSummarise(threadId: string, token?: string): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/threads/${threadId}/ai/summarise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
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
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { suggestion?: string };
    if (data.suggestion) return data.suggestion;
    throw new Error('empty response');
  } catch {
    return SUGGESTED_REPLY;
  }
}

export type SuggestMetadataResult = { title: string | null; tags: string[] };

export async function callSuggestMetadata(
  forumId: string,
  title: string,
  body: string,
  existingTags: string[],
  token?: string,
): Promise<SuggestMetadataResult> {
  try {
    const res = await fetch(`${API_BASE}/forums/${forumId}/ai/suggest-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ title, body, existingTags }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as SuggestMetadataResult;
    return { title: data.title ?? null, tags: Array.isArray(data.tags) ? data.tags : [] };
  } catch {
    return { title: null, tags: [] };
  }
}
