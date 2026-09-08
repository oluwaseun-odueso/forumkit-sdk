import { profileEmptyCopy } from '@forumkit/shared';
import MascotIcon from '../layout/mascot-icon';
import './profile-empty-state.css';

type ProfileEmptyStateProps = {
  tab: string;
};

export default function ProfileEmptyState({ tab }: ProfileEmptyStateProps) {
  const copy = profileEmptyCopy(tab);

  return (
    <div className="fk-profile-empty">
      <div className="fk-profile-empty-mascot">
        <MascotIcon size={120} variant="empty" />
      </div>
      <h2 className="fk-profile-empty-title">{copy.title}</h2>
      <p className="fk-profile-empty-desc">{copy.description}</p>
    </div>
  );
}
