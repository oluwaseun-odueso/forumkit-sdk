import { useEffect, useRef, type ReactNode } from 'react';
import TopNav from './top-nav';
import Sidebar from './sidebar';
import { useForum } from '../../hooks/use-forum-state';
import './shell.css';

type ShellProps = {
  children: ReactNode;
  rail?: ReactNode;
  onAsk?: () => void;
  compactSearch?: boolean;
  scrollMain?: boolean;
  scopeTag?: string;
};

/**
 * Common app frame shared by the feed, thread, and profile routes: top nav,
 * persistent collapsible sidebar, a scrollable main column, and an optional
 * right rail. Routes only supply their own center content (and rail).
 */
export default function Shell({ children, rail, onAsk, compactSearch, scrollMain = true, scopeTag }: ShellProps) {
  const {
    state, setView, openComposer, toggleSidebarPin, setFeedScope, openThread,
    setSearchQuery, closeSearchDropdown, openSearchResults,
    reportScroll, goBack, clearPendingScroll,
  } = useForum();
  const mainRef = useRef<HTMLElement>(null);

  // Applies a GO_BACK's one-shot pendingScrollTop to the actual DOM once
  // the page we're returning to has (re-)rendered, then clears it — this
  // is what makes "back" land at the same scroll position instead of just
  // the same page.
  useEffect(() => {
    if (state.pendingScrollTop === null) return;
    mainRef.current?.scrollTo({ top: state.pendingScrollTop });
    clearPendingScroll();
  }, [state.pendingScrollTop, clearPendingScroll]);

  return (
    <div className="fk-shell">
      <TopNav
        onHome={() => setView('feed')}
        onOpenComposer={openComposer}
        onViewProfile={() => setView('profile')}
        onAsk={onAsk}
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
        canGoBack={state.history.length > 0}
        onBack={goBack}
      />
      <div className="fk-shell-body">
        <Sidebar
          pinned={state.sidebar.pinned}
          onTogglePin={toggleSidebarPin}
          activeScope={state.view === 'feed' ? state.feed.scope : null}
          onSelectScope={setFeedScope}
        />
        <div className="fk-shell-content">
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
