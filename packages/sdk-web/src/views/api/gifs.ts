import type { GifResult } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Distinguishes "the forum owner hasn't set a GIPHY key yet" (an expected,
// recoverable state the picker shows its own friendly message for) from a
// real failure — the composer needs to tell these apart, not just show a
// generic error either way.
export class GifSearchNotConfiguredError extends Error {}

export async function searchGifs(forumId: string, query: string, token?: string, limit = 24): Promise<GifResult[]> {
  const qs = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`${API_BASE}/forums/${forumId}/gifs/search?${qs.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  if (res.status === 503) throw new GifSearchNotConfiguredError('GIF search is not configured for this forum yet.');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { results: GifResult[] };
  return body.results;
}
