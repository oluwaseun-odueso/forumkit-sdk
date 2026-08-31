import { useEffect, useState } from 'react';
import type { ModerationQueueItem } from '@forumkit/types';
import Shell from '../components/layout/shell';
import PillButton from '../components/shared/pill-button';
import MascotIcon from '../components/layout/mascot-icon';
import { ChevronLeftIcon, ShieldIcon, ReportIcon, CheckIcon, CloseIcon } from '../components/shared/icons';
import { fmtRelativeTime } from '../lib/format-time';
import { getModerationQueue, resolveModerationItem } from '../api/moderation';
import { useForum } from '../hooks/use-forum-state';
import { useInfiniteScroll } from '../hooks/use-infinite-scroll';
// Reuses Notifications' own header/status/card shapes (fk-notifications-*)
// rather than a parallel stylesheet — only the badge/row/action-button
// rules in moderation.css are new.
import './notifications.css';
import './profile.css';
import './moderation.css';

const PAGE_SIZE = 20;

// A row's source is whichever of the two fields the backend populated —
// reporterId for a user report, aiScore/aiFlags for an automated flag (see
// repositories/moderation.ts's insertReport vs insertAiFlag). Never both.
function ModerationBadge({ item }: { item: ModerationQueueItem }) {
  if (item.reporterId) {
    return (
      <span className="fk-moderation-badge fk-moderation-badge--report">
        <ReportIcon size={12} />
        Reported
      </span>
    );
  }
  return (
    <span className="fk-moderation-badge fk-moderation-badge--ai">
      <ShieldIcon size={12} />
      AI flagged {Math.round(item.aiScore * 100)}%
    </span>
  );
}

function ModerationRow({
  item, resolving, onOpen, onResolve,
}: {
  item: ModerationQueueItem;
  resolving: boolean;
  onOpen: () => void;
  onResolve: (action: 'approved' | 'removed') => void;
}) {
  return (
    <div className="fk-moderation-row">
      <button type="button" className="fk-moderation-row-main" onClick={onOpen}>
        <div className="fk-moderation-row-top">
          <ModerationBadge item={item} />
          <span className="fk-notification-time">{fmtRelativeTime(item.createdAt)}</span>
        </div>
        <span className="fk-moderation-row-thread">{item.threadTitle ?? 'Untitled thread'}</span>
        <span className="fk-moderation-row-body">
          {item.commentBody ?? 'The thread itself was reported.'}
        </span>
        {item.reason && <span className="fk-moderation-row-reason">“{item.reason}”</span>}
      </button>
      <div className="fk-moderation-row-actions">
        <button
          type="button"
          className="fk-moderation-action fk-moderation-action--approve"
          aria-label="Approve"
          disabled={resolving}
          onClick={(e) => { e.stopPropagation(); onResolve('approved'); }}
        >
          <CheckIcon size={16} />
        </button>
        <button
          type="button"
          className="fk-moderation-action fk-moderation-action--remove"
          aria-label="Remove"
          disabled={resolving}
          onClick={(e) => { e.stopPropagation(); onResolve('removed'); }}
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Reached via the account menu's "Moderation" entry (moderator/admin only —
 * see account-menu.tsx). Paginated, oldest-first queue of pending user
 * reports and AI-flagged content; one table serves both (see
 * ModerationBadge). Approve dismisses the flag with no other effect; Remove
 * hides the comment, or soft-deletes the thread for a thread-level report,
 * then dismisses the flag. Resolved items simply leave the list — there's
 * no separate "resolved" view.
 */
export function Moderation() {
  const {
    state, goBack, openThread, forumId: fid, sessionToken: token,
  } = useForum();

  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!fid) return;
    // Same StrictMode double-invoke guard as Notifications.tsx.
    let cancelled = false;
    setLoading(true);
    getModerationQueue({ page: 1, limit: PAGE_SIZE }, token)
      .then(r => { if (!cancelled) { setItems(r.items); setTotal(r.total); setPage(1); } })
      .catch(() => { if (!cancelled) { setItems([]); setTotal(0); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fid, token]);

  const hasMore = items.length < total;
  const sentinelRef = useInfiniteScroll(() => {
    if (!fid || loading) return;
    const nextPage = page + 1;
    setLoading(true);
    getModerationQueue({ page: nextPage, limit: PAGE_SIZE }, token)
      .then(r => { setItems(prev => [...prev, ...r.items]); setTotal(r.total); setPage(nextPage); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, hasMore && !loading);

  async function handleResolve(item: ModerationQueueItem, action: 'approved' | 'removed') {
    setResolvingId(item.id);
    try {
      await resolveModerationItem(item.id, action, token);
      setItems(prev => prev.filter(i => i.id !== item.id));
      setTotal(t => Math.max(0, t - 1));
    } catch {
      // Left in the list on failure so the moderator can retry — unlike
      // Notifications' read-state, a silently-failed approve/remove would
      // leave the queue looking resolved when it isn't.
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <Shell mainAlign="start">
      <div className="fk-profile fk-notifications-left">
        {state.history.length > 0 && (
          <PillButton variant="surface" icon={<ChevronLeftIcon />} onClick={goBack} style={{ marginBottom: 14 }}>Back</PillButton>
        )}

        <div className="fk-notifications-header">
          <h2 className="fk-notifications-heading">Moderation</h2>
        </div>

        {loading && items.length === 0 ? (
          <div className="fk-search-dropdown-status"><MascotIcon size={32} /></div>
        ) : items.length === 0 ? (
          <div className="fk-search-dropdown-status">Nothing pending review</div>
        ) : (
          <div className="fk-notifications-card">
            {items.map(item => (
              <ModerationRow
                key={item.id}
                item={item}
                resolving={resolvingId === item.id}
                onOpen={() => { if (item.threadId) openThread(item.threadId); }}
                onResolve={(action) => handleResolve(item, action)}
              />
            ))}
          </div>
        )}

        {hasMore && <div ref={sentinelRef} />}
        {loading && items.length > 0 && (
          <div className="fk-search-dropdown-status"><MascotIcon size={32} /></div>
        )}
      </div>
    </Shell>
  );
}
