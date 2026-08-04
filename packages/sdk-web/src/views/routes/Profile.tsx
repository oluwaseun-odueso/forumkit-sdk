import { useState } from 'react';
import Shell from '../components/layout/shell';
import ProfileHeader from '../components/profile/profile-header';
import ProfileTabs from '../components/profile/profile-tabs';
import ProfileEmptyState from '../components/profile/profile-empty-state';
import ProfileRightRail from '../components/profile/profile-right-rail';
import ProfileCommentCard from '../components/profile/profile-comment-card';
import PostCard from '../components/feed/post-card';
import MascotIcon from '../components/layout/mascot-icon';
import IconButton from '../components/shared/icon-button';
import PillButton from '../components/shared/pill-button';
import DropdownMenu, { DropdownMenuItem } from '../components/shared/dropdown-menu';
import { EyeIcon, ChevronDownIcon, PlusIcon, FilterIcon } from '../components/shared/icons';
import { useForum } from '../hooks/use-forum-state';
import { useInfiniteScroll } from '../hooks/use-infinite-scroll';
import './profile.css';

const MIXED_TABS = new Set(['Overview', 'Upvoted', 'Downvoted']);

const CONTENT_TYPE_LABEL: Record<string, string> = {
  all: 'Showing all content',
  posts: 'Showing posts only',
  comments: 'Showing comments only',
};

function formatCakeDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(-2)}`;
}

export function Profile() {
  const {
    state, setProfileTab, setProfileSort, setProfileContentType, loadMoreProfileActivity,
    openComposer, openThread, openSettings, votePost, toggleSavePost, setPostMenu,
  } = useForum();
  const [contentMenuOpen, setContentMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const { profile } = state;
  const username = profile.displayName || 'You';
  const hasMore = profile.activityItems.length < profile.activityTotal;
  const sentinelRef = useInfiniteScroll(loadMoreProfileActivity, hasMore && !profile.activityLoading);
  const showContentFilter = MIXED_TABS.has(profile.activeTab);

  return (
    <Shell
      scopeTag={username}
      scrollMain={false}
      rail={
        <ProfileRightRail
          username={username}
          handle={username}
          postKarma={profile.postKarma}
          commentKarma={profile.commentKarma}
          cakeDay={formatCakeDay(profile.joinedAt)}
        />
      }
    >
      <div className="fk-profile">
        <ProfileHeader username={username} handle={username} avatarUrl={profile.avatarUrl} onEditAvatar={openSettings} />
        <ProfileTabs active={profile.activeTab} onSelect={setProfileTab} />

        <div className="fk-profile-filter-row">
          {showContentFilter ? (
            <div style={{ position: 'relative' }}>
              <button type="button" className="fk-profile-filter-label" onClick={() => setContentMenuOpen(o => !o)}>
                <EyeIcon />
                {CONTENT_TYPE_LABEL[profile.activityContentType]}
                <ChevronDownIcon size={22} />
              </button>
              <DropdownMenu open={contentMenuOpen} onClose={() => setContentMenuOpen(false)} style={{ top: 40, left: 0, width: 220, padding: 6 }}>
                <DropdownMenuItem label="All content" onClick={() => { setProfileContentType('all'); setContentMenuOpen(false); }} />
                <DropdownMenuItem label="Posts only" onClick={() => { setProfileContentType('posts'); setContentMenuOpen(false); }} />
                <DropdownMenuItem label="Comments only" onClick={() => { setProfileContentType('comments'); setContentMenuOpen(false); }} />
              </DropdownMenu>
            </div>
          ) : (
            <div className="fk-profile-filter-label">
              <EyeIcon />
              Showing all content
            </div>
          )}
        </div>
        <div className="fk-profile-actions-row">
          <PillButton variant="outline" icon={<PlusIcon size={18} />} onClick={openComposer}>Create Post</PillButton>
          <div style={{ position: 'relative' }}>
            <IconButton label="Filter and sort" size={38} onClick={() => setSortMenuOpen(o => !o)}><FilterIcon /></IconButton>
            <DropdownMenu open={sortMenuOpen} onClose={() => setSortMenuOpen(false)} style={{ top: 42, right: 0, width: 140, padding: 6 }}>
              <DropdownMenuItem
                label="New"
                onClick={() => { setProfileSort('new'); setSortMenuOpen(false); }}
              />
              <DropdownMenuItem
                label="Top"
                onClick={() => { setProfileSort('top'); setSortMenuOpen(false); }}
              />
            </DropdownMenu>
          </div>
        </div>
        <div className="fk-profile-divider" />

        {profile.activityItems.length === 0 && !profile.activityLoading ? (
          <ProfileEmptyState tab={profile.activeTab} onUpdateSettings={openSettings} />
        ) : (
          <>
            {profile.activityItems.map(item => item.kind === 'thread' ? (
              <PostCard
                key={item.thread.id}
                post={item.thread}
                view="compact"
                vote={item.thread.myVote ?? 0}
                saved={item.thread.saved}
                menuOpen={state.feed.openPostMenuId === item.thread.id}
                onOpen={() => openThread(item.thread.id)}
                onVote={dir => votePost(item.thread.id, dir)}
                onToggleMenu={() => setPostMenu(state.feed.openPostMenuId === item.thread.id ? null : item.thread.id)}
                onCloseMenu={() => setPostMenu(null)}
                onSave={() => toggleSavePost(item.thread.id)}
              />
            ) : (
              <ProfileCommentCard
                key={item.comment.id}
                comment={item.comment}
                threadTitle={item.threadTitle}
                replyingTo={item.replyingTo}
                onOpen={() => openThread(item.threadId)}
              />
            ))}
            {hasMore && <div ref={sentinelRef} />}
            {profile.activityLoading && (
              <div className="fk-feed-loading-more">
                <MascotIcon size={36} />
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
