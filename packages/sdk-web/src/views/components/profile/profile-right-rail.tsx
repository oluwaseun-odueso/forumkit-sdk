import PillButton from '../shared/pill-button';
import IconButton from '../shared/icon-button';
import { EllipsisIcon, ChevronRightIcon } from '../shared/icons';
import './profile-right-rail.css';

type ProfileRightRailProps = {
  username: string;
  handle: string;
  postKarma: number;
  commentKarma: number;
  cakeDay: string;
};

export default function ProfileRightRail({ username, handle, postKarma, commentKarma, cakeDay }: ProfileRightRailProps) {
  return (
    <aside className="fk-profile-rail">
      <div className="fk-profile-card fk-profile-card--identity">
        <div className="fk-profile-card-banner" />
        <div className="fk-profile-card-body">
          <div className="fk-profile-card-name">{username}</div>
          <div className="fk-profile-card-handle">/{handle}</div>
          <div className="fk-profile-stats">
            <div><div className="fk-profile-stat-value">{postKarma.toLocaleString()}</div><div className="fk-profile-stat-label">Post Karma</div></div>
            <div><div className="fk-profile-stat-value">{commentKarma.toLocaleString()}</div><div className="fk-profile-stat-label">Comment Karma</div></div>
            <div><div className="fk-profile-stat-value">{cakeDay}</div><div className="fk-profile-stat-label">Cake Day</div></div>
          </div>
          <div className="fk-profile-card-actions">
            <PillButton variant="accent" style={{ flex: 1, justifyContent: 'center' }}>Edit Profile</PillButton>
            <IconButton label="More options" size={42}><EllipsisIcon /></IconButton>
          </div>
        </div>
      </div>

      <div className="fk-profile-card">
        <div className="fk-profile-settings-title">SETTINGS</div>
        <button type="button" className="fk-profile-settings-row">
          <span>Profile moderation</span>
          <ChevronRightIcon size={18} />
        </button>
        <button type="button" className="fk-profile-settings-row">
          <span>Curate your profile</span>
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </aside>
  );
}
