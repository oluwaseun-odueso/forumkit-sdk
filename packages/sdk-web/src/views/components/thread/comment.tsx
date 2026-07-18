import type { CommentNodeData, VoteDir } from '../../hooks/use-forum-state';
import VotePill from '../shared/vote-pill';
import './comment.css';

type CommentProps = {
  comment: CommentNodeData;
  depth?: number;
  collapsed: Record<number, boolean>;
  votes: Record<number, VoteDir>;
  onToggleCollapsed: (id: number) => void;
  onVote: (id: number, dir: VoteDir) => void;
};

/**
 * A single threaded comment, recursively rendering its replies inside a
 * "link chain" connector line with a +/− toggle sitting on the line itself.
 */
export default function Comment({ comment, depth = 0, collapsed, votes, onToggleCollapsed, onVote }: CommentProps) {
  const isCollapsed = collapsed[comment.id] ?? false;
  const size = depth === 0 ? 'md' : 'sm';

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
          <p className="fk-comment-body">{comment.body}</p>
          <div className="fk-comment-actions">
            <VotePill
              votes={comment.votes}
              dir={votes[comment.id] ?? 0}
              onVote={dir => onVote(comment.id, dir)}
              variant="inline"
              size="sm"
            />
            <span className="fk-comment-action">Reply</span>
            {depth === 0 && <span className="fk-comment-action">Share</span>}
          </div>

          {comment.replies.map(reply => (
            <Comment
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              collapsed={collapsed}
              votes={votes}
              onToggleCollapsed={onToggleCollapsed}
              onVote={onVote}
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
