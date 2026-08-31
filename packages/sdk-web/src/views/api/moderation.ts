import {
  getModerationQueue as sharedGetModerationQueue,
  resolveModerationItem as sharedResolveModerationItem,
  type ModerationQueueResult,
} from '@forumkit/shared';

export type { ModerationQueueResult };

const API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

// Delegated to the shared client (signatures unchanged, minus apiUrl —
// the route itself has no forumId segment, unlike most of this directory's
// other wrappers).
export function getModerationQueue(
  params?: { page?: number; limit?: number },
  token?: string,
): Promise<ModerationQueueResult> {
  return sharedGetModerationQueue(API_BASE, params, token);
}

export function resolveModerationItem(
  itemId: string,
  action: 'approved' | 'removed',
  token?: string,
) {
  return sharedResolveModerationItem(API_BASE, itemId, action, token);
}
