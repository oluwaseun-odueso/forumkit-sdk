import { useEffect, useState } from 'react';
import type { Notification } from '@forumkit/types';
import Shell from '../components/layout/shell';
import Avatar from '../components/shared/avatar';
import PillButton from '../components/shared/pill-button';
import MascotIcon from '../components/layout/mascot-icon';
import { ChevronLeftIcon } from '../components/shared/icons';
import { fmtRelativeTime } from '../lib/format-time';
import { authorAvatar } from '../lib/author-avatar';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import { useForum } from '../hooks/use-forum-state';
import { useInfiniteScroll } from '../hooks/use-infinite-scroll';
// Reuses the top-nav search dropdown's row/status classes (same convention
// SearchResults.tsx already established for a full-page list built out of
// dropdown-style rows) rather than a parallel notifications-specific
// stylesheet — only the unread-state modifier is new (added there, not here).
import '../components/layout/search-results-dropdown.css';
import '../components/feed/post-card.css';
import './profile.css';

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

function NotificationRow({ n, onOpen }: { n: Notification; onOpen: () => void }) {
  const avatar = authorAvatar(n.actorId ?? undefined, n.actorDisplayName ?? 'Someone');
  const unread = !n.readAt;
  return (
    <div className="fk-search-results-person-row">
      <button
        type="button"
        className={`fk-search-dropdown-row fk-search-results-row${unread ? ' fk-search-dropdown-row--unread' : ''}`}
        onClick={onOpen}
      >
        <Avatar size={36} gradient={avatar.gradient} letter={avatar.letter} imageUrl={n.actorAvatarUrl} />
        <span className="fk-search-dropdown-row-text">
          <span className="fk-search-dropdown-row-title">{describe(n)}</span>
          <span className="fk-search-dropdown-row-snippet">{fmtRelativeTime(n.createdAt)}</span>
        </span>
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
    <Shell mainMaxWidth={700}>
      <div className="fk-profile">
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
