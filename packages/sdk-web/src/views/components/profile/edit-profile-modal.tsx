import { useState, useRef } from 'react';
import type { SocialLink } from '../../hooks/use-forum-state';
import PillButton from '../shared/pill-button';
import { CloseIcon, TrashIcon, CameraIcon } from '../shared/icons';
import './edit-profile-modal.css';

const PLATFORMS: SocialLink['platform'][] = [
  'Website', 'Portfolio', 'GitHub', 'LinkedIn', 'Twitter/X', 'Behance', 'Dribbble', 'Other',
];

let _nextId = 1000;
function nextDraftId(): number { return _nextId++; }

type EditProfileModalProps = {
  displayName: string;
  bio: string;
  socialLinks: SocialLink[];
  onSave: (displayName: string, bio: string, socialLinks: SocialLink[]) => void;
  onClose: () => void;
};

export default function EditProfileModal({ displayName, bio, socialLinks, onSave, onClose }: EditProfileModalProps) {
  const [draftName, setDraftName] = useState(displayName);
  const [draftBio, setDraftBio] = useState(bio);
  const [draftLinks, setDraftLinks] = useState<SocialLink[]>(() => socialLinks.map(l => ({ ...l })));
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function handleBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    e.target.value = '';
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    e.target.value = '';
  }

  function addLink() {
    setDraftLinks(prev => [...prev, { id: nextDraftId(), platform: 'Website', url: '' }]);
  }

  function removeLink(id: number) {
    setDraftLinks(prev => prev.filter(l => l.id !== id));
  }

  function updateLinkPlatform(id: number, platform: SocialLink['platform']) {
    setDraftLinks(prev => prev.map(l => l.id === id ? { ...l, platform } : l));
  }

  function updateLinkUrl(id: number, url: string) {
    setDraftLinks(prev => prev.map(l => l.id === id ? { ...l, url } : l));
  }

  function handleSave() {
    const filtered = draftLinks.filter(l => l.url.trim() !== '');
    onSave(draftName.trim(), draftBio.trim(), filtered);
    onClose();
  }

  return (
    <div
      className="fk-edit-modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fk-edit-modal">
        <div
          className="fk-edit-modal-banner"
          style={bannerPreview ? { backgroundImage: `url(${bannerPreview})`, cursor: 'zoom-in' } : undefined}
          onClick={bannerPreview ? () => window.open(bannerPreview, '_blank') : undefined}
        >
          <button
            type="button"
            className="fk-edit-modal-change-banner"
            onClick={e => { e.stopPropagation(); bannerInputRef.current?.click(); }}
          >
            <CameraIcon size={13} />
            Change Banner
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="fk-edit-modal-file-input"
            onChange={handleBannerFile}
          />
          <div
            className="fk-edit-modal-avatar"
            onClick={e => { e.stopPropagation(); avatarInputRef.current?.click(); }}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="Avatar preview" className="fk-edit-modal-avatar-img" />
              : null}
            <span className="fk-edit-modal-avatar-badge">
              <CameraIcon size={13} />
            </span>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="fk-edit-modal-file-input"
            onChange={handleAvatarFile}
          />
        </div>

        <div className="fk-edit-modal-body">
          <div className="fk-edit-modal-title-row">
            <h3 className="fk-edit-modal-title">Edit Profile</h3>
            <button type="button" className="fk-edit-modal-close" onClick={onClose}>
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="fk-edit-modal-field">
            <label className="fk-edit-modal-label">Display name</label>
            <input
              className="fk-edit-modal-input"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="Display name"
            />
          </div>

          <div className="fk-edit-modal-field">
            <label className="fk-edit-modal-label">Bio</label>
            <textarea
              className="fk-edit-modal-textarea"
              value={draftBio}
              onChange={e => setDraftBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={3}
            />
          </div>

          <hr className="fk-edit-modal-divider" />

          <div className="fk-edit-modal-links-head">
            <span className="fk-edit-modal-links-title">Social &amp; professional links</span>
            <button type="button" className="fk-edit-modal-add-link" onClick={addLink}>+ Add link</button>
          </div>

          {draftLinks.length === 0 ? (
            <p className="fk-edit-modal-empty">No links yet. Add one above.</p>
          ) : (
            <div className="fk-edit-modal-links-list">
              {draftLinks.map(link => (
                <div key={link.id} className="fk-edit-modal-link-row">
                  <select
                    className="fk-edit-modal-platform-select"
                    value={link.platform}
                    onChange={e => updateLinkPlatform(link.id, e.target.value as SocialLink['platform'])}
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input
                    className="fk-edit-modal-link-input"
                    value={link.url}
                    onChange={e => updateLinkUrl(link.id, e.target.value)}
                    placeholder="https://"
                  />
                  <button type="button" className="fk-edit-modal-link-trash" onClick={() => removeLink(link.id)}>
                    <TrashIcon size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fk-edit-modal-footer">
          <PillButton variant="surface" onClick={onClose}>Cancel</PillButton>
          <PillButton variant="accent" onClick={handleSave}>Save</PillButton>
        </div>
      </div>
    </div>
  );
}
