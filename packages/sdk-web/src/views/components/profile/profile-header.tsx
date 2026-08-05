import { CameraIcon } from '../shared/icons';
import Avatar from '../shared/avatar';
import { authorAvatar } from '../../lib/author-avatar';
import './profile-header.css';

type ProfileHeaderProps = {
  username: string;
  handle: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  onEditAvatar: () => void;
};

export default function ProfileHeader({ username, handle, avatarUrl, bannerUrl, onEditAvatar }: ProfileHeaderProps) {
  const avatar = authorAvatar(handle, username);
  return (
    <div className="fk-profile-header">
      <div
        className="fk-profile-header-banner"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
      >
        <div className="fk-profile-avatar-wrap">
          <Avatar size={88} gradient={avatar.gradient} letter={avatar.letter} imageUrl={avatarUrl} style={{ borderRadius: '50%', border: '3px solid var(--surface)' }} />
          <button type="button" className="fk-profile-avatar-edit" aria-label="Edit avatar" onClick={onEditAvatar}>
            <CameraIcon />
          </button>
        </div>
      </div>
      <div className="fk-profile-header-labels">
        <h1 className="fk-profile-username">{username}</h1>
        <div className="fk-profile-handle">/{handle}</div>
      </div>
    </div>
  );
}
