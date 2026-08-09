import { useEffect, useState } from 'react';
import type { SearchResult, CommentSearchResult, UserSearchResult } from '@forumkit/types';
import Shell from '../components/layout/shell';
import Thumbnail from '../components/shared/thumbnail';
import Avatar from '../components/shared/avatar';
import RenderedBody from '../components/shared/rendered-body';
import MascotIcon from '../components/layout/mascot-icon';
import PillButton from '../components/shared/pill-button';
import { ChevronLeftIcon } from '../components/shared/icons';
import { fmtRelativeTime } from '../lib/format-time';
import { authorAvatar } from '../lib/author-avatar';
import { searchThreads, searchComments, searchUsers } from '../api/search';
import { useForum } from '../hooks/use-forum-state';
import { useInfiniteScroll } from '../hooks/use-infinite-scroll';
// Reuses the top-nav dropdown's row/status classes (fk-search-dropdown-row
// etc.) instead of a parallel stylesheet — this page is a bigger, paginated
// version of the same "search result row" the dropdown already renders.
import '../components/layout/search-results-dropdown.css';
// Threads are sized like the feed/profile "compact" PostCard view, so this
// reuses that view's own row/title/snippet classes (fk-post-card-row etc.)
// rather than inventing a second set of near-identical sizing rules.
import '../components/feed/post-card.css';
// The section tabs (All/Threads/Comments/Profiles) reuse ProfileTabs' own
// pill-tab styling (fk-profile-tabs/-tab) rather than a third near-identical
// tab implementation.
import '../components/profile/profile-tabs.css';

type Section = 'all' | 'threads' | 'comments' | 'people';

const SECTION_PAGE_SIZE = 20;
const PREVIEW_SIZE = 5;

const SECTION_TABS: { key: Section; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'threads', label: 'Threads' },
  { key: 'comments', label: 'Comments' },
  { key: 'people', label: 'Profiles' },
];

function ThreadRow({ result, onOpen }: { result: SearchResult; onOpen: () => void }) {
  const netVotes = result.voteCounts.up - result.voteCounts.down;
  return (
    <article className="fk-post-card fk-search-results-thread-row" onClick={onOpen}>
      <div className="fk-post-card-row">
        <div className="fk-post-card-row-text">
          <h3 className="fk-post-card-title fk-clamp-2">{result.title}</h3>
          <RenderedBody body={result.bodySnippet} className="fk-post-card-snippet" />
          <span className="fk-search-results-row-time">{fmtRelativeTime(result.createdAt)}</span>
        </div>
        {result.imageUrl && (
          <div className="fk-post-card-row-img">
            <Thumbnail gradient="" imageUrl={result.imageUrl} width={150} height={110} radius={14} />
          </div>
        )}
      </div>
      <div className="fk-search-results-row-stats">{netVotes} votes · {result.commentCount} comments</div>
      <div className="fk-post-card-divider" />
    </article>
  );
}

function CommentRow({ result, onOpen }: { result: CommentSearchResult; onOpen: () => void }) {
  return (
    <article className="fk-post-card fk-search-results-thread-row" onClick={onOpen}>
      <div className="fk-post-card-row">
        <div className="fk-post-card-row-text">
          <h3 className="fk-post-card-title fk-clamp-2">
            Commented on {result.threadTitle}
          </h3>
          <RenderedBody body={result.bodySnippet} className="fk-post-card-snippet" />
          <span className="fk-search-results-row-time">{fmtRelativeTime(result.createdAt)}</span>
        </div>
        {result.imageUrl && (
          <div className="fk-post-card-row-img">
            <Thumbnail gradient="" imageUrl={result.imageUrl} width={150} height={110} radius={14} />
          </div>
        )}
      </div>
      <div className="fk-post-card-divider" />
    </article>
  );
}

function PersonRow({ result, onOpen }: { result: UserSearchResult; onOpen: () => void }) {
  const { gradient, letter } = authorAvatar(result.id, result.displayName);
  return (
    <div className="fk-search-results-person-row">
      <button type="button" className="fk-search-dropdown-row fk-search-results-row" onClick={onOpen}>
        <Avatar size={40} gradient={gradient} letter={letter} imageUrl={result.avatarUrl} />
        <span className="fk-search-dropdown-row-text">
          <span className="fk-search-dropdown-row-title">{result.displayName}</span>
        </span>
      </button>
      <div className="fk-post-card-divider" />
    </div>
  );
}

/**
 * The full search results page, reached via "See more results" in the
 * top-nav dropdown or by pressing Enter in the search box. A row of tabs
 * (All/Threads/Comments/Profiles) picks `state.search.resultsSection`: 'all'
 * shows a short preview of all three result types stacked, any other tab
 * shows one fully paginated list for just that type. Each section fetches
 * its own data locally (rather than through the global reducer) since this
 * page's data is transient and not needed anywhere else in the app.
 */
export function SearchResults() {
  const {
    state, openSearchResultsSection, openThread, openUserProfile, goBack,
    forumId: fid, sessionToken: token,
  } = useForum();
  const query = state.search.resultsQuery;
  const section = state.search.resultsSection as Section;

  const [threads, setThreads] = useState<{ items: SearchResult[]; total: number; loading: boolean }>({ items: [], total: 0, loading: false });
  const [comments, setComments] = useState<{ items: CommentSearchResult[]; total: number; loading: boolean }>({ items: [], total: 0, loading: false });
  const [people, setPeople] = useState<{ items: UserSearchResult[]; total: number; loading: boolean }>({ items: [], total: 0, loading: false });

  // The "all" preview always fetches a small page of every section on
  // mount/query change so the three sections can render side by side.
  useEffect(() => {
    if (!fid || !query) return;
    setThreads(s => ({ ...s, loading: true }));
    searchThreads(fid, query, { limit: PREVIEW_SIZE }, token)
      .then(r => setThreads({ items: r.results, total: r.total, loading: false }))
      .catch(() => setThreads({ items: [], total: 0, loading: false }));

    setComments(s => ({ ...s, loading: true }));
    searchComments(fid, query, { limit: PREVIEW_SIZE }, token)
      .then(r => setComments({ items: r.results, total: r.total, loading: false }))
      .catch(() => setComments({ items: [], total: 0, loading: false }));

    setPeople(s => ({ ...s, loading: true }));
    searchUsers(fid, query, { limit: PREVIEW_SIZE }, token)
      .then(r => setPeople({ items: r.results, total: r.total, loading: false }))
      .catch(() => setPeople({ items: [], total: 0, loading: false }));
  }, [fid, token, query]);

  // A drill-down section instead paginates through its own full result set,
  // independent of the other two sections' preview data above.
  const [drillPage, setDrillPage] = useState(1);
  useEffect(() => setDrillPage(1), [section, query]);

  useEffect(() => {
    if (!fid || !query || section === 'all') return;
    const opts = { page: drillPage, limit: SECTION_PAGE_SIZE };
    if (section === 'threads') {
      setThreads(s => ({ ...s, loading: true }));
      searchThreads(fid, query, opts, token)
        .then(r => setThreads(s => ({ items: drillPage === 1 ? r.results : [...s.items, ...r.results], total: r.total, loading: false })))
        .catch(() => setThreads(s => ({ ...s, loading: false })));
    } else if (section === 'comments') {
      setComments(s => ({ ...s, loading: true }));
      searchComments(fid, query, opts, token)
        .then(r => setComments(s => ({ items: drillPage === 1 ? r.results : [...s.items, ...r.results], total: r.total, loading: false })))
        .catch(() => setComments(s => ({ ...s, loading: false })));
    } else {
      setPeople(s => ({ ...s, loading: true }));
      searchUsers(fid, query, opts, token)
        .then(r => setPeople(s => ({ items: drillPage === 1 ? r.results : [...s.items, ...r.results], total: r.total, loading: false })))
        .catch(() => setPeople(s => ({ ...s, loading: false })));
    }
  }, [fid, token, query, section, drillPage]);

  const drillItems = section === 'threads' ? threads : section === 'comments' ? comments : people;
  const hasMore = section !== 'all' && drillItems.items.length < drillItems.total;
  const sentinelRef = useInfiniteScroll(() => setDrillPage(p => p + 1), hasMore && !drillItems.loading);

  return (
    <Shell mainMaxWidth={1200}>
      {/* fk-profile is the existing "narrow centered content column" layout
          already used by the Profile route, widened here via
          fk-search-results-wide (and Shell's mainMaxWidth above, since the
          shell's own column is normally capped narrower than that) — this
          page has no right rail competing for space, so it can use more of
          the screen while margin:0 auto still keeps it centered. No
          scopeTag/compactSearch here either — the search pill should look
          exactly like it does on Feed/Profile, not the shrunk "in-page"
          variant. */}
      <div className="fk-profile fk-search-results-wide">
        {state.history.length > 0 && (
          <PillButton variant="surface" icon={<ChevronLeftIcon />} onClick={goBack} style={{ marginBottom: 14 }}>Back</PillButton>
        )}

        <div className="fk-profile-tabs">
          {SECTION_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`fk-profile-tab${section === tab.key ? ' fk-profile-tab--active' : ''}`}
              onClick={() => openSearchResultsSection(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {section === 'all' ? (
          <>
            <div className="fk-profile-filter-row">
              <div className="fk-profile-filter-label">Threads</div>
            </div>
            {threads.loading && threads.items.length === 0 ? (
              <div className="fk-search-dropdown-status"><MascotIcon size={32} /></div>
            ) : threads.items.length === 0 ? (
              <div className="fk-search-dropdown-status">No matching threads</div>
            ) : (
              threads.items.map(r => <ThreadRow key={r.threadId} result={r} onOpen={() => openThread(r.threadId)} />)
            )}
            <div className="fk-profile-divider" />

            <div className="fk-profile-filter-row">
              <div className="fk-profile-filter-label">Comments</div>
            </div>
            {comments.loading && comments.items.length === 0 ? (
              <div className="fk-search-dropdown-status"><MascotIcon size={32} /></div>
            ) : comments.items.length === 0 ? (
              <div className="fk-search-dropdown-status">No matching comments</div>
            ) : (
              comments.items.map(r => <CommentRow key={r.commentId} result={r} onOpen={() => openThread(r.threadId)} />)
            )}
            <div className="fk-profile-divider" />

            <div className="fk-profile-filter-row">
              <div className="fk-profile-filter-label">People</div>
            </div>
            {people.loading && people.items.length === 0 ? (
              <div className="fk-search-dropdown-status"><MascotIcon size={32} /></div>
            ) : people.items.length === 0 ? (
              <div className="fk-search-dropdown-status">No matching people</div>
            ) : (
              people.items.map(r => <PersonRow key={r.id} result={r} onOpen={() => openUserProfile(r.id)} />)
            )}
          </>
        ) : (
          <>
            {section === 'threads' && threads.items.map(r => (
              <ThreadRow key={r.threadId} result={r} onOpen={() => openThread(r.threadId)} />
            ))}
            {section === 'comments' && comments.items.map(r => (
              <CommentRow key={r.commentId} result={r} onOpen={() => openThread(r.threadId)} />
            ))}
            {section === 'people' && people.items.map(r => (
              <PersonRow key={r.id} result={r} onOpen={() => openUserProfile(r.id)} />
            ))}
            {drillItems.items.length === 0 && !drillItems.loading && (
              <div className="fk-search-dropdown-status">No results</div>
            )}
            {hasMore && <div ref={sentinelRef} />}
            {drillItems.loading && drillItems.items.length > 0 && (
              <div className="fk-search-dropdown-status"><MascotIcon size={32} /></div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
