import type { ReactNode } from 'react';
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
};

/**
 * Common app frame shared by the feed, thread, and profile routes: top nav,
 * persistent collapsible sidebar, a scrollable main column, and an optional
 * right rail. Routes only supply their own center content (and rail).
 */
export default function Shell({ children, rail, onAsk, compactSearch, scrollMain = true }: ShellProps) {
  const { state, setView, openComposer, toggleSidebarPin } = useForum();

  return (
    <div className="fk-shell">
      <TopNav
        onHome={() => setView('feed')}
        onOpenComposer={openComposer}
        onViewProfile={() => setView('profile')}
        onAsk={onAsk}
        compact={compactSearch}
      />
      <div className="fk-shell-body">
        <Sidebar pinned={state.sidebar.pinned} onTogglePin={toggleSidebarPin} onHome={() => setView('feed')} />
        <main className="fk-shell-main" style={{ overflowY: scrollMain ? 'auto' : 'hidden' }}>{children}</main>
        {rail}
      </div>
    </div>
  );
}
