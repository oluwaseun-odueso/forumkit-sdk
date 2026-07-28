import { useState } from 'react';
import type { CommentNodeData, VoteDir } from '../../hooks/use-forum-state';
import VotePill from '../shared/vote-pill';
import './comment.css';

type CommentProps = {
  comment: CommentNodeData;
  depth?: number;
  collapsed: Record<string, boolean>;
  currentUserId: string | null;
  onToggleCollapsed: (id: string) => void;
  onVote: (id: string, dir: VoteDir) => void;
  onReply: (parentId: string, body: string) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<void>;
};

/**
 * A single threaded comment, recursively rendering its replies inside a
 * "link chain" connector line with a +/− toggle sitting on the line itself.
 */
export default function Comment({
  comment, depth = 0, collapsed, currentUserId, onToggleCollapsed, onVote, onReply, onEdit,
}: CommentProps) {
  const isCollapsed = collapsed[comment.id] ?? false;
  const size = depth === 0 ? 'md' : 'sm';
  const isMine = currentUserId !== null && comment.authorId === currentUserId;

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(comment.body);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function handleSubmitReply() {
    const body = replyText.trim();
    if (!body || replySubmitting) return;
    setReplySubmitting(true);
    setReplyError(null);
    try {
      await onReply(comment.id, body);
      setReplyText('');
      setReplyOpen(false);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setReplySubmitting(false);
    }
  }

  async function handleSaveEdit() {
    const body = editText.trim();
    if (!body || editSubmitting) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await onEdit(comment.id, body);
      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className={`fk-comment fk-comment--${size}`}>
      <div className="fk-comment-head">
        <div className="fk-comment-avatar" style={{ background: `linear-gradient(135deg,#8360c3,#2ebf91)` }} />
        <span className="fk-comment-author">{comment.author}</span>
        <span className="fk-comment-time">· {comment.time}</span>
        {isCollapsed && (
          <>
            <button
              type="button"
              className="fk-comment-toggle fk-comment-toggle--inline"
              aria-label="Expand comment"
              onClick={() => onToggleCollapsed(comment.id)}
            >
              <PlusMark />
            </button>
            <span className="fk-comment-collapsed-label">collapsed</span>
          </>
        )}
      </div>

      {!isCollapsed && (
        <div className="fk-comment-thread">
          <button
            type="button"
            className="fk-comment-toggle fk-comment-toggle--onLine"
            aria-label="Collapse comment"
            onClick={() => onToggleCollapsed(comment.id)}
          >
            <MinusMark />
          </button>

          {editOpen ? (
            <div className="fk-comment-edit">
              <textarea
                className="fk-comment-edit-input"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={3}
              />
              {editError && <p className="fk-comment-error">{editError}</p>}
              <div className="fk-comment-edit-actions">
                <button type="button" className="fk-comment-action" onClick={handleSaveEdit} disabled={editSubmitting}>
                  {editSubmitting ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  className="fk-comment-action"
                  onClick={() => { setEditOpen(false); setEditText(comment.body); setEditError(null); }}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="fk-comment-body">{comment.body}</p>
          )}

          <div className="fk-comment-actions">
            <VotePill
              votes={comment.votes}
              dir={comment.myVote ?? 0}
              onVote={dir => onVote(comment.id, dir)}
              variant="inline"
              size="sm"
            />
            <button type="button" className="fk-comment-action" onClick={() => setReplyOpen(o => !o)}>Reply</button>
            {isMine && !editOpen && (
              <button type="button" className="fk-comment-action" onClick={() => setEditOpen(true)}>Edit</button>
            )}
            {depth === 0 && <span className="fk-comment-action">Share</span>}
          </div>

          {replyOpen && (
            <div className="fk-comment-reply">
              <input
                className="fk-comment-reply-input"
                placeholder={`Reply to ${comment.author}`}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleSubmitReply(); }}
              />
              {replyError && <p className="fk-comment-error">{replyError}</p>}
              <div className="fk-comment-edit-actions">
                <button type="button" className="fk-comment-action" onClick={handleSubmitReply} disabled={replySubmitting}>
                  {replySubmitting ? 'Posting…' : 'Reply'}
                </button>
                <button
                  type="button"
                  className="fk-comment-action"
                  onClick={() => { setReplyOpen(false); setReplyText(''); setReplyError(null); }}
                  disabled={replySubmitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {comment.replies.map(reply => (
            <Comment
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              collapsed={collapsed}
              currentUserId={currentUserId}
              onToggleCollapsed={onToggleCollapsed}
              onVote={onVote}
              onReply={onReply}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlusMark() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}

function MinusMark() {
  return (
    <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  );
}
