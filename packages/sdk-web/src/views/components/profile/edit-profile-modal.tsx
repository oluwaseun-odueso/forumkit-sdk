import { useState, useRef } from 'react';
import type { SocialLink } from '../../hooks/use-forum-state';
import { resizeImage } from '../../utils/resize-image';
import PillButton from '../shared/pill-button';
import Modal from '../shared/modal';
import {
  CloseIcon, TrashIcon, CameraIcon, ChevronDownIcon, SunIcon, MoonIcon,
  GitHubIcon, LinkedInIcon, TwitterXIcon, BehanceIcon, DribbbleIcon, GlobeIcon, LinkIcon,
} from '../shared/icons';
import './edit-profile-modal.css';

// ─── Platform config ──────────────────────────────────────────────────────────

type PlatformConfig = {
  prefix: string;
  placeholder: string;
  Icon: React.ComponentType<{ size?: number }>;
};

const PLATFORM_CONFIG: Record<SocialLink['platform'], PlatformConfig> = {
  'Website':   { prefix: '',                         placeholder: 'https://yoursite.com', Icon: GlobeIcon },
  'Portfolio': { prefix: '',                         placeholder: 'https://portfolio.io', Icon: GlobeIcon },
  'GitHub':    { prefix: 'https://github.com/',      placeholder: 'username',             Icon: GitHubIcon },
  'LinkedIn':  { prefix: 'https://linkedin.com/in/', placeholder: 'your-name',            Icon: LinkedInIcon },
  'Twitter/X': { prefix: 'https://x.com/',           placeholder: 'username',             Icon: TwitterXIcon },
  'Behance':   { prefix: 'https://behance.net/',     placeholder: 'username',             Icon: BehanceIcon },
  'Dribbble':  { prefix: 'https://dribbble.com/',    placeholder: 'username',             Icon: DribbbleIcon },
  'Other':     { prefix: '',                         placeholder: 'https://',             Icon: LinkIcon },
};

const PLATFORMS = Object.keys(PLATFORM_CONFIG) as SocialLink['platform'][];

function toSuffix(platform: SocialLink['platform'], url: string): string {
  const { prefix } = PLATFORM_CONFIG[platform];
  return prefix && url.startsWith(prefix) ? url.slice(prefix.length) : url;
}

function toUrl(platform: SocialLink['platform'], suffix: string): string {
  const { prefix } = PLATFORM_CONFIG[platform];
  const trimmed = suffix.trim().replace(/^\/+|\/+$/g, '');
  if (!prefix) {
    return trimmed && !/^https?:\/\//i.test(trimmed) ? `https://${trimmed}` : trimmed;
  }
  return `${prefix}${trimmed}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DraftLink = {
  id: number;
  platform: SocialLink['platform'];
  suffix: string;
};

let _nextId = 1000;
function nextDraftId(): number { return _nextId++; }

type SavePayload = {
  displayName: string;
  bio: string;
  socialLinks: SocialLink[];
  avatarBlob: Blob | null;
  bannerBlob: Blob | null;
};

type EditProfileModalProps = {
  displayName: string;
  bio: string;
  socialLinks: SocialLink[];
  avatarUrl: string | null;
  bannerUrl: string | null;
  themePreference: 'light' | 'dark' | null;
  onToggleTheme: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
  onClose: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function EditProfileModal({
  displayName, bio, socialLinks, avatarUrl, bannerUrl, themePreference, onToggleTheme, onSave, onClose,
}: EditProfileModalProps) {
  const isDark = themePreference !== 'light';
  const [draftName, setDraftName] = useState(displayName);
  const [draftBio, setDraftBio] = useState(bio);
  const [draftLinks, setDraftLinks] = useState<DraftLink[]>(() =>
    socialLinks.map(l => ({ id: l.id, platform: l.platform, suffix: toSuffix(l.platform, l.url) }))
  );

  const [bannerPreview, setBannerPreview] = useState<string | null>(bannerUrl);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl);
  const [bannerBlob, setBannerBlob] = useState<Blob | null>(null);
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

  const [openPickerId, setOpenPickerId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleBannerFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const blob = await resizeImage(file, 1200, 300);
    const url = URL.createObjectURL(blob);
    setBannerPreview(prev => { if (prev && prev !== bannerUrl) URL.revokeObjectURL(prev); return url; });
    setBannerBlob(blob);
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const blob = await resizeImage(file, 400, 400);
    const url = URL.createObjectURL(blob);
    setAvatarPreview(prev => { if (prev && prev !== avatarUrl) URL.revokeObjectURL(prev); return url; });
    setAvatarBlob(blob);
  }

  function addLink() {
    setDraftLinks(prev => [...prev, { id: nextDraftId(), platform: 'Website', suffix: '' }]);
  }

  function removeLink(id: number) {
    setDraftLinks(prev => prev.filter(l => l.id !== id));
    if (openPickerId === id) setOpenPickerId(null);
  }

  function updateLinkPlatform(id: number, platform: SocialLink['platform']) {
    setDraftLinks(prev => prev.map(l => l.id === id ? { ...l, platform, suffix: '' } : l));
  }

  function updateLinkSuffix(id: number, suffix: string) {
    setDraftLinks(prev => prev.map(l => l.id === id ? { ...l, suffix } : l));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const reconstructedLinks: SocialLink[] = draftLinks
        .filter(l => l.suffix.trim() !== '')
        .map(l => ({ id: l.id, platform: l.platform, url: toUrl(l.platform, l.suffix) }));
      await onSave({
        displayName: draftName.trim(),
        bio: draftBio.trim(),
        socialLinks: reconstructedLinks,
        avatarBlob,
        bannerBlob,
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={600}>
      <div
        className="fk-edit-modal-banner"
        style={bannerPreview ? { backgroundImage: `url(${bannerPreview})`, cursor: 'zoom-in' } : undefined}
        onClick={bannerPreview ? () => window.open(bannerPreview!, '_blank') : undefined}
      >
        <button
          type="button"
          className="fk-edit-modal-change-banner"
          onClick={e => { e.stopPropagation(); bannerInputRef.current?.click(); }}
        >
          <CameraIcon size={13} />
          Change Banner
        </button>
        <input ref={bannerInputRef} type="file" accept="image/*" className="fk-edit-modal-file-input" onChange={handleBannerFile} />

        <div
          className="fk-edit-modal-avatar"
          onClick={e => { e.stopPropagation(); avatarInputRef.current?.click(); }}
        >
          {avatarPreview ? <img src={avatarPreview} alt="Avatar preview" className="fk-edit-modal-avatar-img" /> : null}
          <span className="fk-edit-modal-avatar-badge"><CameraIcon size={13} /></span>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" className="fk-edit-modal-file-input" onChange={handleAvatarFile} />
      </div>

      <div className="fk-edit-modal-body">
          <div className="fk-edit-modal-title-row">
            <h3 className="fk-edit-modal-title">Settings</h3>
            <button type="button" className="fk-edit-modal-close" onClick={onClose}>
              <CloseIcon size={18} />
            </button>
          </div>

          <span className="fk-edit-modal-section-label">Profile</span>

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
              {draftLinks.map(link => {
                const cfg = PLATFORM_CONFIG[link.platform];
                const Icon = cfg.Icon;
                return (
                  <div key={link.id} className="fk-edit-modal-link-row">
                    <div className="fk-edit-modal-platform-picker">
                      <button
                        type="button"
                        className="fk-edit-modal-platform-btn"
                        onClick={() => setOpenPickerId(openPickerId === link.id ? null : link.id)}
                        title={link.platform}
                      >
                        <Icon size={17} />
                        <ChevronDownIcon size={11} />
                      </button>
                      {openPickerId === link.id && (
                        <div className="fk-edit-modal-platform-dropdown">
                          {PLATFORMS.map(p => {
                            const PIcon = PLATFORM_CONFIG[p].Icon;
                            return (
                              <button
                                key={p}
                                type="button"
                                title={p}
                                className={`fk-edit-modal-platform-option${link.platform === p ? ' fk-edit-modal-platform-option--active' : ''}`}
                                onClick={() => { updateLinkPlatform(link.id, p); setOpenPickerId(null); }}
                              >
                                <PIcon size={17} />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="fk-edit-modal-link-url-wrap">
                      {cfg.prefix && (
                        <span className="fk-edit-modal-link-prefix">
                          {cfg.prefix.replace('https://', '')}
                        </span>
                      )}
                      <input
                        className="fk-edit-modal-link-suffix"
                        value={link.suffix}
                        onChange={e => updateLinkSuffix(link.id, e.target.value)}
                        placeholder={cfg.placeholder}
                      />
                    </div>

                    <button type="button" className="fk-edit-modal-link-trash" onClick={() => removeLink(link.id)}>
                      <TrashIcon size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <hr className="fk-edit-modal-divider" />

          <span className="fk-edit-modal-section-label">Preferences</span>

          <div className="fk-edit-modal-preference-row">
            <div>
              <div className="fk-edit-modal-preference-label">Display Mode</div>
              <div className="fk-edit-modal-preference-sub">{isDark ? 'Dark' : 'Light'}</div>
            </div>
            <button type="button" className="fk-edit-modal-theme-toggle" onClick={onToggleTheme} aria-label="Toggle display mode">
              {isDark ? <MoonIcon size={17} /> : <SunIcon size={17} />}
            </button>
          </div>

          {saveError && <p className="fk-edit-modal-save-error">{saveError}</p>}
        </div>

      <div className="fk-edit-modal-footer">
        <PillButton variant="surface" onClick={onClose} disabled={saving}>Cancel</PillButton>
        <PillButton variant="accent" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </PillButton>
      </div>
    </Modal>
  );
}
