import type { CreateThreadBody, UpdateThreadBody, ErrorResponse, Thread, Comment, TopWindow, RelatedThreadForRail } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function unwrapThread(res: Response): Promise<Thread> {
  if (!res.ok) {
    const message = await res
      .json()
      .then((data: ErrorResponse) => data.message)
      .catch(() => undefined);
    throw new Error(message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as Thread;
}

export type ListThreadsResult = { threads: Thread[]; total: number; page: number; limit: number };

export type ListThreadsParams = {
  sort?: 'best' | 'hot' | 'new' | 'top' | 'rising' | undefined;
  tagId?: string | undefined;
  tagName?: string | undefined;
  pinned?: boolean | undefined;
  topWindow?: TopWindow | undefined;
  limit?: number | undefined;
  page?: number | undefined;
};

export async function listThreads(
  forumId: string,
  token?: string,
  params?: ListThreadsParams,
): Promise<ListThreadsResult> {
  const qs = new URLSearchParams();
  if (params?.sort) qs.set('sort', params.sort);
  if (params?.tagId) qs.set('tagId', params.tagId);
  if (params?.tagName) qs.set('tagName', params.tagName);
  if (params?.pinned !== undefined) qs.set('pinned', String(params.pinned));
  if (params?.topWindow) qs.set('topWindow', params.topWindow);
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.page) qs.set('page', String(params.page));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const res = await fetch(`${API_BASE}/forums/${forumId}/threads${suffix}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ListThreadsResult;
}

export async function getSimilarThreads(
  forumId: string,
  threadId: string,
  token?: string,
  limit = 5,
): Promise<{ threads: RelatedThreadForRail[] }> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}/similar?limit=${limit}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { threads: RelatedThreadForRail[] };
}

export type GetThreadResult = { thread: Thread; comments: Comment[] };

export async function getThread(forumId: string, threadId: string, token?: string): Promise<GetThreadResult> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as GetThreadResult;
}

export async function createThread(forumId: string, body: CreateThreadBody, token?: string): Promise<Thread> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return unwrapThread(res);
}

export async function updateThread(
  forumId: string,
  threadId: string,
  body: UpdateThreadBody,
  token?: string,
): Promise<Thread> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return unwrapThread(res);
}

export async function saveThread(forumId: string, threadId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}/save`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function unsaveThread(forumId: string, threadId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}/save`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function reportThread(forumId: string, threadId: string, reason: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function shareThreadWithUsers(
  forumId: string,
  threadId: string,
  recipientUserIds: string[],
  message: string | undefined,
  token?: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ recipientUserIds, message }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
