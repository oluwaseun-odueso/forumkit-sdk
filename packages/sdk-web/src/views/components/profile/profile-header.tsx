import { CameraIcon } from '../shared/icons';
import './profile-header.css';

const USER_GRADIENT = 'radial-gradient(120% 95% at 30% 25%, #f0c9a8, #b97d52 68%, #6f4630)';

export default function ProfileHeader({ username, handle }: { username: string; handle: string }) {
  return (
    <div className="fk-profile-header">
      <div className="fk-profile-avatar-wrap">
        <div className="fk-profile-avatar" style={{ background: USER_GRADIENT }} />
        <button type="button" className="fk-profile-avatar-edit" aria-label="Edit avatar">
          <CameraIcon />
        </button>
      </div>
      <div className="fk-profile-header-labels">
        <h1 className="fk-profile-username">{username}</h1>
        <div className="fk-profile-handle">/{handle}</div>
      </div>
    </div>
  );
}
