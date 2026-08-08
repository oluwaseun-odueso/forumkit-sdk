import { useState } from 'react';
import type { SearchResult } from '@forumkit/types';
import MascotIcon from './mascot-icon';
import AccountMenu from './account-menu';
import SearchResultsDropdown from './search-results-dropdown';
import IconButton from '../shared/icon-button';
import Avatar from '../shared/avatar';
import { SearchIcon, SparkleIcon, SunIcon, MoonIcon, PlusIcon, BellIcon, CloseIcon, ChevronLeftIcon } from '../shared/icons';
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
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchOpen: boolean;
  searchLoading: boolean;
  searchResults: SearchResult[];
  onCloseSearchDropdown: () => void;
  onSelectSearchResult: (threadId: string) => void;
  onSubmitSearch: (query: string) => void;
  canGoBack: boolean;
  onBack: () => void;
};

/** The 56px top bar: mascot+wordmark, search/Ask pill, theme toggle, and account menu. Shared across every route. */
export default function TopNav({
  onHome, onOpenComposer, onViewProfile, onAsk, compact, scopeTag, avatarUrl, displayName,
  searchQuery, onSearchChange, searchOpen, searchLoading, searchResults,
  onCloseSearchDropdown, onSelectSearchResult, onSubmitSearch, canGoBack, onBack,
}: TopNavProps) {
  const { theme, toggleTheme } = useTheme();
  const { gradient, letter } = authorAvatar(displayName || undefined, displayName || 'You');
  const [menuOpen, setMenuOpen] = useState(false);
  const [tagActive, setTagActive] = useState(true);

  const showTag = !!(scopeTag && tagActive);
  const placeholder = showTag ? `Search in u/${scopeTag}` : 'Find anything';

  return (
    <header className="fk-topnav">
      {canGoBack && (
        <IconButton label="Back" onClick={onBack} style={{ marginRight: 2 }}>
          <ChevronLeftIcon size={20} />
        </IconButton>
      )}
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
          <input
            className="fk-topnav-search-input"
            placeholder={placeholder}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) onSubmitSearch(searchQuery.trim()); }}
          />
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
        {searchOpen && (
          <SearchResultsDropdown
            loading={searchLoading}
            results={searchResults}
            query={searchQuery}
            onClose={onCloseSearchDropdown}
            onSelectResult={onSelectSearchResult}
            onSeeMore={() => onSubmitSearch(searchQuery.trim())}
          />
        )}
      </div>

      <div className="fk-topnav-actions">
        <div className="fk-topnav-create-group">
          <IconButton label="Toggle theme" onClick={toggleTheme} style={{ marginTop: '3px' }}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </IconButton>
          <button type="button" className="fk-topnav-create" onClick={onOpenComposer}>
            <PlusIcon />
            Create
          </button>
        </div>
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
