import { useSidebarHover } from '../../hooks/use-sidebar-hover';
import { HamburgerIcon, HomeIcon, PopularIcon, NewsIcon, ExploreIcon } from '../shared/icons';
import './sidebar.css';

const NAV_ITEMS = [
  { label: 'Home', icon: <HomeIcon />, active: true },
  { label: 'Popular', icon: <PopularIcon /> },
  { label: 'News', icon: <NewsIcon /> },
  { label: 'Explore', icon: <ExploreIcon /> },
];

type SidebarProps = {
  pinned: boolean;
  forceOpen?: boolean;
  onTogglePin: () => void;
  onHome: () => void;
};

export default function Sidebar({ pinned, forceOpen, onTogglePin, onHome }: SidebarProps) {
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
        className="fk-sidebar-hamburger"
        style={{ left: open ? 230 : 60 }}
      >
        <HamburgerIcon />
      </button>

      <aside ref={asideRef} className="fk-sidebar" style={{ width: open ? 230 : 60 }}>
        <div className="fk-sidebar-content" style={{ opacity: open ? 1 : 0 }}>
          <nav className="fk-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.label}
                type="button"
                onClick={item.active ? onHome : undefined}
                className={`fk-sidebar-item${item.active ? ' fk-sidebar-item--active' : ''}`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
