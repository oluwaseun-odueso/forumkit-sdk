import type { ReactElement } from 'react';
import { useSidebarHover } from '../../hooks/use-sidebar-hover';
import type { FeedScope } from '../../hooks/use-forum-state';
import { HamburgerIcon, HomeIcon, PopularIcon, NewsIcon } from '../shared/icons';
import './sidebar.css';

const NAV_ITEMS: { label: string; icon: ReactElement; scope: FeedScope | null }[] = [
  { label: 'Home', icon: <HomeIcon />, scope: 'home' },
  { label: 'Popular', icon: <PopularIcon />, scope: 'popular' },
  { label: 'News', icon: <NewsIcon />, scope: 'news' },
  // "Explore" (communities) removed for now — no backend concept exists
  // yet and it's planned as future work, not a stub worth showing today.
];

type SidebarProps = {
  pinned: boolean;
  forceOpen?: boolean;
  activeScope: FeedScope | null;
  onTogglePin: () => void;
  onSelectScope: (scope: FeedScope) => void;
};

export default function Sidebar({ pinned, forceOpen, activeScope, onTogglePin, onSelectScope }: SidebarProps) {
  const { hoverPreview, hamburgerRef, asideRef } = useSidebarHover();
  const open = forceOpen || pinned || hoverPreview;

  return (
    <>
      <button
        ref={hamburgerRef}
        type="button"
        aria-label="Toggle menu"
        title="Toggle menu"
        onClick={onTogglePin}
        className={`fk-sidebar-hamburger${pinned ? ' fk-sidebar-hamburger--pinned' : ''}`}
        style={{ left: open ? 230 : 60 }}
      >
        <HamburgerIcon />
      </button>

      <aside ref={asideRef} className="fk-sidebar" style={{ width: open ? 230 : 60 }}>
        <div className="fk-sidebar-content" style={{ opacity: open ? 1 : 0 }}>
          <nav className="fk-sidebar-nav">
            {NAV_ITEMS.map(item => {
              const active = item.scope !== null && item.scope === activeScope;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.scope ? () => onSelectScope(item.scope!) : undefined}
                  className={`fk-sidebar-item${active ? ' fk-sidebar-item--active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
