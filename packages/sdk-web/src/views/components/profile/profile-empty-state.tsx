import { profileEmptyCopy } from '@forumkit/shared';
import MascotIcon from '../layout/mascot-icon';
import PillButton from '../shared/pill-button';
import './profile-empty-state.css';

type ProfileEmptyStateProps = {
  tab: string;
  onUpdateSettings: () => void;
};

export default function ProfileEmptyState({ tab, onUpdateSettings }: ProfileEmptyStateProps) {
  const copy = profileEmptyCopy(tab);

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
