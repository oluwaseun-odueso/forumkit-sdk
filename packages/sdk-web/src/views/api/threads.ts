import type { CreateThreadBody, UpdateThreadBody, ErrorResponse, Thread, Comment, RelatedThreadForRail } from '@forumkit/types';
import {
  listThreads as sharedListThreads,
  saveThread as sharedSaveThread,
  unsaveThread as sharedUnsaveThread,
  reportThread as sharedReportThread,
  type ListThreadsParams,
  type ListThreadsResult,
} from '@forumkit/shared';

// ListThreadsParams / ListThreadsResult now live in @forumkit/shared; re-exported
// here so existing `../api/threads` import sites keep working unchanged.
export type { ListThreadsParams, ListThreadsResult };

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

// Feed-subset endpoints delegate to the shared client; web signatures unchanged.
export function listThreads(forumId: string, token?: string, params?: ListThreadsParams): Promise<ListThreadsResult> {
  return sharedListThreads(API_BASE, forumId, token, params);
}

export function saveThread(forumId: string, threadId: string, token?: string): Promise<void> {
  return sharedSaveThread(API_BASE, forumId, threadId, token);
}

export function unsaveThread(forumId: string, threadId: string, token?: string): Promise<void> {
  return sharedUnsaveThread(API_BASE, forumId, threadId, token);
}

export function reportThread(forumId: string, threadId: string, reason: string, token?: string): Promise<void> {
  return sharedReportThread(API_BASE, forumId, threadId, reason, token);
}

// The rest stay local (not part of the migrated feed subset).

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

export async function deleteThread(forumId: string, threadId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
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
