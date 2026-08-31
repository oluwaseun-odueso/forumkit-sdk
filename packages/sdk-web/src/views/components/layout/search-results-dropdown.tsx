import type { SearchResult } from '@forumkit/types';
import type { RailItem } from '../../hooks/use-forum-state';
import Thumbnail from '../shared/thumbnail';
import RenderedBody from '../shared/rendered-body';
import { ClockIcon } from '../shared/icons';
import './search-results-dropdown.css';

const HISTORY_KEY = 'fk_search_history';
const MAX_HISTORY = 10;

export function saveSearchHistory(query: string): void {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const current: string[] = raw ? JSON.parse(raw) : [];
    const deduped = [query, ...current.filter((q: string) => q !== query)].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(deduped));
  } catch { /* best-effort */ }
}

export function loadSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function removeFromSearchHistory(query: string): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const current: string[] = raw ? JSON.parse(raw) : [];
    const next = current.filter((q: string) => q !== query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
}

type SearchResultsDropdownProps = {
  loading: boolean;
  results: SearchResult[];
  query: string;
  onClose: () => void;
  onSelectResult: (threadId: string) => void;
  onSeeMore: () => void;
  latestPosts?: RailItem[] | undefined;
  featuredPosts?: RailItem[] | undefined;
  onOpenPost?: ((id: string) => void) | undefined;
  // Called when history is modified (parent re-reads and re-renders)
  onHistoryChange?: ((history: string[]) => void) | undefined;
  history?: string[] | undefined;
  // Triggered when a history row is tapped — parent sets the query AND submits
  onSelectHistory?: ((query: string) => void) | undefined;
};

/**
 * The live preview panel that appears under the top-nav search pill as the
 * user types (debounced in use-forum-state.tsx). A transparent full-viewport
 * backdrop closes it on outside click, same pattern as
 * components/shared/dropdown-menu.tsx, but this one needs its own row
 * layout (title + snippet) rather than the generic label rows that shares.
 *
 * When the query is empty, shows search history and latest/featured posts
 * instead of search results.
 */
export default function SearchResultsDropdown({
  loading, results, query, onClose, onSelectResult, onSeeMore,
  latestPosts, featuredPosts, onOpenPost, onHistoryChange, history = [], onSelectHistory,
}: SearchResultsDropdownProps) {
  const isEmpty = !query.trim();

  function handleRemoveHistory(q: string) {
    const next = removeFromSearchHistory(q);
    onHistoryChange?.(next);
  }

  function handleHistoryClick(q: string) {
    onSelectHistory?.(q);
  }

  return (
    <>
      <div className="fk-search-dropdown-backdrop" onClick={onClose} />
      <div className="fk-search-dropdown-panel">
        {isEmpty ? (
          <>
            {/* Search history */}
            {history.length > 0 && (
              <div className="fk-search-dropdown-section">
                <div className="fk-search-dropdown-section-title">Recent</div>
                {history.map(q => (
                  <div key={q} className="fk-search-dropdown-history-row">
                    <button
                      type="button"
                      className="fk-search-dropdown-history-main"
                      onClick={() => handleHistoryClick(q)}
                    >
                      <ClockIcon size={14} />
                      <span className="fk-search-dropdown-history-text">{q}</span>
                    </button>
                    <button
                      type="button"
                      className="fk-search-dropdown-history-clear"
                      aria-label="Remove"
                      onClick={() => handleRemoveHistory(q)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Latest posts */}
            {latestPosts && latestPosts.length > 0 && (
              <div className="fk-search-dropdown-section">
                <div className="fk-search-dropdown-section-title">Latest</div>
                {latestPosts.slice(0, 5).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="fk-search-dropdown-row"
                    onClick={() => { onClose(); onOpenPost?.(item.id); }}
                  >
                    {item.imageUrl && (
                      <Thumbnail gradient={item.thumbGradient ?? ''} imageUrl={item.imageUrl} width={40} height={40} radius={8} />
                    )}
                    <span className="fk-search-dropdown-row-text">
                      <span className="fk-search-dropdown-row-title">{item.title}</span>
                      <span className="fk-search-dropdown-row-snippet">{item.author} · {item.time}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Featured posts */}
            {featuredPosts && featuredPosts.length > 0 && (
              <div className="fk-search-dropdown-section">
                <div className="fk-search-dropdown-section-title">Featured</div>
                {featuredPosts.slice(0, 4).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="fk-search-dropdown-row"
                    onClick={() => { onClose(); onOpenPost?.(item.id); }}
                  >
                    {item.imageUrl && (
                      <Thumbnail gradient={item.thumbGradient ?? ''} imageUrl={item.imageUrl} width={40} height={40} radius={8} />
                    )}
                    <span className="fk-search-dropdown-row-text">
                      <span className="fk-search-dropdown-row-title">{item.title}</span>
                      <span className="fk-search-dropdown-row-snippet">{item.author} · {item.time}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {history.length === 0 && (!latestPosts || latestPosts.length === 0) && (
              <div className="fk-search-dropdown-status">Search posts, comments, and people</div>
            )}
          </>
        ) : loading && results.length === 0 ? (
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
