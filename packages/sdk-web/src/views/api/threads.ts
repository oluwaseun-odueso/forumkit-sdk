import type { CreateThreadBody, UpdateThreadBody, ErrorResponse, Thread, Post } from '@forumkit/types';

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

export async function listThreads(forumId: string, token?: string): Promise<ListThreadsResult> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ListThreadsResult;
}

export type GetThreadResult = { thread: Thread; posts: Post[] };

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
