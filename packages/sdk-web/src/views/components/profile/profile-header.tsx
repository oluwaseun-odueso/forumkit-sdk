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
  onEditBanner: () => void;
};

export default function ProfileHeader({ username, handle, avatarUrl, bannerUrl, onEditAvatar, onEditBanner }: ProfileHeaderProps) {
  const avatar = authorAvatar(handle, username);
  return (
    <div className="fk-profile-header">
      <div
        className="fk-profile-header-banner"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
      >
        <button type="button" className="fk-profile-change-banner" onClick={onEditBanner}>
          <CameraIcon size={13} />
          Change Banner
        </button>
        <div className="fk-profile-avatar-wrap">
          <Avatar size={150} gradient={avatar.gradient} letter={avatar.letter} imageUrl={avatarUrl} style={{ borderRadius: '50%', border: '3px solid var(--surface)' }} />
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
