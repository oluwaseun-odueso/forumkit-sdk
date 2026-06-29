import { votePillActive, votePillInactive } from '../styles/tokens';

type Props = {
  votes: number;
  voted: boolean;
  onUpvote: () => void;
};

export function UpvotePill({ votes, voted, onUpvote }: Props) {
  return (
    <button
      type="button"
      aria-label={voted ? `Remove upvote (${votes})` : `Upvote (${votes})`}
      aria-pressed={voted}
      onClick={onUpvote}
      style={{ ...( voted ? votePillActive : votePillInactive), border: 'none', outline: 'none' }}
    >
      <span style={{ fontSize: 11, lineHeight: 1 }}>↑</span>
      <span>Upvote</span>
      <span style={{ opacity: .55, fontWeight: 400 }}>·</span>
      <span>{votes}</span>
    </button>
  );
}
