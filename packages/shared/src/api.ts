import type { Thread, VoteCounts, VoteDirection, TopWindow } from '@forumkit/types';

// Platform-agnostic ForumKit API client — the single source of truth for the
// endpoints both SDKs share. Every function takes `apiUrl` explicitly (there's
// no window in React Native). sdk-web's api/auth.ts, api/threads.ts and
// api/votes.ts are thin wrappers that pass window.FK_API_URL as `apiUrl` and
// keep their existing signatures; the mobile SDK calls these directly with its
// config.apiUrl.

export function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function okJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function okVoid(res: Response): Promise<void> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Manual query builder rather than URLSearchParams — the latter's React Native
// (Hermes) polyfill has historically been incomplete, and this keeps the shared
// client identical across both runtimes.
function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

// ── Session ────────────────────────────────────────────────────────

export type CreateSessionResult = {
  sessionToken: string;
  userId: string;
  role: string;
  expiresIn: number;
};

export async function createSession(apiUrl: string, hostToken: string): Promise<CreateSessionResult> {
  const res = await fetch(`${apiUrl}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ token: hostToken }),
  });
  return okJson<CreateSessionResult>(res);
}

// ── Threads ────────────────────────────────────────────────────────

export type ListThreadsParams = {
  sort?: 'best' | 'hot' | 'new' | 'top' | 'rising' | undefined;
  tagId?: string | undefined;
  tagName?: string | undefined;
  pinned?: boolean | undefined;
  topWindow?: TopWindow | undefined;
  limit?: number | undefined;
  page?: number | undefined;
};

export type ListThreadsResult = { threads: Thread[]; total: number; page: number; limit: number };

export async function listThreads(
  apiUrl: string,
  forumId: string,
  token?: string,
  params?: ListThreadsParams,
): Promise<ListThreadsResult> {
  const suffix = buildQuery({
    sort: params?.sort,
    tagId: params?.tagId,
    tagName: params?.tagName,
    pinned: params?.pinned,
    topWindow: params?.topWindow,
    limit: params?.limit,
    page: params?.page,
  });
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads${suffix}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  return okJson<ListThreadsResult>(res);
}

export async function saveThread(apiUrl: string, forumId: string, threadId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/save`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function unsaveThread(apiUrl: string, forumId: string, threadId: string, token?: string): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/save`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okVoid(res);
}

export async function reportThread(
  apiUrl: string,
  forumId: string,
  threadId: string,
  reason: string,
  token?: string,
): Promise<void> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ reason }),
  });
  return okVoid(res);
}

// ── Votes ──────────────────────────────────────────────────────────

export type VoteResult = { voteCounts: VoteCounts; myVote: VoteDirection | null };

export async function voteOnThread(
  apiUrl: string,
  forumId: string,
  threadId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ direction }),
  });
  return okJson<VoteResult>(res);
}

export async function removeVoteFromThread(
  apiUrl: string,
  forumId: string,
  threadId: string,
  token?: string,
): Promise<VoteResult> {
  const res = await fetch(`${apiUrl}/forums/${forumId}/threads/${threadId}/vote`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return okJson<VoteResult>(res);
}
