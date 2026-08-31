import { summariseStreaming, suggestStreaming } from '@forumkit/shared';
export type { SummariseStreamEvent, SuggestStreamEvent } from '@forumkit/shared';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function callSummarise(
  apiUrl: string,
  threadId: string,
  token?: string,
): Promise<string[] | null> {
  try {
    const res = await fetch(`${apiUrl}/threads/${threadId}/ai/summarise`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { summary?: { keyPoints?: string[] } };
    const points = data.summary?.keyPoints;
    return Array.isArray(points) && points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

export async function checkAiAvailable(
  apiUrl: string,
  forumId: string,
  token?: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/forums/${forumId}/ai/available`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { available?: boolean };
    return data.available === true;
  } catch {
    return false;
  }
}

export type SuggestMetadataResult = { title: string | null; tags: string[] };

export async function callSuggestMetadata(
  apiUrl: string,
  forumId: string,
  title: string,
  body: string,
  existingTags: string[],
  token?: string,
): Promise<SuggestMetadataResult | null> {
  try {
    const res = await fetch(`${apiUrl}/forums/${forumId}/ai/suggest-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ title, body, existingTags }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SuggestMetadataResult;
    return { title: data.title ?? null, tags: Array.isArray(data.tags) ? data.tags : [] };
  } catch {
    return null;
  }
}

export async function callSuggest(
  apiUrl: string,
  threadId: string,
  token?: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${apiUrl}/threads/${threadId}/ai/suggest`, {
      method: 'POST',
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { suggestion?: { suggestion?: string } };
    return data.suggestion?.suggestion ?? null;
  } catch {
    return null;
  }
}

export async function callSummariseStreaming(
  apiUrl: string,
  threadId: string,
  onEvent: Parameters<typeof summariseStreaming>[3],
  token?: string,
): Promise<void> {
  await summariseStreaming(apiUrl, threadId, token, onEvent);
}

export async function callSuggestStreaming(
  apiUrl: string,
  threadId: string,
  onEvent: Parameters<typeof suggestStreaming>[3],
  token?: string,
): Promise<void> {
  await suggestStreaming(apiUrl, threadId, token, onEvent);
}
