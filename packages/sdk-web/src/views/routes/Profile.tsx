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

// Shared markup for the eye-icon filter label — used both as a clickable
// button (Overview/Upvoted/Downvoted, which can filter by content type,
// hence the chevron) and as an inert label (Posts/Comments/Saved, which
// can't) — one component so the eye icon and, where shown, the chevron
// always render at the same size instead of two hand-written copies
// drifting apart.
function ProfileFilterLabel({ label, showChevron, onClick }: { label: string; showChevron: boolean; onClick?: () => void }) {
  const content = (
    <>
      <EyeIcon />
      {label}
      {showChevron && <ChevronDownIcon size={22} />}
    </>
  );
  return onClick
    ? <button type="button" className="fk-profile-filter-label" onClick={onClick}>{content}</button>
    : <div className="fk-profile-filter-label">{content}</div>;
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
      rail={
        <ProfileRightRail
          username={username}
          handle={username}
          postKarma={profile.postKarma}
          commentKarma={profile.commentKarma}
        />
      }
    >
      <div className="fk-profile">
        <ProfileHeader username={username} handle={username} avatarUrl={profile.avatarUrl} bannerUrl={profile.bannerUrl} onEditAvatar={openSettings} />
        <ProfileTabs active={profile.activeTab} onSelect={setProfileTab} />

        <div className="fk-profile-filter-row">
          {showContentFilter ? (
            <div style={{ position: 'relative' }}>
              <ProfileFilterLabel
                label={CONTENT_TYPE_LABEL[profile.activityContentType] ?? 'Showing all content'}
                showChevron
                onClick={() => setContentMenuOpen(o => !o)}
              />
              <DropdownMenu open={contentMenuOpen} onClose={() => setContentMenuOpen(false)} style={{ top: 40, left: 0, width: 220, padding: 6 }}>
                <DropdownMenuItem label="All content" onClick={() => { setProfileContentType('all'); setContentMenuOpen(false); }} />
                <DropdownMenuItem label="Posts only" onClick={() => { setProfileContentType('posts'); setContentMenuOpen(false); }} />
                <DropdownMenuItem label="Comments only" onClick={() => { setProfileContentType('comments'); setContentMenuOpen(false); }} />
              </DropdownMenu>
            </div>
          ) : (
            <ProfileFilterLabel label="Showing all content" showChevron={false} />
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
