import type { NotificationPrefs } from '@forumkit/types';

// The notification-preference rows (label + description + which are mod-only),
// shared by web + mobile. Lifted from sdk-web's notification-settings-modal.tsx.
export type NotificationPrefRow = {
  key: keyof NotificationPrefs;
  label: string;
  sub: string;
  modOnly?: boolean;
};

export const NOTIFICATION_PREF_ROWS: NotificationPrefRow[] = [
  { key: 'commentReply', label: 'Comment replies', sub: 'When someone replies to your comment' },
  { key: 'share', label: 'Shares', sub: 'When someone shares a post with you' },
  { key: 'vote', label: 'Upvotes & downvotes', sub: 'When someone votes on your post or comment' },
  { key: 'moderationReport', label: 'Moderation reports', sub: 'When a member reports a post or comment', modOnly: true },
];
