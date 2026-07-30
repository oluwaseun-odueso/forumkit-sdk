import type { Forum } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getForum(forumId: string, token?: string): Promise<Forum> {
  const res = await fetch(`${API_BASE}/forums/${forumId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Forum;
}
