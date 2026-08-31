import type { SearchResponse, SearchResult, CommentSearchResult, UserSearchResult } from '@forumkit/types';
import {
  searchThreads as sharedSearchThreads,
  searchUsers as sharedSearchUsers,
  type SearchOpts,
} from '@forumkit/shared';

// SearchOpts now lives in @forumkit/shared; re-exported so existing imports work.
export type { SearchOpts };

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildQuery(q: string, opts?: SearchOpts): string {
  const qs = new URLSearchParams({ q });
  if (opts?.page) qs.set('page', String(opts.page));
  if (opts?.limit) qs.set('limit', String(opts.limit));
  return qs.toString();
}

// Thread + user search delegate to the shared client (signatures unchanged).
export function searchThreads(
  forumId: string,
  q: string,
  opts?: SearchOpts,
  token?: string,
): Promise<SearchResponse<SearchResult>> {
  return sharedSearchThreads(API_BASE, forumId, q, opts, token);
}

export function searchUsers(
  forumId: string,
  q: string,
  opts?: SearchOpts,
  token?: string,
): Promise<{ results: UserSearchResult[]; total: number; page: number; limit: number }> {
  return sharedSearchUsers(API_BASE, forumId, q, opts, token);
}

// Forum-wide comment search stays local (not part of the shared subset).
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
