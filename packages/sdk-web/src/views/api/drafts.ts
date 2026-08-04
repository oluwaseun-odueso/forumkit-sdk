import type { Draft, DraftContent } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function throwOnError(res: Response): Promise<void> {
  if (res.ok) return;
  const data = await res.json().catch(() => ({})) as { message?: string };
  throw new Error(data.message ?? `HTTP ${res.status}`);
}

export async function listDrafts(forumId: string, token?: string): Promise<Draft[]> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/drafts`, {
    headers: authHeaders(token),
  });
  await throwOnError(res);
  const data = (await res.json()) as { drafts: Draft[] };
  return data.drafts;
}

export async function getDraft(forumId: string, draftId: string, token?: string): Promise<Draft> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/drafts/${draftId}`, {
    headers: authHeaders(token),
  });
  await throwOnError(res);
  return (await res.json()) as Draft;
}

export async function createDraft(
  forumId: string,
  title: string,
  content: DraftContent,
  token?: string,
): Promise<Draft> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ title, content }),
  });
  await throwOnError(res);
  return (await res.json()) as Draft;
}

export async function updateDraft(
  forumId: string,
  draftId: string,
  fields: { title?: string; content?: DraftContent },
  token?: string,
): Promise<Draft> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/drafts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(fields),
  });
  await throwOnError(res);
  return (await res.json()) as Draft;
}

export async function deleteDraft(forumId: string, draftId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/drafts/${draftId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  await throwOnError(res);
}
