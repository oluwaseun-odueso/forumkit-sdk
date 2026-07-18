import MascotIcon from '../layout/mascot-icon';
import PillButton from '../shared/pill-button';
import './profile-empty-state.css';

type ProfileEmptyStateProps = {
  onUpdateSettings: () => void;
};

export default function ProfileEmptyState({ onUpdateSettings }: ProfileEmptyStateProps) {
  return (
    <div className="fk-profile-empty">
      <div className="fk-profile-empty-mascot">
        <MascotIcon size={120} variant="empty" />
      </div>
      <h2 className="fk-profile-empty-title">You don&apos;t have any posts yet</h2>
      <p className="fk-profile-empty-desc">
        Once you post to a community, it&apos;ll show up here. If you&apos;d rather hide your posts, update your settings.
      </p>
      <PillButton variant="ghost" onClick={onUpdateSettings} style={{ background: 'var(--text)', color: 'var(--bg)' }}>
        Update Settings
      </PillButton>
    </div>
  );
}
