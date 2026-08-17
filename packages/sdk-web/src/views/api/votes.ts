import type { VoteDirection } from '@forumkit/types';
import {
  voteOnThread as sharedVoteOnThread,
  removeVoteFromThread as sharedRemoveVoteFromThread,
  authHeaders,
  type VoteResult,
} from '@forumkit/shared';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

async function unwrap(res: Response): Promise<VoteResult> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as VoteResult;
}

// Thread votes delegate to the shared client (fetch logic lives once there);
// the web signatures are unchanged, so existing call sites are untouched.
export function voteOnThread(
  forumId: string,
  threadId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  return sharedVoteOnThread(API_BASE, forumId, threadId, direction, token);
}

export function removeVoteFromThread(forumId: string, threadId: string, token?: string): Promise<VoteResult> {
  return sharedRemoveVoteFromThread(API_BASE, forumId, threadId, token);
}

// Comment votes stay local for now (not part of the feed subset migrated to
// @forumkit/shared).
export async function voteOnComment(
  threadId: string,
  commentId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/comments/${commentId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ direction }),
  });
  return unwrap(res);
}

export async function removeVoteFromComment(threadId: string, commentId: string, token?: string): Promise<VoteResult> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/comments/${commentId}/vote`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return unwrap(res);
}
