import { UpvoteIcon, DownvoteIcon } from './icons';
import type { VoteDir } from '../../hooks/use-forum-state';
import type { VoteCounts } from '@forumkit/types';
import './vote-pill.css';

type VotePillProps = {
  voteCounts: VoteCounts;
  dir: VoteDir;
  onVote: (dir: VoteDir) => void;
  variant?: 'pill' | 'inline';
  size?: 'sm' | 'md';
};

/**
 * Upvote/downvote control shared by feed post cards, the thread head, and
 * comments. `variant="pill"` renders the surface-2 rounded-pill chrome used
 * on posts; `variant="inline"` renders bare arrows+count for comment rows.
 * Shows the up and down counts separately (each arrow gets its own adjacent
 * count) rather than collapsing to one net number.
 */
export default function VotePill({ voteCounts, dir, onVote, variant = 'pill', size = 'md' }: VotePillProps) {
  const iconSize = size === 'sm' ? 15 : 19;
  const content = (
    <>
      <span className="fk-vote-unit">
        <span
          role="button"
          tabIndex={0}
          aria-label="Upvote"
          onClick={() => onVote(1)}
          className={`fk-vote-btn fk-vote-btn--up${dir === 1 ? ' fk-vote-btn--active' : ''}`}
        >
          <UpvoteIcon size={iconSize} />
        </span>
        <span className={`fk-vote-count fk-vote-count--up${dir === 1 ? ' fk-vote-count--active' : ''}`}>{voteCounts.up}</span>
      </span>
      <span className="fk-vote-unit">
        <span
          role="button"
          tabIndex={0}
          aria-label="Downvote"
          onClick={() => onVote(-1)}
          className={`fk-vote-btn fk-vote-btn--down${dir === -1 ? ' fk-vote-btn--active' : ''}`}
        >
          <DownvoteIcon size={iconSize} />
        </span>
        <span className={`fk-vote-count fk-vote-count--down${dir === -1 ? ' fk-vote-count--active' : ''}`}>{voteCounts.down}</span>
      </span>
    </>
  );

  return variant === 'pill'
    ? <div className="fk-vote-pill">{content}</div>
    : <div className="fk-vote-inline">{content}</div>;
}
