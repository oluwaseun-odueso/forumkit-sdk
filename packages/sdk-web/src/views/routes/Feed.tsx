import Shell from '../components/layout/shell';
import RightRail from '../components/layout/right-rail';
import FeedControls from '../components/feed/feed-controls';
import PostCard from '../components/feed/post-card';
import { useForum } from '../hooks/use-forum-state';
import './feed.css';

export function Feed() {
  const {
    state, sortedPosts, communities, latestItems, similarItems, trendingItems,
    openThread, setFeedView, setFeedSort, toggleSortMenu, toggleViewMenu,
    closeFeedMenus, setPostMenu, toggleSavePost, votePost,
  } = useForum();

  return (
    <Shell
      rail={
        <RightRail
          communities={communities}
          latestItems={latestItems}
          similarItems={similarItems}
          trendingItems={trendingItems}
          onOpenPost={openThread}
        />
      }
    >
      <div className="fk-feed">
        <FeedControls
          sort={state.feed.sort}
          view={state.feed.view}
          sortMenuOpen={state.feed.sortMenuOpen}
          viewMenuOpen={state.feed.viewMenuOpen}
          onToggleSortMenu={toggleSortMenu}
          onToggleViewMenu={toggleViewMenu}
          onCloseMenus={closeFeedMenus}
          onSelectSort={setFeedSort}
          onSelectView={setFeedView}
        />
        {sortedPosts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            community={communities.find(c => c.id === post.communityId)}
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
      </div>
    </Shell>
  );
}
