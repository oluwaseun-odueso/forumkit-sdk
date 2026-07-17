import { useState } from 'react';
import MascotIcon from './mascot-icon';
import AccountMenu from './account-menu';
import IconButton from '../shared/icon-button';
import Avatar from '../shared/avatar';
import { SearchIcon, SparkleIcon, SunIcon, MoonIcon, MessagesIcon, PlusIcon, BellIcon } from '../shared/icons';
import { useTheme } from '../../hooks/use-theme';
import './top-nav.css';

const USER_GRADIENT = 'radial-gradient(120% 95% at 30% 25%, #f0c9a8, #b97d52 70%, #7a4f34)';

type TopNavProps = {
  onHome: () => void;
  onOpenComposer: () => void;
  onViewProfile: () => void;
  onAsk?: () => void;
  compact?: boolean;
};

/** The 56px top bar: mascot+wordmark, search/Ask pill, theme toggle, and account menu. Shared across every route. */
export default function TopNav({ onHome, onOpenComposer, onViewProfile, onAsk, compact }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fk-topnav">
      <button type="button" className="fk-topnav-brand" onClick={onHome}>
        <MascotIcon size={34} />
        <span className="fk-topnav-wordmark">FORUM KIT</span>
      </button>

      <div className="fk-topnav-search-wrap">
        <div className={`fk-topnav-search${compact ? ' fk-topnav-search--compact' : ''}`}>
          <SearchIcon size={compact ? 18 : 20} />
          <input className="fk-topnav-search-input" placeholder="Find anything" />
          {!compact && (
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
        <IconButton label="Messages">
          <MessagesIcon />
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
          <Avatar size={36} gradient={USER_GRADIENT} online />
        </button>
      </div>

      <AccountMenu open={menuOpen} onClose={() => setMenuOpen(false)} onViewProfile={onViewProfile} />
    </header>
  );
}
