import { useEffect, useRef, useState, type ReactNode } from 'react';
import TopNav from './top-nav';
import Sidebar from './sidebar';
import { useForum } from '../../hooks/use-forum-state';
import './shell.css';

type ShellProps = {
  children: ReactNode;
  rail?: ReactNode;
  onAsk?: (() => void) | undefined;
  askActive?: boolean;
  compactSearch?: boolean;
  scrollMain?: boolean;
  scopeTag?: string;
  // .fk-shell-content centers .fk-shell-main in the space left after the
  // sidebar (and rail, if any) by default — right for every other route,
  // but Compose has no rail and wants its content anchored to the left
  // edge of that space instead, not floating in the middle of a mostly
  // empty row. Defaults to the existing centered behavior everywhere else.
  mainAlign?: 'center' | 'start';
};

/**
 * Common app frame shared by the feed, thread, and profile routes: top nav,
 * persistent collapsible sidebar, a scrollable main column, and an optional
 * right rail. Routes only supply their own center content (and rail).
 */
export default function Shell({
  children, rail, onAsk, askActive, compactSearch, scrollMain = true, scopeTag, mainAlign = 'center',
}: ShellProps) {
  const {
    state, setView, openComposer, toggleSidebarPin, setFeedScope, openThread,
    setSearchQuery, closeSearchDropdown, openSearchResults, openAsk,
    reportScroll, clearPendingScroll, toggleTheme,
  } = useForum();
  const mainRef = useRef<HTMLElement>(null);
  const [isActivating, setIsActivating] = useState(false);
  const activatingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // state.profile.themePreference starts null until the profile-init effect
  // resolves it from the backend; fall back to the same localStorage key
  // use-theme.ts used to seed from, so the icon doesn't flash to the wrong
  // state on first paint.
  const theme = state.profile.themePreference
    ?? (typeof window !== 'undefined' && localStorage.getItem('fk_theme') === 'light' ? 'light' : 'dark');

  // Applies a GO_BACK's one-shot pendingScrollTop to the actual DOM once
  // the page we're returning to has (re-)rendered, then clears it — this
  // is what makes "back" land at the same scroll position instead of just
  // the same page.
  useEffect(() => {
    if (state.pendingScrollTop === null) return;
    mainRef.current?.scrollTo({ top: state.pendingScrollTop });
    clearPendingScroll();
  }, [state.pendingScrollTop, clearPendingScroll]);

  // If the parent didn't wire up onAsk (Feed, Thread, Profile…), derive a
  // fallback so the Ask button is always clickable. askActive is skipped
  // because that flag means "already in AI mode" — the pill's job there is
  // visual confirmation, not navigation.
  const baseAskHandler = onAsk ?? (!askActive ? () => openAsk(state.search.query ?? '') : undefined);

  // Wraps the handler to briefly set isActivating so the lightning-sweep
  // animation fires on click even before the AskResult page mounts.
  const effectiveAskHandler = baseAskHandler ? () => {
    setIsActivating(true);
    if (activatingTimer.current) clearTimeout(activatingTimer.current);
    activatingTimer.current = setTimeout(() => setIsActivating(false), 1600);
    baseAskHandler();
  } : undefined;

  return (
    <div className="fk-shell">
      <TopNav
        onHome={() => setView('feed')}
        onOpenComposer={openComposer}
        onViewProfile={() => setView('profile')}
        onOpenNotifications={() => setView('notifications')}
        unreadCount={state.notifications.unreadCount}
        onAsk={effectiveAskHandler}
        askActive={askActive || isActivating}
        compact={compactSearch}
        scopeTag={scopeTag}
        avatarUrl={state.profile.avatarUrl}
        displayName={state.profile.displayName}
        searchQuery={state.search.query}
        onSearchChange={setSearchQuery}
        searchOpen={state.search.open}
        searchLoading={state.search.loading}
        searchResults={state.search.results}
        onCloseSearchDropdown={closeSearchDropdown}
        onSelectSearchResult={(threadId) => { closeSearchDropdown(); openThread(threadId); }}
        onSubmitSearch={openSearchResults}
        theme={theme}
        onToggleTheme={() => void toggleTheme()}
        latestPosts={state.rail.latest}
        featuredPosts={state.rail.featured}
        onOpenPost={openThread}
      />
      <div className="fk-shell-body">
        <Sidebar
          pinned={state.sidebar.pinned}
          onTogglePin={toggleSidebarPin}
          activeScope={state.view === 'feed' ? state.feed.scope : null}
          onSelectScope={setFeedScope}
        />
        <div className="fk-shell-content" style={{ justifyContent: mainAlign === 'start' ? 'flex-start' : 'center' }}>
          <main
            ref={mainRef}
            className="fk-shell-main"
            style={{ overflowY: scrollMain ? 'auto' : 'hidden' }}
            onScroll={e => reportScroll(e.currentTarget.scrollTop)}
          >
            {children}
          </main>
          {rail}
        </div>
      </div>
    </div>
  );
}
