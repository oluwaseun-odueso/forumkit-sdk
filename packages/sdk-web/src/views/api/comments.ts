import type { Comment, ErrorResponse } from '@forumkit/types';
import {
  createReply as sharedCreateReply,
  saveComment as sharedSaveComment,
  unsaveComment as sharedUnsaveComment,
  reportComment as sharedReportComment,
  type CreateReplyBody,
} from '@forumkit/shared';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function unwrap(res: Response): Promise<Comment> {
  if (!res.ok) {
    const message = await res
      .json()
      .then((data: ErrorResponse) => data.message)
      .catch(() => undefined);
    throw new Error(message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as Comment;
}

// Delegated to the shared client (signatures unchanged).
export function createReply(threadId: string, body: CreateReplyBody, token?: string): Promise<Comment> {
  return sharedCreateReply(API_BASE, threadId, body, token);
}

export function saveComment(threadId: string, commentId: string, token?: string): Promise<void> {
  return sharedSaveComment(API_BASE, threadId, commentId, token);
}

export function unsaveComment(threadId: string, commentId: string, token?: string): Promise<void> {
  return sharedUnsaveComment(API_BASE, threadId, commentId, token);
}

export function reportComment(threadId: string, commentId: string, reason: string, token?: string): Promise<void> {
  return sharedReportComment(API_BASE, threadId, commentId, reason, token);
}

// The rest stay local (not part of the migrated subset).
export async function updateReply(threadId: string, commentId: string, body: string, token?: string): Promise<Comment> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ body }),
  });
  return unwrap(res);
}

export async function deleteComment(threadId: string, commentId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function acceptAnswer(threadId: string, commentId: string, token?: string): Promise<Comment> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/comments/${commentId}/accept`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  return unwrap(res);
}

export async function unacceptAnswer(threadId: string, commentId: string, token?: string): Promise<Comment> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/comments/${commentId}/accept`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return unwrap(res);
}
