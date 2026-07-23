import DropdownMenu, { DropdownMenuItem } from '../shared/dropdown-menu';
import { RocketIcon, TopIcon, ControversialIcon, OldIcon, ChevronDownIcon, SearchIcon } from '../shared/icons';
import type { CommentSort as CommentSortMode } from '../../hooks/use-forum-state';
import './comment-sort.css';

const OPTIONS: { id: CommentSortMode; icon: React.ReactNode }[] = [
  { id: 'Best', icon: <RocketIcon /> },
  { id: 'Top', icon: <TopIcon /> },
  { id: 'Controversial', icon: <ControversialIcon /> },
  { id: 'Old', icon: <OldIcon /> },
];

type CommentSortProps = {
  sort: CommentSortMode;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelect: (sort: CommentSortMode) => void;
  commentSearch: string;
  onCommentSearchChange: (q: string) => void;
};

export default function CommentSort({ sort, open, onToggle, onClose, onSelect, commentSearch, onCommentSearchChange }: CommentSortProps) {
  return (
    <div className="fk-comment-sort">
      <span className="fk-comment-sort-label">Sort by:</span>
      <div className="fk-comment-sort-anchor">
        <button type="button" className="fk-comment-sort-btn" onClick={onToggle}>
          {sort}
          <ChevronDownIcon />
        </button>
        <DropdownMenu open={open} onClose={onClose} style={{ top: 42, left: 0, width: 200, padding: 6 }}>
          {OPTIONS.map(option => (
            <DropdownMenuItem
              key={option.id}
              icon={option.icon}
              label={option.id}
              active={sort === option.id}
              onClick={() => onSelect(option.id)}
            />
          ))}
        </DropdownMenu>
      </div>
      <div className="fk-comment-search">
        <SearchIcon size={16} />
        <input
          className="fk-comment-search-input"
          placeholder="Search Comments"
          value={commentSearch}
          onChange={e => onCommentSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
