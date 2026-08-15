import { useRef, useState } from 'react';
import { CameraIcon } from '../shared/icons';
import Avatar from '../shared/avatar';
import Lightbox from '../shared/lightbox';
import ImageEditorModal from './image-editor-modal';
import { authorAvatar } from '../../lib/author-avatar';
import { useForum } from '../../hooks/use-forum-state';
import { IMAGE_ACCEPT } from '../../lib/accepted-media-types';
import './profile-header.css';

type ProfileHeaderProps = {
  username: string;
  handle: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  // False when viewing someone else's profile — there's nothing to edit on
  // a profile that isn't yours, so the buttons don't render at all.
  isOwnProfile?: boolean;
};

export default function ProfileHeader({ username, handle, avatarUrl, bannerUrl, isOwnProfile = false }: ProfileHeaderProps) {
  const { state, saveProfile } = useForum();
  const avatar = authorAvatar(handle, username);
  // Clicking the banner/avatar image itself opens it full-size, same as the
  // Edit Profile modal's own banner/avatar preview already does — the
  // "Change Banner"/camera buttons stop propagation so they open the file
  // picker instead of also opening the lightbox.
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  // Picking a file goes straight into the crop/filter editor and saves on
  // confirm — no detour through the full Settings modal, unlike the rest
  // of profile editing.
  const [editingImage, setEditingImage] = useState<{ kind: 'avatar' | 'banner'; file: File } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setEditingImage({ kind: 'avatar', file });
  }

  function handleBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setEditingImage({ kind: 'banner', file });
  }

  async function handleImageEditorConfirm(blob: Blob) {
    const kind = editingImage?.kind;
    await saveProfile({
      displayName: state.profile.displayName,
      bio: state.profile.bio,
      socialLinks: state.profile.socialLinks,
      avatarBlob: kind === 'avatar' ? blob : null,
      bannerBlob: kind === 'banner' ? blob : null,
    });
    setEditingImage(null);
  }

  return (
    <div className="fk-profile-header">
      <div
        className="fk-profile-header-banner"
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, cursor: 'zoom-in' } : undefined}
        onClick={bannerUrl ? () => setLightboxImage(bannerUrl) : undefined}
      >
        {isOwnProfile && (
          <button
            type="button"
            className="fk-profile-change-banner"
            onClick={e => { e.stopPropagation(); bannerInputRef.current?.click(); }}
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
          {isOwnProfile && (
            <button
              type="button"
              className="fk-profile-avatar-edit"
              aria-label="Edit avatar"
              onClick={e => { e.stopPropagation(); avatarInputRef.current?.click(); }}
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

      {isOwnProfile && (
        <>
          <input
            ref={avatarInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            style={{ display: 'none' }}
            onChange={handleAvatarFile}
          />
          <input
            ref={bannerInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            style={{ display: 'none' }}
            onChange={handleBannerFile}
          />
        </>
      )}

      {editingImage && (
        <ImageEditorModal
          file={editingImage.file}
          aspect={editingImage.kind === 'avatar' ? 1 : 4}
          targetWidth={editingImage.kind === 'avatar' ? 400 : 1200}
          targetHeight={editingImage.kind === 'avatar' ? 400 : 300}
          onCancel={() => setEditingImage(null)}
          onConfirm={handleImageEditorConfirm}
        />
      )}

      {lightboxImage && (
        <Lightbox items={[{ type: 'image', url: lightboxImage }]} startIndex={0} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
