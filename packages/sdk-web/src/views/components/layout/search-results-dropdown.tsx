import type { SearchResult } from '@forumkit/types';
import Thumbnail from '../shared/thumbnail';
import RenderedBody from '../shared/rendered-body';
import './search-results-dropdown.css';

type SearchResultsDropdownProps = {
  loading: boolean;
  results: SearchResult[];
  query: string;
  onClose: () => void;
  onSelectResult: (threadId: string) => void;
  onSeeMore: () => void;
};

/**
 * The live preview panel that appears under the top-nav search pill as the
 * user types (debounced in use-forum-state.tsx). A transparent full-viewport
 * backdrop closes it on outside click, same pattern as
 * components/shared/dropdown-menu.tsx, but this one needs its own row
 * layout (title + snippet) rather than the generic label rows that shares.
 */
export default function SearchResultsDropdown({
  loading, results, query, onClose, onSelectResult, onSeeMore,
}: SearchResultsDropdownProps) {
  return (
    <>
      <div className="fk-search-dropdown-backdrop" onClick={onClose} />
      <div className="fk-search-dropdown-panel">
        {loading && results.length === 0 ? (
          <div className="fk-search-dropdown-status">Searching…</div>
        ) : results.length === 0 ? (
          <div className="fk-search-dropdown-status">No results for &ldquo;{query}&rdquo;</div>
        ) : (
          <>
            {results.map(r => (
              <button
                key={r.threadId}
                type="button"
                className="fk-search-dropdown-row"
                onClick={() => onSelectResult(r.threadId)}
              >
                {r.imageUrl && (
                  <Thumbnail gradient="" imageUrl={r.imageUrl} width={40} height={40} radius={8} />
                )}
                <span className="fk-search-dropdown-row-text">
                  <span className="fk-search-dropdown-row-title">{r.title}</span>
                  <RenderedBody body={r.bodySnippet} className="fk-search-dropdown-row-snippet fk-clamp-2" />
                </span>
              </button>
            ))}
            <button type="button" className="fk-search-dropdown-see-more" onClick={onSeeMore}>
              See more results
            </button>
          </>
        )}
      </div>
    </>
  );
}
