import type { UserProfile, UpdateProfileBody } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getMyProfile(forumId: string, token?: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/forums/${forumId}/me`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    return (await res.json()) as UserProfile;
  } catch {
    return null;
  }
}

export async function updateMyProfile(
  forumId: string,
  body: UpdateProfileBody,
  token?: string,
): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(data.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as UserProfile;
}
