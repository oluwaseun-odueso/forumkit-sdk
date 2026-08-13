import type { NotificationListResponse } from '@forumkit/types';

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type NotificationsOpts = { page?: number | undefined; limit?: number | undefined };

function buildQuery(opts?: NotificationsOpts): string {
  const qs = new URLSearchParams();
  if (opts?.page) qs.set('page', String(opts.page));
  if (opts?.limit) qs.set('limit', String(opts.limit));
  return qs.toString();
}

// GET /forums/:forumId/notifications
export async function listNotifications(
  forumId: string,
  opts?: NotificationsOpts,
  token?: string,
): Promise<NotificationListResponse> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/notifications?${buildQuery(opts)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as NotificationListResponse;
}

// GET /forums/:forumId/notifications/unread-count
export async function getUnreadCount(forumId: string, token?: string): Promise<number> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/notifications/unread-count`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { count: number };
  return body.count;
}

// PATCH /forums/:forumId/notifications/:id/read
export async function markNotificationRead(forumId: string, id: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// PATCH /forums/:forumId/notifications/read-all
export async function markAllNotificationsRead(forumId: string, token?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/forums/${forumId}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
