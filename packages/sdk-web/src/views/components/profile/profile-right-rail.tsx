import { useState } from 'react';
import { useForum } from '../../hooks/use-forum-state';
import type { SocialLink } from '../../hooks/use-forum-state';
import PillButton from '../shared/pill-button';
import IconButton from '../shared/icon-button';
import {
  EllipsisIcon, ExternalLinkIcon,
  GitHubIcon, LinkedInIcon, TwitterXIcon, BehanceIcon, DribbbleIcon, GlobeIcon, LinkIcon,
} from '../shared/icons';
import EditProfileModal from './edit-profile-modal';
import './profile-right-rail.css';

type ProfileRightRailProps = {
  username: string;
  handle: string;
  postKarma: number;
  commentKarma: number;
  cakeDay: string;
};

const PLATFORM_ICON: Record<SocialLink['platform'], React.ComponentType<{ size?: number }>> = {
  'Website':   GlobeIcon,
  'Portfolio': GlobeIcon,
  'GitHub':    GitHubIcon,
  'LinkedIn':  LinkedInIcon,
  'Twitter/X': TwitterXIcon,
  'Behance':   BehanceIcon,
  'Dribbble':  DribbbleIcon,
  'Other':     LinkIcon,
};

function cleanUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export default function ProfileRightRail({ username, handle, postKarma, commentKarma, cakeDay }: ProfileRightRailProps) {
  const { state, saveProfile } = useForum();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { socialLinks, displayName, bio, avatarUrl, bannerUrl } = state.profile;

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
            <PillButton variant="accent" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditModalOpen(true)}>Edit Profile</PillButton>
            <IconButton label="More options" size={42}><EllipsisIcon /></IconButton>
          </div>
        </div>
      </div>

      <div className="fk-profile-card">
        <div className="fk-profile-card-head">
          <span className="fk-profile-card-title">Social Links</span>
          <button type="button" className="fk-profile-card-link fk-profile-card-link--accent" onClick={() => setEditModalOpen(true)}>
            Manage
          </button>
        </div>

        {socialLinks.map(link => {
          const Icon = PLATFORM_ICON[link.platform];
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="fk-social-link-row"
            >
              <span className="fk-social-link-badge"><Icon size={15} /></span>
              <span className="fk-social-link-info">
                <span className="fk-social-link-name">{link.platform}</span>
                <span className="fk-social-link-url">{cleanUrl(link.url)}</span>
              </span>
              <ExternalLinkIcon size={14} />
            </a>
          );
        })}

        <button type="button" className="fk-social-link-add" onClick={() => setEditModalOpen(true)}>
          + Add a link
        </button>
      </div>

      {editModalOpen && (
        <EditProfileModal
          displayName={displayName}
          bio={bio}
          socialLinks={socialLinks}
          avatarUrl={avatarUrl}
          bannerUrl={bannerUrl}
          onSave={saveProfile}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </aside>
  );
}
