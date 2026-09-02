import type { AISuggestion, SimilarThread } from '@forumkit/types';
import { askQuestionStreaming, summariseStreaming, suggestStreaming } from '@forumkit/shared';
export type { AskStreamEvent, SummariseStreamEvent, SuggestStreamEvent } from '@forumkit/shared';

function getApiBase(): string {
  return typeof window !== 'undefined'
    ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
    : '';
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function callSummarise(threadId: string, token?: string): Promise<string[]> {
  try {
    const res = await fetch(`${getApiBase()}/threads/${threadId}/ai/summarise`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { summary?: { keyPoints?: string[] } };
    const points = data.summary?.keyPoints;
    if (Array.isArray(points) && points.length > 0) return points;
    throw new Error('empty response');
  } catch {
    return [];
  }
}

export async function callSuggest(threadId: string, token?: string): Promise<string> {
  try {
    const res = await fetch(`${getApiBase()}/threads/${threadId}/ai/suggest`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { suggestion?: AISuggestion };
    if (data.suggestion?.suggestion) return data.suggestion.suggestion;
    throw new Error('empty response');
  } catch {
    return '';
  }
}

export async function callSurfaceRelated(threadId: string, token?: string): Promise<SimilarThread[]> {
  try {
    const res = await fetch(`${getApiBase()}/threads/${threadId}/ai/surface-related`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { related?: SimilarThread[] };
    if (Array.isArray(data.related)) return data.related;
    throw new Error('empty response');
  } catch {
    return [];
  }
}

export type SuggestMetadataResult = { title: string | null; tags: string[] };

export async function callSummariseStreaming(
  threadId: string,
  onEvent: Parameters<typeof summariseStreaming>[3],
  token?: string,
): Promise<void> {
  await summariseStreaming(getApiBase(), threadId, token, onEvent);
}

export async function callSuggestStreaming(
  threadId: string,
  onEvent: Parameters<typeof suggestStreaming>[3],
  token?: string,
): Promise<void> {
  await suggestStreaming(getApiBase(), threadId, token, onEvent);
}

export async function callAskStreaming(
  forumId: string,
  q: string,
  token: string | undefined,
  onEvent: Parameters<typeof askQuestionStreaming>[4],
): Promise<void> {
  if (!token) throw new Error('Not authenticated');
  await askQuestionStreaming(getApiBase(), forumId, q, token, onEvent);
}

export async function callSuggestMetadata(
  forumId: string,
  title: string,
  body: string,
  existingTags: string[],
  token?: string,
): Promise<SuggestMetadataResult> {
  try {
    const res = await fetch(`${getApiBase()}/forums/${forumId}/ai/suggest-metadata`, {
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
