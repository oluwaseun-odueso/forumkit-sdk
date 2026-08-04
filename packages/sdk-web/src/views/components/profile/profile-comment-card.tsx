import type { Comment } from '@forumkit/types';
import { UpvoteIcon } from '../shared/icons';
import RenderedBody from '../shared/rendered-body';
import './profile-comment-card.css';

type ProfileCommentCardProps = {
  comment: Comment;
  threadTitle: string;
  replyingTo?: { author: string; snippet: string } | undefined;
  onOpen: () => void;
};

function fmtRelativeTime(iso: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * A read-only activity-feed entry for a comment — not the full in-thread
 * Comment component (no reply/edit/collapse, no embedded reply tree). Full
 * interaction lives one click away in the real thread view; this is just
 * enough context to recognise the comment and where it came from.
 */
export default function ProfileCommentCard({ comment, threadTitle, replyingTo, onOpen }: ProfileCommentCardProps) {
  const voteCounts = comment.voteCounts ?? { up: 0, down: 0 };
  const netVotes = voteCounts.up - voteCounts.down;

  return (
    <article className="fk-profile-comment-card" onClick={onOpen}>
      <div className="fk-profile-comment-card-head">
        <span className="fk-profile-comment-card-author">{comment.authorDisplayName ?? 'Member'}</span>
        <span className="fk-profile-comment-card-time">· {fmtRelativeTime(comment.createdAt)}</span>
      </div>
      <div className="fk-profile-comment-card-context">
        Commented on <span className="fk-profile-comment-card-thread-title">{threadTitle}</span>
      </div>
      {replyingTo && (
        <div className="fk-profile-comment-card-replying-to">
          Replying to <strong>{replyingTo.author}</strong>: “{replyingTo.snippet}”
        </div>
      )}
      <RenderedBody body={comment.body} className="fk-profile-comment-card-body" />
      <div className="fk-profile-comment-card-stats">
        <span><UpvoteIcon size={13} />{netVotes}</span>
      </div>
    </article>
  );
}
