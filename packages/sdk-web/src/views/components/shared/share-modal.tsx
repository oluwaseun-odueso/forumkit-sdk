import { useEffect, useState } from 'react';
import type { UserSearchResult } from '@forumkit/types';
import Modal from './modal';
import PillButton from './pill-button';
import Avatar from './avatar';
import { CloseIcon } from './icons';
import { authorAvatar } from '../../lib/author-avatar';
import { searchUsers } from '../../api/search';
import { useForum } from '../../hooks/use-forum-state';
// Reuses the drafts modal's header/close shell and the search dropdown's
// row styling (same convention as Notifications.tsx) rather than a
// parallel stylesheet.
import '../composer/drafts-list-modal.css';
import '../layout/search-results-dropdown.css';
import '../profile/edit-profile-modal.css';

const MAX_RECIPIENTS = 20;

/**
 * Member picker used by both platforms' Share flow: web reaches it via a
 * small "Share with a member" menu item (see the platform-branch in
 * post-card.tsx/thread-view.tsx/comment.tsx), native goes here directly
 * since there's no link option to offer inside a native app shell.
 * Search-as-you-type only (see plan's scope note) — there's no
 * "browse all members" backend endpoint to list from instead.
 */
export default function ShareModal({ onClose }: { onClose: () => void }) {
  const { forumId: fid, sessionToken: token, shareThreadWithMembers } = useForum();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q || !fid) { setResults([]); return; }
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchUsers(fid, q, { limit: 8 }, token)
        .then(r => setResults(r.results))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, fid, token]);

  function toggleSelected(user: UserSearchResult) {
    setSelected(prev => {
      if (prev.some(u => u.id === user.id)) return prev.filter(u => u.id !== user.id);
      if (prev.length >= MAX_RECIPIENTS) return prev;
      return [...prev, user];
    });
  }

  async function handleSubmit() {
    if (selected.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await shareThreadWithMembers(selected.map(u => u.id), message.trim() || undefined);
      setDone(true);
    } catch {
      setError('Could not share right now. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={480} minHeight={420} blurBackground>
      <div className="fk-drafts-modal-header">
        <h3 className="fk-drafts-modal-title">Share with a member</h3>
        <button type="button" className="fk-drafts-modal-close" onClick={onClose}>
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="fk-drafts-modal-body">
        {done ? (
          <div className="fk-drafts-modal-empty">
            <p>Shared with {selected.length} {selected.length === 1 ? 'person' : 'people'}.</p>
          </div>
        ) : (
          <>
            {selected.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {selected.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    className="fk-pill fk-pill--outline"
                    style={{ padding: '4px 10px', fontSize: 12.5 }}
                    onClick={() => toggleSelected(u)}
                  >
                    {u.displayName} <CloseIcon size={11} />
                  </button>
                ))}
              </div>
            )}

            <input
              className="fk-edit-modal-input"
              placeholder="Search for a member…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />

            <div style={{ marginTop: 8 }}>
              {loading && <div className="fk-search-dropdown-status">Searching…</div>}
              {!loading && query.trim() && results.length === 0 && (
                <div className="fk-search-dropdown-status">No matching members</div>
              )}
              {results.map(u => {
                const avatar = authorAvatar(u.id, u.displayName);
                const isSelected = selected.some(s => s.id === u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`fk-search-dropdown-row${isSelected ? ' fk-search-dropdown-row--unread' : ''}`}
                    onClick={() => toggleSelected(u)}
                  >
                    <Avatar size={30} gradient={avatar.gradient} letter={avatar.letter} imageUrl={u.avatarUrl} />
                    <span className="fk-search-dropdown-row-text">
                      <span className="fk-search-dropdown-row-title">{u.displayName}</span>
                    </span>
                    {isSelected && <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>✓</span>}
                  </button>
                );
              })}
            </div>

            <label className="fk-edit-modal-label" style={{ marginTop: 14, display: 'block' }}>
              Message (optional)
            </label>
            <textarea
              className="fk-edit-modal-textarea"
              rows={2}
              maxLength={500}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a short note…"
            />

            {error && <div className="fk-edit-modal-save-error">{error}</div>}

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <PillButton variant="accent" disabled={selected.length === 0 || submitting} onClick={handleSubmit}>
                {submitting ? 'Sharing…' : `Share${selected.length > 0 ? ` (${selected.length})` : ''}`}
              </PillButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
