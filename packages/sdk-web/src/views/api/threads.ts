import type { CreateThreadBody, UpdateThreadBody, Thread, RelatedThreadForRail } from '@forumkit/types';
import {
  listThreads as sharedListThreads,
  saveThread as sharedSaveThread,
  unsaveThread as sharedUnsaveThread,
  reportThread as sharedReportThread,
  getThread as sharedGetThread,
  createThread as sharedCreateThread,
  updateThread as sharedUpdateThread,
  deleteThread as sharedDeleteThread,
  shareThreadWithUsers as sharedShareThreadWithUsers,
  type ListThreadsParams,
  type ListThreadsResult,
  type GetThreadResult,
} from '@forumkit/shared';

// ListThreadsParams / ListThreadsResult / GetThreadResult live in
// @forumkit/shared; re-exported so existing `../api/threads` imports keep working.
export type { ListThreadsParams, ListThreadsResult, GetThreadResult };

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Delegated to the shared client; web signatures unchanged.
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

export function getThread(forumId: string, threadId: string, token?: string): Promise<GetThreadResult> {
  return sharedGetThread(API_BASE, forumId, threadId, token);
}

export function createThread(forumId: string, body: CreateThreadBody, token?: string): Promise<Thread> {
  return sharedCreateThread(API_BASE, forumId, body, token);
}

export function updateThread(forumId: string, threadId: string, body: UpdateThreadBody, token?: string): Promise<Thread> {
  return sharedUpdateThread(API_BASE, forumId, threadId, body, token);
}

export function deleteThread(forumId: string, threadId: string, token?: string): Promise<void> {
  return sharedDeleteThread(API_BASE, forumId, threadId, token);
}

export function shareThreadWithUsers(
  forumId: string,
  threadId: string,
  recipientUserIds: string[],
  message: string | undefined,
  token?: string,
): Promise<void> {
  return sharedShareThreadWithUsers(API_BASE, forumId, threadId, recipientUserIds, message, token);
}

// Stays local (not part of the shared subset).
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
