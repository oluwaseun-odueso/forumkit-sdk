import type { CreateThreadBody, ErrorResponse, Thread } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export async function createThread(forumId: string, body: CreateThreadBody, token?: string): Promise<Thread> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const message = await res
      .json()
      .then((data: ErrorResponse) => data.message)
      .catch(() => undefined);
    throw new Error(message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as Thread;
}
