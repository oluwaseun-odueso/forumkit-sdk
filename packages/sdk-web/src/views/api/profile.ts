import type {
  UserProfile, UpdateProfileBody,
  ProfileActivityScope, ProfileActivitySort, ProfileActivityContentType,
  NotificationPrefs,
} from '@forumkit/types';
import {
  getMyProfile as sharedGetMyProfile,
  updateMyProfile as sharedUpdateMyProfile,
  updateNotificationPrefs as sharedUpdateNotificationPrefs,
  getProfileActivity as sharedGetProfileActivity,
  type MyProfile,
  type ProfileActivityResult,
} from '@forumkit/shared';

// MyProfile + ProfileActivityResult now live in @forumkit/shared; re-exported
// here so existing `../api/profile` import sites keep working unchanged.
export type { MyProfile, ProfileActivityResult };

function getApiBase(): string {
  return typeof window !== 'undefined'
    ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
    : '';
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Delegated to the shared client (signature unchanged).
export function getMyProfile(forumId: string, token?: string): Promise<MyProfile | null> {
  return sharedGetMyProfile(getApiBase(), forumId, token);
}

export function updateMyProfile(forumId: string, body: UpdateProfileBody, token?: string): Promise<UserProfile> {
  return sharedUpdateMyProfile(getApiBase(), forumId, body, token);
}

export async function updateThemePreference(
  forumId: string,
  themePreference: 'light' | 'dark' | null,
  token?: string,
): Promise<void> {
  await fetch(`${getApiBase()}/forums/${forumId}/me/theme`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ themePreference }),
  });
}

export function updateNotificationPrefs(forumId: string, prefs: NotificationPrefs, token?: string): Promise<void> {
  return sharedUpdateNotificationPrefs(getApiBase(), forumId, prefs, token);
}

export function getProfileActivity(
  forumId: string,
  scope: ProfileActivityScope,
  page: number,
  limit: number,
  sort: ProfileActivitySort,
  contentType: ProfileActivityContentType,
  token?: string,
): Promise<ProfileActivityResult> {
  return sharedGetProfileActivity(getApiBase(), forumId, scope, page, limit, sort, contentType, token);
}

// Public-profile counterparts to getMyProfile/getProfileActivity above, for
// viewing an arbitrary member instead of yourself — same response shapes,
// different endpoint (GET /users/:userId instead of GET /me). 'saved' is
// intentionally not a valid ProfileActivityScope value to pass as scope
// here; the backend's publicActivityQuerySchema would 400 it anyway.
export async function getUserProfile(forumId: string, userId: string, token?: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${getApiBase()}/forums/${forumId}/users/${userId}`, {
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
  const res = await fetch(`${getApiBase()}/forums/${forumId}/users/${userId}/activity?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ProfileActivityResult;
}
