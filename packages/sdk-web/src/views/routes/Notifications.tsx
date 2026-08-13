import { useEffect, useState } from 'react';
import type { Notification, NotificationType } from '@forumkit/types';
import Shell from '../components/layout/shell';
import Avatar from '../components/shared/avatar';
import Thumbnail from '../components/shared/thumbnail';
import PillButton from '../components/shared/pill-button';
import MascotIcon from '../components/layout/mascot-icon';
import {
  ChevronLeftIcon, UpvoteIcon, DownvoteIcon, CommentIcon, ShareIcon, ReportIcon,
} from '../components/shared/icons';
import { fmtRelativeTime } from '../lib/format-time';
import { authorAvatar } from '../lib/author-avatar';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import { useForum } from '../hooks/use-forum-state';
import { useInfiniteScroll } from '../hooks/use-infinite-scroll';
// Reuses the top-nav search dropdown's status/divider classes, the feed
// post-card's "text left, thumbnail right" row shape (fk-post-card-row
// etc.), and the profile activity feed's "on {thread title}" context line
// (fk-profile-comment-card-context/-thread-title) rather than three
// parallel stylesheets — only the badge/facepile/title-color rules below
// are new.
import '../components/layout/search-results-dropdown.css';
import '../components/feed/post-card.css';
import '../components/profile/profile-comment-card.css';
import './profile.css';
import './notifications.css';

const PAGE_SIZE = 20;

// Builds the human-readable line for a notification row from its type +
// (for 'vote') the message field carrying direction. commentId set on a
// 'vote'/'report' notification means it targets a comment, not the thread.
function describe(n: Notification): string {
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

// Icon + accent color for the small corner badge — everything except
// 'share' (which gets its own facepile treatment, see AvatarCluster below)
// and 'vote' (which splits into up/down based on the message field, not
// just the type) maps directly.
// Deliberately distinct, saturated hues per type (not just the existing
// --up/--down tokens reused everywhere else) so the badges read as a clear
// color-coded system at a glance rather than everything blurring into the
// same one or two accent colors.
const TYPE_BADGE: Partial<Record<NotificationType, { Icon: typeof CommentIcon; color: string }>> = {
  comment_reply: { Icon: CommentIcon, color: '#3f7ee2' },  // blue
  share: { Icon: ShareIcon, color: '#2ec16a' },             // green
  report: { Icon: ReportIcon, color: '#ef4444' },           // red
};

function getBadge(n: Notification): { Icon: typeof CommentIcon; color: string } {
  if (n.type === 'vote') {
    return n.message === 'down'
      ? { Icon: DownvoteIcon, color: '#a855f7' }  // purple
      : { Icon: UpvoteIcon, color: '#f0521f' };   // orange
  }
  return TYPE_BADGE[n.type] ?? { Icon: CommentIcon, color: 'var(--accent)' };
}

// The avatar side of a notification row: for a share where the sharer isn't
// the thread's own author, overlaps the sharer's avatar with the thread
// author's (a small facepile) so the row reads "X shared Y's thread with
// you" at a glance — falls back to the plain icon-badge (same as every
// other type) when someone shares their own thread, since two identical
// overlapping avatars would look like a bug, not a feature.
function AvatarCluster({ n }: { n: Notification }) {
  const actorAvatarData = authorAvatar(n.actorId ?? undefined, n.actorDisplayName ?? 'Someone');

  const isSharedByOthers = n.type === 'share' && n.threadAuthorId && n.threadAuthorId !== n.actorId;
  if (isSharedByOthers) {
    const authorAvatarData = authorAvatar(n.threadAuthorId ?? undefined, n.threadAuthorDisplayName ?? 'Someone');
    return (
      <div className="fk-notification-facepile">
        <Avatar size={28} gradient={actorAvatarData.gradient} letter={actorAvatarData.letter} imageUrl={n.actorAvatarUrl} />
        <Avatar
          size={28}
          gradient={authorAvatarData.gradient}
          letter={authorAvatarData.letter}
          imageUrl={n.threadAuthorAvatarUrl}
          style={{ position: 'absolute', top: 14, left: 14, border: '2px solid var(--bg)' }}
        />
      </div>
    );
  }

  const badge = getBadge(n);
  return (
    <div className="fk-notification-avatar-wrap">
      <Avatar size={36} gradient={actorAvatarData.gradient} letter={actorAvatarData.letter} imageUrl={n.actorAvatarUrl} />
      <span className="fk-notification-badge" style={{ background: badge.color }}>
        <badge.Icon size={11} />
      </span>
    </div>
  );
}

function NotificationRow({ n, onOpen }: { n: Notification; onOpen: () => void }) {
  const unread = !n.readAt;
  return (
    <div className="fk-search-results-person-row">
      <button
        type="button"
        className={`fk-search-dropdown-row fk-search-results-row fk-notification-row${unread ? ' fk-search-dropdown-row--unread' : ''}`}
        onClick={onOpen}
      >
        <AvatarCluster n={n} />
        <div className="fk-post-card-row" style={{ flex: 1, minWidth: 0 }}>
          <div className="fk-post-card-row-text">
            <span className="fk-notification-title">{describe(n)}</span>
            {n.threadTitle && (
              <div className="fk-profile-comment-card-context" style={{ marginTop: 3, marginBottom: 0 }}>
                on <span className="fk-profile-comment-card-thread-title">{n.threadTitle}</span>
              </div>
            )}
            <span className="fk-search-dropdown-row-snippet">{fmtRelativeTime(n.createdAt)}</span>
          </div>
          {n.threadTitle && (
            <div className="fk-post-card-row-img">
              <Thumbnail gradient="linear-gradient(135deg,#3f7ee2,#7b5cff)" imageUrl={n.threadImageUrl} width={64} height={64} radius={12} />
            </div>
          )}
        </div>
      </button>
      <div className="fk-post-card-divider" />
    </div>
  );
}

/**
 * Reached via the top-nav bell. Paginated, newest-first list of everything
 * that's ever notified this user (read rows stay visible, just un-highlighted
 * — same "read inbox" convention as email). Clicking a row is a combined
 * mark-read + navigate action, mirroring how opening a thread elsewhere in
 * the app is a single click too.
 */
export function Notifications() {
  const { state, goBack, openThread, forumId: fid, sessionToken: token, refreshUnreadCount } = useForum();

  const [items, setItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fid) return;
    setLoading(true);
    listNotifications(fid, { page: 1, limit: PAGE_SIZE }, token)
      .then(r => { setItems(r.results); setTotal(r.total); setPage(1); })
      .catch(() => { setItems([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [fid, token]);

  const hasMore = items.length < total;
  const sentinelRef = useInfiniteScroll(() => {
    if (!fid || loading) return;
    const nextPage = page + 1;
    setLoading(true);
    listNotifications(fid, { page: nextPage, limit: PAGE_SIZE }, token)
      .then(r => { setItems(prev => [...prev, ...r.results]); setTotal(r.total); setPage(nextPage); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, hasMore && !loading);

  async function handleOpen(n: Notification) {
    if (!fid) return;
    if (!n.readAt) {
      setItems(prev => prev.map(item => item.id === n.id ? { ...item, readAt: new Date() } : item));
      try {
        await markNotificationRead(fid, n.id, token);
      } catch {
        // Best-effort — the row still navigates even if the read-mark call fails.
      }
      refreshUnreadCount();
    }
    if (n.threadId) openThread(n.threadId);
  }

  async function handleMarkAllRead() {
    if (!fid) return;
    setItems(prev => prev.map(item => item.readAt ? item : { ...item, readAt: new Date() }));
    try {
      await markAllNotificationsRead(fid, token);
    } catch {
      // Best-effort, same as individual mark-read above.
    }
    refreshUnreadCount();
  }

  const hasUnread = items.some(n => !n.readAt);

  return (
    <Shell mainMaxWidth={700} mainAlign="start">
      <div className="fk-profile fk-notifications-left">
        {state.history.length > 0 && (
          <PillButton variant="surface" icon={<ChevronLeftIcon />} onClick={goBack} style={{ marginBottom: 14 }}>Back</PillButton>
        )}

        <div className="fk-profile-filter-row">
          <div className="fk-profile-filter-label">Notifications</div>
          {hasUnread && (
            <button type="button" className="fk-search-results-goto-link" onClick={handleMarkAllRead}>
              Mark all read
            </button>
          )}
        </div>

        {loading && items.length === 0 ? (
          <div className="fk-search-dropdown-status"><MascotIcon size={32} /></div>
        ) : items.length === 0 ? (
          <div className="fk-search-dropdown-status">No notifications yet</div>
        ) : (
          items.map(n => <NotificationRow key={n.id} n={n} onOpen={() => handleOpen(n)} />)
        )}

        {hasMore && <div ref={sentinelRef} />}
        {loading && items.length > 0 && (
          <div className="fk-search-dropdown-status"><MascotIcon size={32} /></div>
        )}
      </div>
    </Shell>
  );
}
