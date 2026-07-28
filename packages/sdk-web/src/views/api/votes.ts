import type { VoteCounts, VoteDirection } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type VoteResult = { voteCounts: VoteCounts; myVote: VoteDirection | null };

async function unwrap(res: Response): Promise<VoteResult> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as VoteResult;
}

export async function voteOnThread(
  forumId: string,
  threadId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ direction }),
  });
  return unwrap(res);
}

export async function removeVoteFromThread(forumId: string, threadId: string, token?: string): Promise<VoteResult> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/threads/${threadId}/vote`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  return unwrap(res);
}

export async function voteOnPost(
  threadId: string,
  postId: string,
  direction: VoteDirection,
  token?: string,
): Promise<VoteResult> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/posts/${postId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ direction }),
  });
  return unwrap(res);
}

export async function removeVoteFromPost(threadId: string, postId: string, token?: string): Promise<VoteResult> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/posts/${postId}/vote`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  return unwrap(res);
}
