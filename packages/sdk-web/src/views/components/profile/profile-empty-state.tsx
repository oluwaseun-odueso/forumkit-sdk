import MascotIcon from '../layout/mascot-icon';
import PillButton from '../shared/pill-button';
import './profile-empty-state.css';

type ProfileEmptyStateProps = {
  tab: string;
  onUpdateSettings: () => void;
};

const DEFAULT_EMPTY_STATE_COPY = {
  title: 'You don’t have any activity yet',
  description: 'Once you post, comment, or vote, it’ll show up here. If you’d rather hide your activity, update your settings.',
};

const EMPTY_STATE_COPY: Record<string, { title: string; description: string }> = {
  Overview: {
    title: 'You don’t have any activity yet',
    description: 'Once you post, comment, or vote, it’ll show up here. If you’d rather hide your activity, update your settings.',
  },
  Posts: {
    title: 'You don’t have any posts yet',
    description: 'Once you post to a community, it’ll show up here. If you’d rather hide your posts, update your settings.',
  },
  Comments: {
    title: 'You don’t have any comments yet',
    description: 'Once you comment on a post, it’ll show up here. If you’d rather hide your comments, update your settings.',
  },
  Saved: {
    title: 'Looks like you haven’t saved anything yet',
    description: 'Save posts and comments to find them here later.',
  },
  Upvoted: {
    title: 'Looks like you haven’t upvoted anything yet',
    description: 'Posts and comments you upvote will show up here.',
  },
  Downvoted: {
    title: 'Looks like you haven’t downvoted anything yet',
    description: 'Posts and comments you downvote will show up here.',
  },
};

export default function ProfileEmptyState({ tab, onUpdateSettings }: ProfileEmptyStateProps) {
  const copy = EMPTY_STATE_COPY[tab] ?? DEFAULT_EMPTY_STATE_COPY;

  return (
    <div className="fk-profile-empty">
      <div className="fk-profile-empty-mascot">
        <MascotIcon size={120} variant="empty" />
      </div>
      <h2 className="fk-profile-empty-title">{copy.title}</h2>
      <p className="fk-profile-empty-desc">{copy.description}</p>
      <PillButton variant="ghost" onClick={onUpdateSettings} style={{ background: 'var(--text)', color: 'var(--bg)' }}>
        Update Settings
      </PillButton>
    </div>
  );
}
