import { useState } from 'react';
import MascotIcon from './mascot-icon';
import AccountMenu from './account-menu';
import IconButton from '../shared/icon-button';
import Avatar from '../shared/avatar';
import { SearchIcon, SparkleIcon, SunIcon, MoonIcon, PlusIcon, BellIcon, CloseIcon } from '../shared/icons';
import { useTheme } from '../../hooks/use-theme';
import { authorAvatar } from '../../lib/author-avatar';
import './top-nav.css';

type TopNavProps = {
  onHome: () => void;
  onOpenComposer: () => void;
  onViewProfile: () => void;
  onAsk?: (() => void) | undefined;
  compact?: boolean | undefined;
  scopeTag?: string | undefined;
  avatarUrl: string | null;
  displayName: string;
};

/** The 56px top bar: mascot+wordmark, search/Ask pill, theme toggle, and account menu. Shared across every route. */
export default function TopNav({ onHome, onOpenComposer, onViewProfile, onAsk, compact, scopeTag, avatarUrl, displayName }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();
  const { gradient, letter } = authorAvatar(displayName || undefined, displayName || 'You');
  const [menuOpen, setMenuOpen] = useState(false);
  const [tagActive, setTagActive] = useState(true);

  const showTag = !!(scopeTag && tagActive);
  const placeholder = showTag ? `Search in u/${scopeTag}` : 'Find anything';

  return (
    <header className="fk-topnav">
      <button type="button" className="fk-topnav-brand" onClick={onHome}>
        <MascotIcon size={34} />
        <span className="fk-topnav-wordmark">FORUM KIT</span>
      </button>

      <div className="fk-topnav-search-wrap">
        <div className={`fk-topnav-search${compact ? ' fk-topnav-search--compact' : ''}`}>
          <SearchIcon size={compact ? 18 : 20} />
          {showTag && (
            <span className="fk-topnav-scope-tag">
              u/{scopeTag}
              <button
                type="button"
                className="fk-topnav-scope-tag-clear"
                aria-label="Clear scope"
                onClick={() => setTagActive(false)}
              >
                <CloseIcon size={10} />
              </button>
            </span>
          )}
          <input className="fk-topnav-search-input" placeholder={placeholder} />
          {!compact && !showTag && (
            <>
              <div className="fk-topnav-search-divider" />
              <button type="button" className="fk-topnav-ask" onClick={onAsk} disabled={!onAsk}>
                <SparkleIcon />
                Ask
              </button>
            </>
          )}
        </div>
      </div>

      <div className="fk-topnav-actions">
        <IconButton label="Toggle theme" onClick={toggleTheme}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </IconButton>
        <button type="button" className="fk-topnav-create" onClick={onOpenComposer}>
          <PlusIcon />
          Create
        </button>
        <IconButton label="Notifications" style={{ position: 'relative' }}>
          <BellIcon />
          <span className="fk-topnav-notif-dot" />
        </IconButton>
        <button
          type="button"
          className="fk-topnav-avatar-btn"
          aria-label="Account"
          onClick={() => setMenuOpen(o => !o)}
          style={{ outlineColor: menuOpen ? 'var(--accent)' : 'transparent' }}
        >
          <Avatar size={36} gradient={gradient} letter={letter} imageUrl={avatarUrl} online />
        </button>
      </div>

      <AccountMenu open={menuOpen} onClose={() => setMenuOpen(false)} onViewProfile={onViewProfile} />
    </header>
  );
}
