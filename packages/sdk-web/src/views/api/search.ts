import type { SearchResponse, SearchResult, CommentSearchResult, UserSearchResult } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// q is the search query string (whatever the user typed). opts bundles the
// optional pagination controls — page (1-indexed) and limit (results per
// page) — both optional; the backend falls back to its own defaults
// (page 1, limit 20) when omitted.
export type SearchOpts = { page?: number | undefined; limit?: number | undefined };

// Builds the shared ?q=&page=&limit= query string every search endpoint
// below takes — kept as one helper so the three functions stay consistent.
function buildQuery(q: string, opts?: SearchOpts): string {
  const qs = new URLSearchParams({ q });
  if (opts?.page) qs.set('page', String(opts.page));
  if (opts?.limit) qs.set('limit', String(opts.limit));
  return qs.toString();
}

// GET /forums/:forumId/search — thread search (see services/search.ts on
// the API side for how this merges semantic + keyword/fuzzy results).
export async function searchThreads(
  forumId: string,
  q: string,
  opts?: SearchOpts,
  token?: string,
): Promise<SearchResponse<SearchResult>> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/search?${buildQuery(q, opts)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SearchResponse<SearchResult>;
}

// GET /forums/:forumId/search/comments — forum-wide comment search, backs
// the search-results page's Comments section. For the thread-scoped version
// used by the in-thread "Search Comments" pill, see searchThreadComments in
// api/comments.ts instead.
export async function searchComments(
  forumId: string,
  q: string,
  opts?: SearchOpts,
  token?: string,
): Promise<SearchResponse<CommentSearchResult>> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/search/comments?${buildQuery(q, opts)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as SearchResponse<CommentSearchResult>;
}

// GET /forums/:forumId/search/users — fuzzy display-name search, backs the
// search-results page's People section. Response has no `mode` field since
// this is always fuzzy-only (see repositories/user.ts's searchUsers for why
// there's no semantic mode for names).
export async function searchUsers(
  forumId: string,
  q: string,
  opts?: SearchOpts,
  token?: string,
): Promise<{ results: UserSearchResult[]; total: number; page: number; limit: number }> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/search/users?${buildQuery(q, opts)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { results: UserSearchResult[]; total: number; page: number; limit: number };
}
