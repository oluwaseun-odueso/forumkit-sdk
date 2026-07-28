import type { Post, ErrorResponse } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function unwrap(res: Response): Promise<Post> {
  if (!res.ok) {
    const message = await res
      .json()
      .then((data: ErrorResponse) => data.message)
      .catch(() => undefined);
    throw new Error(message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as Post;
}

export async function createReply(
  threadId: string,
  body: { body: string; parentPostId?: string; attachmentIds?: string[] },
  token?: string,
): Promise<Post> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return unwrap(res);
}

export async function updateReply(threadId: string, postId: string, body: string, token?: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/threads/${threadId}/posts/${postId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ body }),
  });
  return unwrap(res);
}
