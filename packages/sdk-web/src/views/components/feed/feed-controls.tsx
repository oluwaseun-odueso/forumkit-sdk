import DropdownMenu, { DropdownMenuTitle, DropdownMenuItem } from '../shared/dropdown-menu';
import { ChevronDownIcon, CompactViewIcon, CardViewIcon } from '../shared/icons';
import type { FeedSort, FeedView } from '../../hooks/use-forum-state';
import './feed-controls.css';

const SORT_OPTIONS: FeedSort[] = ['Best', 'Hot', 'New', 'Top', 'Rising'];

type FeedControlsProps = {
  sort: FeedSort;
  view: FeedView;
  sortMenuOpen: boolean;
  viewMenuOpen: boolean;
  onToggleSortMenu: () => void;
  onToggleViewMenu: () => void;
  onCloseMenus: () => void;
  onSelectSort: (sort: FeedSort) => void;
  onSelectView: (view: FeedView) => void;
};

/** The Sort ("Best" ▾) and View (Card/Compact toggle) controls above the feed. */
export default function FeedControls({
  sort, view, sortMenuOpen, viewMenuOpen,
  onToggleSortMenu, onToggleViewMenu, onCloseMenus, onSelectSort, onSelectView,
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

      <div className="fk-feed-controls-anchor">
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
