import type { Notification } from '@forumkit/types';

// Per-type notification text, shared by web and mobile. Lifted from sdk-web's
// Notifications.tsx `describe()`.
export function describeNotification(n: Notification): string {
  const actor = n.actorDisplayName ?? 'Someone';
  switch (n.type) {
    case 'share':
      return `${actor} shared a post with you`;
    case 'comment_reply':
      return `${actor} replied to your comment`;
    case 'vote': {
      const verb = n.message === 'down' ? 'downvoted' : 'upvoted';
      const target = n.commentId ? 'your comment' : 'your thread';
      return `${actor} ${verb} ${target}`;
    }
    case 'report':
      return `${actor} reported ${n.commentId ? 'a comment' : 'a thread'}`;
    default:
      return `${actor} did something`;
  }
}
