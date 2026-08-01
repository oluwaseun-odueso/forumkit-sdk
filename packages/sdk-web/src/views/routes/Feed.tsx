import Shell from '../components/layout/shell';
import RightRail from '../components/layout/right-rail';
import FeedControls from '../components/feed/feed-controls';
import PostCard from '../components/feed/post-card';
import MascotIcon from '../components/layout/mascot-icon';
import { useForum } from '../hooks/use-forum-state';
import { useInfiniteScroll } from '../hooks/use-infinite-scroll';
import './feed.css';

export function Feed() {
  const {
    state, sortedPosts,
    openThread, setFeedView, setFeedSort, setTopWindow, loadMorePosts,
    toggleSortMenu, toggleViewMenu, toggleTopWindowMenu,
    closeFeedMenus, setPostMenu, toggleSavePost, votePost,
  } = useForum();

  const sentinelRef = useInfiniteScroll(loadMorePosts, state.feed.hasMore && !state.feed.loadingMore);

  return (
    <Shell
      rail={
        <RightRail
          sections={{ latest: state.rail.latest, featured: state.rail.featured }}
          onOpenPost={openThread}
        />
      }
    >
      <div className="fk-feed">
        <FeedControls
          sort={state.feed.sort}
          view={state.feed.view}
          topWindow={state.feed.topWindow}
          sortMenuOpen={state.feed.sortMenuOpen}
          viewMenuOpen={state.feed.viewMenuOpen}
          topWindowMenuOpen={state.feed.topWindowMenuOpen}
          onToggleSortMenu={toggleSortMenu}
          onToggleViewMenu={toggleViewMenu}
          onToggleTopWindowMenu={toggleTopWindowMenu}
          onCloseMenus={closeFeedMenus}
          onSelectSort={setFeedSort}
          onSelectView={setFeedView}
          onSelectTopWindow={setTopWindow}
        />
        {sortedPosts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            view={state.feed.view}
            vote={post.myVote ?? 0}
            saved={state.feed.saved[post.id] ?? false}
            menuOpen={state.feed.openPostMenuId === post.id}
            onOpen={() => openThread(post.id)}
            onVote={dir => votePost(post.id, dir)}
            onToggleMenu={() => setPostMenu(state.feed.openPostMenuId === post.id ? null : post.id)}
            onCloseMenu={() => setPostMenu(null)}
            onSave={() => toggleSavePost(post.id)}
          />
        ))}
        {state.feed.hasMore && <div ref={sentinelRef} />}
        {state.feed.loadingMore && (
          <div className="fk-feed-loading-more">
            <MascotIcon size={36} />
          </div>
        )}
      </div>
    </Shell>
  );
}
