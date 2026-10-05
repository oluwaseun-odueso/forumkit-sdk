import type { NotificationListResponse } from '@forumkit/types';
import {
  listNotifications as sharedListNotifications,
  markNotificationRead as sharedMarkNotificationRead,
  markAllNotificationsRead as sharedMarkAllNotificationsRead,
  deleteNotification as sharedDeleteNotification,
  authHeaders,
  type NotificationsOpts,
} from '@forumkit/shared';

export type { NotificationsOpts };

function getApiBase(): string {
  return typeof window !== 'undefined'
    ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
    : '';
}

// Delegated to the shared client (signatures unchanged).
export function listNotifications(
  forumId: string,
  opts?: NotificationsOpts,
  token?: string,
): Promise<NotificationListResponse> {
  return sharedListNotifications(getApiBase(), forumId, opts, token);
}

export function markNotificationRead(forumId: string, id: string, token?: string): Promise<void> {
  return sharedMarkNotificationRead(getApiBase(), forumId, id, token);
}

export function markAllNotificationsRead(forumId: string, token?: string): Promise<void> {
  return sharedMarkAllNotificationsRead(getApiBase(), forumId, token);
}

// The rest stay local (not part of the migrated subset).
// GET /forums/:forumId/notifications/unread-count
export async function getUnreadCount(forumId: string, token?: string): Promise<number> {
  const res = await fetch(`${getApiBase()}/forums/${forumId}/notifications/unread-count`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { count: number };
  return body.count;
}

export function deleteNotification(forumId: string, id: string, token?: string): Promise<void> {
  return sharedDeleteNotification(getApiBase(), forumId, id, token);
}
