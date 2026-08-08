import type {
  UserProfile, UpdateProfileBody, ProfileActivityItem,
  ProfileActivityScope, ProfileActivitySort, ProfileActivityContentType,
} from '@forumkit/types';

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

export async function updateThemePreference(
  forumId: string,
  themePreference: 'light' | 'dark' | null,
  token?: string,
): Promise<void> {
  await fetch(`${API_BASE}/forums/${forumId}/me/theme`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ themePreference }),
  });
}

export type ProfileActivityResult = { items: ProfileActivityItem[]; total: number; page: number; limit: number };

export async function getProfileActivity(
  forumId: string,
  scope: ProfileActivityScope,
  page: number,
  limit: number,
  sort: ProfileActivitySort,
  contentType: ProfileActivityContentType,
  token?: string,
): Promise<ProfileActivityResult> {
  const qs = new URLSearchParams({ scope, page: String(page), limit: String(limit), sort, contentType });
  const res = await fetch(`${API_BASE}/forums/${forumId}/me/activity?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ProfileActivityResult;
}

// Public-profile counterparts to getMyProfile/getProfileActivity above, for
// viewing an arbitrary member instead of yourself — same response shapes,
// different endpoint (GET /users/:userId instead of GET /me). 'saved' is
// intentionally not a valid ProfileActivityScope value to pass as scope
// here; the backend's publicActivityQuerySchema would 400 it anyway.
export async function getUserProfile(forumId: string, userId: string, token?: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/forums/${forumId}/users/${userId}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return null;
    return (await res.json()) as UserProfile;
  } catch {
    return null;
  }
}

export async function getUserActivity(
  forumId: string,
  userId: string,
  scope: ProfileActivityScope,
  page: number,
  limit: number,
  sort: ProfileActivitySort,
  contentType: ProfileActivityContentType,
  token?: string,
): Promise<ProfileActivityResult> {
  const qs = new URLSearchParams({ scope, page: String(page), limit: String(limit), sort, contentType });
  const res = await fetch(`${API_BASE}/forums/${forumId}/users/${userId}/activity?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ProfileActivityResult;
}
