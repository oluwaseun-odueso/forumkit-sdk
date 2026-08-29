import { useState } from 'react';
import type { SearchResult } from '@forumkit/types';
import type { RailItem } from '../../hooks/use-forum-state';
import MascotIcon from './mascot-icon';
import AccountMenu from './account-menu';
import SearchResultsDropdown, { saveSearchHistory, loadSearchHistory } from './search-results-dropdown';
import IconButton from '../shared/icon-button';
import Avatar from '../shared/avatar';
import { SearchIcon, SparkleIcon, SunIcon, MoonIcon, PlusIcon, BellIcon, CloseIcon } from '../shared/icons';
import type { Theme } from '../../hooks/use-theme';
import { authorAvatar } from '../../lib/author-avatar';
import './top-nav.css';

type TopNavProps = {
  onHome: () => void;
  onOpenComposer: () => void;
  onViewProfile: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  onAsk?: (() => void) | undefined;
  askActive?: boolean | undefined;
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
  theme: Theme;
  onToggleTheme: () => void;
  // Latest and featured posts for the empty-query dropdown
  latestPosts?: RailItem[] | undefined;
  featuredPosts?: RailItem[] | undefined;
  onOpenPost?: ((id: string) => void) | undefined;
};

/** The 56px top bar: mascot+wordmark, search pill (with AI ask icon inside), theme toggle, and account menu. Shared across every route. */
export default function TopNav({
  onHome, onOpenComposer, onViewProfile, onOpenNotifications, unreadCount, onAsk, askActive, compact, scopeTag, avatarUrl, displayName,
  searchQuery, onSearchChange, searchOpen, searchLoading, searchResults,
  onCloseSearchDropdown, onSelectSearchResult, onSubmitSearch, theme, onToggleTheme,
  latestPosts, featuredPosts, onOpenPost,
}: TopNavProps) {
  const { gradient, letter } = authorAvatar(displayName || undefined, displayName || 'You');
  const [menuOpen, setMenuOpen] = useState(false);
  const [tagActive, setTagActive] = useState(true);
  const [history, setHistory] = useState<string[]>(() => loadSearchHistory());

  const showTag = !!(scopeTag && tagActive);
  const placeholder = showTag ? `Search in u/${scopeTag}` : 'Find anything';

  function handleSubmit(query: string) {
    saveSearchHistory(query);
    setHistory(loadSearchHistory());
    onSubmitSearch(query);
  }

  return (
    <header className="fk-topnav">
      <button type="button" className="fk-topnav-brand" onClick={onHome}>
        <MascotIcon size={34} />
        <span className="fk-topnav-wordmark">FORUM KIT</span>
      </button>

      <div className="fk-topnav-search-wrap">
        <div className={`fk-topnav-search${compact ? ' fk-topnav-search--compact' : ''}${askActive ? ' fk-topnav-search--ask-active' : ''}`}>
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
            onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) handleSubmit(searchQuery.trim()); }}
          />
          {searchQuery && (
            <button
              type="button"
              className="fk-topnav-search-clear"
              aria-label="Clear search"
              onClick={() => { onSearchChange(''); onCloseSearchDropdown(); }}
            >
              <CloseIcon size={15} />
            </button>
          )}
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
            onSeeMore={() => handleSubmit(searchQuery.trim())}
            latestPosts={latestPosts}
            featuredPosts={featuredPosts}
            onOpenPost={onOpenPost}
            history={history}
            onHistoryChange={next => setHistory(next)}
            onSelectHistory={q => { onSearchChange(q); handleSubmit(q); }}
          />
        )}
      </div>

      <div className="fk-topnav-actions">
        <div className="fk-topnav-create-group">
          <IconButton label="Toggle theme" onClick={onToggleTheme} style={{ marginTop: '3px' }}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </IconButton>
          <button type="button" className="fk-topnav-create" onClick={onOpenComposer}>
            <PlusIcon />
            Create
          </button>
        </div>
        <IconButton label="Notifications" onClick={onOpenNotifications} style={{ position: 'relative' }}>
          <BellIcon />
          {unreadCount > 0 && <span className="fk-topnav-notif-dot" />}
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
