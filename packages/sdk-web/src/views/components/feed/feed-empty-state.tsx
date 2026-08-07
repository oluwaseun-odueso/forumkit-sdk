import MascotIcon from '../layout/mascot-icon';
import type { FeedSort } from '../../hooks/use-forum-state';
import './feed-empty-state.css';

const SORT_COPY: Record<FeedSort, { title: string; description: string }> = {
  Best: {
    title: 'No posts yet',
    description: 'Once posts start getting activity, the best ones will show up here.',
  },
  Hot: {
    title: 'Nothing hot right now',
    description: 'Posts picking up activity will show up here as they heat up.',
  },
  New: {
    title: 'No posts yet',
    description: 'Be the first to start a discussion here.',
  },
  Top: {
    title: 'No top posts for this period',
    description: 'Try a different time window, or check back once posts have picked up votes.',
  },
  Rising: {
    title: 'Nothing rising right now',
    description: 'Posts gaining traction quickly will show up here.',
  },
};

type FeedEmptyStateProps = {
  sort: FeedSort;
};

export default function FeedEmptyState({ sort }: FeedEmptyStateProps) {
  const copy = SORT_COPY[sort];
  return (
    <div className="fk-feed-empty">
      <div className="fk-feed-empty-mascot">
        <MascotIcon size={120} variant="empty" />
      </div>
      <h2 className="fk-feed-empty-title">{copy.title}</h2>
      <p className="fk-feed-empty-desc">{copy.description}</p>
    </div>
  );
}
