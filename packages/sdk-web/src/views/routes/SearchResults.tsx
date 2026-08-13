import { useEffect, useState } from 'react';
import type { SearchResult, CommentSearchResult, UserSearchResult } from '@forumkit/types';
import Shell from '../components/layout/shell';
import Thumbnail from '../components/shared/thumbnail';
import Avatar from '../components/shared/avatar';
import RenderedBody from '../components/shared/rendered-body';
import MascotIcon from '../components/layout/mascot-icon';
import PillButton from '../components/shared/pill-button';
import { ChevronLeftIcon, UpvoteIcon, DownvoteIcon } from '../components/shared/icons';
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

type Section = 'all' | 'threads' | 'comments' | 'people' | 'media';

const SECTION_PAGE_SIZE = 20;
const PREVIEW_SIZE = 5;

const SECTION_TABS: { key: Section; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'threads', label: 'Threads' },
  { key: 'comments', label: 'Comments' },
  { key: 'people', label: 'Profiles' },
  { key: 'media', label: 'Media' },
];

// Shared "who posted this, and when" header used by both Thread and
// Comment result rows — same avatar+name+time shape as fk-post-card-head,
// just built from a SearchResult/CommentSearchResult's own author fields
// instead of a full FeedPost/Comment object.
function ResultAuthorHead({ authorId, authorDisplayName, authorAvatarUrl, createdAt }: {
  authorId: string; authorDisplayName: string; authorAvatarUrl: string | null; createdAt: Date;
}) {
  const avatar = authorAvatar(authorId, authorDisplayName);
  return (
    <div className="fk-post-card-head">
      <Avatar size={22} gradient={avatar.gradient} letter={avatar.letter} imageUrl={authorAvatarUrl} />
      <span className="fk-post-card-author">{authorDisplayName}</span>
      <span className="fk-post-card-time">· {fmtRelativeTime(createdAt)}</span>
    </div>
  );
}

function ThreadRow({ result, onOpen }: { result: SearchResult; onOpen: () => void }) {
  return (
    <article className="fk-post-card fk-search-results-thread-row" onClick={onOpen}>
      <ResultAuthorHead
        authorId={result.authorId}
        authorDisplayName={result.authorDisplayName}
        authorAvatarUrl={result.authorAvatarUrl}
        createdAt={result.createdAt}
      />
      <div className="fk-post-card-row">
        <div className="fk-post-card-row-text">
          <h3 className="fk-post-card-title fk-search-results-title fk-clamp-2">{result.title}</h3>
          <RenderedBody body={result.bodySnippet} className="fk-post-card-snippet fk-search-results-snippet" />
        </div>
        {result.imageUrl && (
          <div className="fk-post-card-row-img">
            <Thumbnail gradient="" imageUrl={result.imageUrl} width={150} height={110} radius={14} />
          </div>
        )}
      </div>
      <div className="fk-search-results-row-stats">
        <UpvoteIcon size={12} />{result.voteCounts.up} <DownvoteIcon size={12} />{result.voteCounts.down} · {result.commentCount} comments
      </div>
      <div className="fk-post-card-divider" />
    </article>
  );
}

// A small avatar+name identity line, reused for both the thread's original
// poster (shown above the title) and the comment's own author (shown
// inside the comment card) — neither carries a date in this layout, unlike
// ResultAuthorHead above which is ThreadRow's own header.
function IdentityLine({ userId, displayName, avatarUrl }: { userId: string; displayName: string; avatarUrl: string | null }) {
  const avatar = authorAvatar(userId, displayName);
  return (
    <div className="fk-post-card-head">
      <Avatar size={22} gradient={avatar.gradient} letter={avatar.letter} imageUrl={avatarUrl} />
      <span className="fk-post-card-author">{displayName}</span>
    </div>
  );
}

// Comment results lead with the thread's original poster and title (the
// context a comment hit needs first), then the matching comment itself in
// a visually distinct "card" (its own author + body + vote count), and
// finally a "Go to Thread" link alongside the thread's own totals — kept
// outside the card since those numbers describe the thread, not the
// comment.
function CommentRow({ result, onOpen }: { result: CommentSearchResult; onOpen: () => void }) {
  return (
    <article className="fk-search-results-thread-row">
      <IdentityLine userId={result.threadAuthorId} displayName={result.threadAuthorDisplayName} avatarUrl={result.threadAuthorAvatarUrl} />
      <h3
        className="fk-post-card-title fk-search-results-title fk-clamp-2 fk-search-results-clickable-title"
        onClick={onOpen}
      >
        {result.threadTitle}
      </h3>
      <div className="fk-search-results-comment-card">
        <ResultAuthorHead
          authorId={result.authorId}
          authorDisplayName={result.authorDisplayName}
          authorAvatarUrl={result.authorAvatarUrl}
          createdAt={result.createdAt}
        />
        <RenderedBody body={result.bodySnippet} className="fk-post-card-snippet fk-search-results-snippet" />
        <div className="fk-search-results-comment-card-votes">
          <UpvoteIcon size={12} />{result.commentVoteCounts.up} <DownvoteIcon size={12} />{result.commentVoteCounts.down}
        </div>
      </div>
      <div className="fk-search-results-comment-footer">
        <button type="button" className="fk-search-results-goto-link" onClick={onOpen}>Go to Thread</button>
        <div className="fk-search-results-comment-footer-stats">
          <UpvoteIcon size={12} />{result.threadVoteCounts.up} <DownvoteIcon size={12} />{result.threadVoteCounts.down} · {result.threadCommentCount} comments
        </div>
      </div>
      <div className="fk-post-card-divider" />
    </article>
  );
}

// Media is just thread results that happen to carry an image, shown as a
// grid instead of a row — there's no dedicated "has an image" backend
// query, so this reuses the same thread search results already fetched
// for the Threads tab (see the `threads` state below) and filters down to
// the ones with imageUrl set. Laid out as a brick/masonry grid (CSS
// columns, not a fixed-row grid) so tiles keep each image's natural aspect
// ratio instead of being cropped to a uniform square — a plain <img> (not
// the Thumbnail component's fixed-size background-image div) is what lets
// each tile's height vary and drive the masonry effect.
function MediaTile({ result, onOpen, onImageLoad }: { result: SearchResult; onOpen: () => void; onImageLoad: () => void }) {
  const avatar = authorAvatar(result.authorId, result.authorDisplayName);
  // Images arrive with unknown dimensions (the API doesn't carry width/
  // height), so the browser can't reserve their final height up front —
  // each one popping in at full opacity as it finishes loading, while the
  // column layout keeps rebalancing under it, is what reads as "dazzling."
  // Fading each tile in only once its image has actually loaded smooths
  // that out for incremental (load-more) arrivals; MediaGrid below handles
  // the *first* batch differently (a skeleton until everything's ready)
  // since fading in one at a time over a reflowing layout was still messy.
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="fk-search-results-media-tile" onClick={onOpen}>
      <div className="fk-search-results-media-tile-image">
        {result.imageUrl && (
          <img
            src={result.imageUrl}
            alt=""
            className={loaded ? 'fk-search-results-media-tile-img--loaded' : ''}
            onLoad={() => { setLoaded(true); onImageLoad(); }}
            // A broken/unreachable image must still count as "settled" —
            // otherwise one bad URL in the batch permanently stalls
            // MediaGrid's skeleton, since allLoaded would never become true.
            onError={onImageLoad}
          />
        )}
        {result.mediaCount > 1 && (
          <span className="fk-search-results-media-tile-count">1/{result.mediaCount}</span>
        )}
      </div>
      <div className="fk-search-results-media-tile-author">
        <Avatar size={18} gradient={avatar.gradient} letter={avatar.letter} imageUrl={result.authorAvatarUrl} />
        <span>{result.authorDisplayName}</span>
      </div>
      {/* fk-clamp-2 is the app-wide 2-line clamp (line-clamp: 2 + ellipsis)
          used everywhere a title/snippet needs to wrap but not run on
          forever — same class the feed's compact PostCard title uses. */}
      <div className="fk-search-results-media-tile-title fk-clamp-2">{result.title}</div>
    </div>
  );
}

// Wraps the actual masonry grid: until every tile in the *current* batch
// has finished loading its image, shows a throbbing skeleton grid instead
// (the real grid still renders underneath — hidden, not display:none, so
// its images keep loading and lazy-loading's viewport check still works —
// it's just not what the user sees yet). Once a batch has fully loaded
// once, `everLoaded` latches true and stays true, so later infinite-scroll
// pages don't re-trigger the skeleton and hide already-visible results —
// those just fade in individually via MediaTile's own transition instead.
function MediaGrid({ items, onOpen }: { items: SearchResult[]; onOpen: (threadId: string) => void }) {
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [everLoaded, setEverLoaded] = useState(false);
  const allLoaded = items.length > 0 && items.every(r => loadedIds.has(r.threadId));

  useEffect(() => {
    if (allLoaded) setEverLoaded(true);
  }, [allLoaded]);

  // Safety net: if some image request never fires load *or* error (a
  // stalled connection, not just a 404), don't leave the skeleton spinning
  // forever — reveal whatever's actually ready after a few seconds.
  useEffect(() => {
    const timer = setTimeout(() => setEverLoaded(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  function markLoaded(threadId: string) {
    setLoadedIds(prev => (prev.has(threadId) ? prev : new Set(prev).add(threadId)));
  }

  return (
    <div className="fk-search-results-media-wrap">
      {!everLoaded && (
        <div className="fk-search-results-media-grid fk-search-results-media-skeleton">
          {Array.from({ length: Math.min(items.length, 9) }).map((_, i) => (
            <div key={i} className="fk-search-results-media-skeleton-tile" />
          ))}
        </div>
      )}
      <div className="fk-search-results-media-grid" style={everLoaded ? undefined : { position: 'absolute', top: 0, left: 0, width: '100%', visibility: 'hidden', pointerEvents: 'none' }}>
        {items.map(r => (
          <MediaTile key={r.threadId} result={r} onOpen={() => onOpen(r.threadId)} onImageLoad={() => markLoaded(r.threadId)} />
        ))}
      </div>
    </div>
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
          <span className="fk-search-results-row-karma">{result.karma.toLocaleString()} karma</span>
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
    if (section === 'threads' || section === 'media') {
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

  const drillItems = section === 'threads' || section === 'media' ? threads : section === 'comments' ? comments : people;
  const hasMore = section !== 'all' && drillItems.items.length < drillItems.total;
  const sentinelRef = useInfiniteScroll(() => setDrillPage(p => p + 1), hasMore && !drillItems.loading);
  // Media has no dedicated backend total to compare against (see MediaTile's
  // comment) — "no results"/"loaded" checks for it use this filtered count
  // instead of drillItems.items.length, which is the raw (unfiltered) thread
  // count and would under-report how often the grid is actually empty.
  const mediaItems = threads.items.filter(r => r.imageUrl);

  return (
    <Shell>
      {/* fk-profile is the existing "narrow centered content column" layout
          already used by the Profile route, widened here via
          fk-search-results-wide's own max-width override — this page has
          no right rail competing for space, so it can use more of the
          screen while margin:0 auto still keeps it centered. No
          scopeTag/compactSearch here either — the search pill should look
          exactly like it does on Feed/Profile, not the shrunk "in-page"
          variant. */}
      <div className="fk-profile fk-search-results-wide">
        {state.history.length > 0 && (
          <PillButton variant="surface" icon={<ChevronLeftIcon />} onClick={goBack} style={{ marginBottom: 14 }}>Back</PillButton>
        )}

        <div className="fk-profile-tabs fk-search-results-tabs">
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
            <div className="fk-profile-divider" />

            <div className="fk-profile-filter-row">
              <div className="fk-profile-filter-label">Media</div>
            </div>
            {threads.loading && threads.items.length === 0 ? (
              <div className="fk-search-dropdown-status"><MascotIcon size={32} /></div>
            ) : mediaItems.length === 0 ? (
              <div className="fk-search-dropdown-status">No matching media</div>
            ) : (
              <MediaGrid key={query} items={mediaItems} onOpen={openThread} />
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
            {section === 'media' && mediaItems.length > 0 && (
              <MediaGrid key={query} items={mediaItems} onOpen={openThread} />
            )}
            {(section === 'media' ? mediaItems.length === 0 : drillItems.items.length === 0) && !drillItems.loading && (
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
