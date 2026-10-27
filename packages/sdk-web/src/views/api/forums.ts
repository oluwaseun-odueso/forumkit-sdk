import type { Forum } from '@forumkit/types';
import { authedFetch } from '@forumkit/shared';

function getApiBase(): string {
  return typeof window !== 'undefined'
    ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
    : '';
}

export async function getForum(forumId: string, token?: string): Promise<Forum> {
  const res = await authedFetch(`${getApiBase()}/forums/${forumId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }, token);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Forum;
}
