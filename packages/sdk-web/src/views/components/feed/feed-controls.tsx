import DropdownMenu, { DropdownMenuTitle, DropdownMenuItem } from '../shared/dropdown-menu';
import { ChevronDownIcon, CompactViewIcon, CardViewIcon } from '../shared/icons';
import type { FeedSort, FeedView } from '../../hooks/use-forum-state';
import type { TopWindow } from '@forumkit/types';
import './feed-controls.css';

const SORT_OPTIONS: FeedSort[] = ['Best', 'Hot', 'New', 'Top', 'Rising'];

const TOP_WINDOW_LABELS: Record<TopWindow, string> = {
  hour: 'Past hour', day: 'Today', week: 'This week', month: 'This month', year: 'This year', all: 'All time',
};
const TOP_WINDOW_OPTIONS: TopWindow[] = ['hour', 'day', 'week', 'month', 'year', 'all'];

type FeedControlsProps = {
  sort: FeedSort;
  view: FeedView;
  topWindow: TopWindow;
  sortMenuOpen: boolean;
  viewMenuOpen: boolean;
  topWindowMenuOpen: boolean;
  onToggleSortMenu: () => void;
  onToggleViewMenu: () => void;
  onToggleTopWindowMenu: () => void;
  onCloseMenus: () => void;
  onSelectSort: (sort: FeedSort) => void;
  onSelectView: (view: FeedView) => void;
  onSelectTopWindow: (window: TopWindow) => void;
};

/** The Sort ("Best" ▾), Top-window ("Today" ▾, Top only), and View (Card/Compact toggle) controls above the feed. */
export default function FeedControls({
  sort, view, topWindow, sortMenuOpen, viewMenuOpen, topWindowMenuOpen,
  onToggleSortMenu, onToggleViewMenu, onToggleTopWindowMenu, onCloseMenus, onSelectSort, onSelectView, onSelectTopWindow,
}: FeedControlsProps) {
  return (
    <div className="fk-feed-controls">
      <div className="fk-feed-controls-anchor">
        <button type="button" className={`fk-feed-sort-btn${sortMenuOpen ? ' fk-feed-sort-btn--open' : ''}`} onClick={onToggleSortMenu}>
          {sort}
          <ChevronDownIcon />
        </button>
        <DropdownMenu open={sortMenuOpen} onClose={onCloseMenus} style={{ top: 42, left: 0, width: 180 }}>
          <DropdownMenuTitle>Sort by</DropdownMenuTitle>
          {SORT_OPTIONS.map(option => (
            <DropdownMenuItem key={option} label={option} active={sort === option} onClick={() => onSelectSort(option)} />
          ))}
        </DropdownMenu>
      </div>

      {sort === 'Top' && (
        <div className="fk-feed-controls-anchor">
          <button type="button" className={`fk-feed-sort-btn${topWindowMenuOpen ? ' fk-feed-sort-btn--open' : ''}`} onClick={onToggleTopWindowMenu}>
            {TOP_WINDOW_LABELS[topWindow]}
            <ChevronDownIcon />
          </button>
          <DropdownMenu open={topWindowMenuOpen} onClose={onCloseMenus} style={{ top: 42, left: 0, width: 160 }}>
            <DropdownMenuTitle>Top of</DropdownMenuTitle>
            {TOP_WINDOW_OPTIONS.map(option => (
              <DropdownMenuItem key={option} label={TOP_WINDOW_LABELS[option]} active={topWindow === option} onClick={() => onSelectTopWindow(option)} />
            ))}
          </DropdownMenu>
        </div>
      )}

      <div className="fk-feed-controls-anchor fk-feed-controls-anchor--right">
        <button type="button" className={`fk-feed-view-btn${viewMenuOpen ? ' fk-feed-view-btn--open' : ''}`} onClick={onToggleViewMenu}>
          {view === 'compact' ? <CompactViewIcon /> : <CardViewIcon />}
          <ChevronDownIcon />
        </button>
        <DropdownMenu open={viewMenuOpen} onClose={onCloseMenus} style={{ top: 42, right: 0, width: 200 }}>
          <DropdownMenuTitle>View</DropdownMenuTitle>
          <DropdownMenuItem icon={<CardViewIcon size={20} />} label="Card" active={view === 'card'} onClick={() => onSelectView('card')} />
          <DropdownMenuItem icon={<CompactViewIcon size={20} />} label="Compact" active={view === 'compact'} onClick={() => onSelectView('compact')} />
        </DropdownMenu>
      </div>
    </div>
  );
}
