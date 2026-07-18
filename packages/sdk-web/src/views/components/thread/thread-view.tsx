import { useState } from 'react';
import type { useForum } from '../../hooks/use-forum-state';
import Avatar from '../shared/avatar';
import Thumbnail from '../shared/thumbnail';
import VotePill from '../shared/vote-pill';
import PillButton from '../shared/pill-button';
import { ChevronLeftIcon, CommentIcon, ShareIcon } from '../shared/icons';
import CommentSort from './comment-sort';
import Comment from './comment';
import './thread-view.css';

type ThreadViewProps = {
  forum: ReturnType<typeof useForum>;
  onBack: () => void;
};

export default function ThreadView({ forum, onBack }: ThreadViewProps) {
  const {
    state, activePost, sortedComments, communities,
    votePost, voteComment, setCommentInput, submitComment, setCommentSort, toggleCommentCollapsed,
  } = forum;
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  if (!activePost) return null;
  const community = communities.find(c => c.id === activePost.communityId);

  return (
    <div className="fk-thread">
      <PillButton variant="surface" icon={<ChevronLeftIcon />} onClick={onBack}>Back</PillButton>

      <div className="fk-thread-head">
        {community && <Avatar size={26} gradient={community.gradient} letter={community.letter} />}
        <span className="fk-thread-community">{community?.name}</span>
        <span className="fk-thread-time">· {activePost.time}</span>
      </div>

      <h1 className="fk-thread-title">{activePost.title}</h1>
      <p className="fk-thread-body">{activePost.body}</p>
      <Thumbnail gradient={activePost.thumbGradient} height={340} radius={16} style={{ marginBottom: 16 }} />

      <div className="fk-thread-actions">
        <VotePill votes={activePost.votes} dir={state.feed.votes[activePost.id] ?? 0} onVote={dir => votePost(activePost.id, dir)} />
        <div className="fk-thread-chip fk-thread-chip--static">
          <CommentIcon size={18} />
          {activePost.commentCount}
        </div>
        <button type="button" className="fk-thread-chip">
          <ShareIcon size={18} />
          Share
        </button>
      </div>

      <div className="fk-thread-composer">
        <input
          className="fk-thread-composer-input"
          placeholder="Add a comment"
          value={state.thread.commentInput}
          onChange={e => setCommentInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
        />
        <PillButton variant="accent" onClick={submitComment}>Comment</PillButton>
      </div>

      <CommentSort
        sort={state.thread.commentSort}
        open={sortMenuOpen}
        onToggle={() => setSortMenuOpen(o => !o)}
        onClose={() => setSortMenuOpen(false)}
        onSelect={sort => { setCommentSort(sort); setSortMenuOpen(false); }}
      />

      {sortedComments.map(comment => (
        <Comment
          key={comment.id}
          comment={comment}
          collapsed={state.thread.collapsed}
          votes={state.thread.commentVotes}
          onToggleCollapsed={toggleCommentCollapsed}
          onVote={voteComment}
        />
      ))}
    </div>
  );
}
