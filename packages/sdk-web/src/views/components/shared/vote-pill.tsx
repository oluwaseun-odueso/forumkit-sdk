import { UpvoteIcon, DownvoteIcon } from './icons';
import type { VoteDir } from '../../hooks/use-forum-state';
import './vote-pill.css';

type VotePillProps = {
  votes: number;
  dir: VoteDir;
  onVote: (dir: VoteDir) => void;
  variant?: 'pill' | 'inline';
  size?: 'sm' | 'md';
};

/**
 * Upvote/downvote control shared by feed post cards, the thread head, and
 * comments. `variant="pill"` renders the surface-2 rounded-pill chrome used
 * on posts; `variant="inline"` renders bare arrows+count for comment rows.
 */
export default function VotePill({ votes, dir, onVote, variant = 'pill', size = 'md' }: VotePillProps) {
  const iconSize = size === 'sm' ? 15 : 19;
  const content = (
    <>
      <span
        role="button"
        tabIndex={0}
        aria-label="Upvote"
        onClick={() => onVote(1)}
        className={`fk-vote-btn fk-vote-btn--up${dir === 1 ? ' fk-vote-btn--active' : ''}`}
      >
        <UpvoteIcon size={iconSize} />
      </span>
      <span className={`fk-vote-count${dir !== 0 ? ` fk-vote-count--${dir === 1 ? 'up' : 'down'}` : ''}`}>{votes}</span>
      <span
        role="button"
        tabIndex={0}
        aria-label="Downvote"
        onClick={() => onVote(-1)}
        className={`fk-vote-btn fk-vote-btn--down${dir === -1 ? ' fk-vote-btn--active' : ''}`}
      >
        <DownvoteIcon size={iconSize} />
      </span>
    </>
  );

  return variant === 'pill'
    ? <div className="fk-vote-pill">{content}</div>
    : <div className="fk-vote-inline">{content}</div>;
}
