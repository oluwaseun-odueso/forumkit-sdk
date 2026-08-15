import { useState } from 'react';
import { CameraIcon } from '../shared/icons';
import Avatar from '../shared/avatar';
import Lightbox from '../shared/lightbox';
import { authorAvatar } from '../../lib/author-avatar';
import './profile-header.css';

type ProfileHeaderProps = {
  username: string;
  handle: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  // Both omitted (undefined) when viewing someone else's profile — there's
  // nothing to edit on a profile that isn't yours, so the buttons don't
  // render at all rather than rendering disabled.
  onEditAvatar?: (() => void) | undefined;
  onEditBanner?: (() => void) | undefined;
};

export default function ProfileHeader({ username, handle, avatarUrl, bannerUrl, onEditAvatar, onEditBanner }: ProfileHeaderProps) {
  const avatar = authorAvatar(handle, username);
  // Clicking the banner/avatar image itself opens it full-size, same as the
  // Edit Profile modal's own banner/avatar preview already does — the
  // "Change Banner"/camera buttons stop propagation so they open the file
  // picker (or Settings, on this page) instead of also opening the lightbox.
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  return (
    <div className="fk-profile-header">
      <div
        className="fk-profile-header-banner"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, cursor: 'zoom-in' } : undefined}
        onClick={bannerUrl ? () => setLightboxImage(bannerUrl) : undefined}
      >
        {onEditBanner && (
          <button
            type="button"
            className="fk-profile-change-banner"
            onClick={e => { e.stopPropagation(); onEditBanner(); }}
          >
            <CameraIcon size={13} />
            Change Banner
          </button>
        )}
        <div
          className="fk-profile-avatar-wrap"
          style={avatarUrl ? { cursor: 'zoom-in' } : undefined}
          onClick={avatarUrl ? e => { e.stopPropagation(); setLightboxImage(avatarUrl); } : undefined}
        >
          <Avatar size={150} gradient={avatar.gradient} letter={avatar.letter} imageUrl={avatarUrl} style={{ borderRadius: '50%', border: '3px solid var(--surface)' }} />
          {onEditAvatar && (
            <button
              type="button"
              className="fk-profile-avatar-edit"
              aria-label="Edit avatar"
              onClick={e => { e.stopPropagation(); onEditAvatar(); }}
            >
              <CameraIcon />
            </button>
          )}
        </div>
      </div>
      <div className="fk-profile-header-labels">
        <h1 className="fk-profile-username">{username}</h1>
        <div className="fk-profile-handle">/{handle}</div>
      </div>

      {lightboxImage && (
        <Lightbox items={[{ type: 'image', url: lightboxImage }]} startIndex={0} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
