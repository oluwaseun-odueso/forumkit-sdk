import { useState } from 'react';
import type { useForum, CommentNodeData } from '../../hooks/use-forum-state';
import Avatar from '../shared/avatar';
import Thumbnail from '../shared/thumbnail';
import Carousel from '../shared/carousel';
import Lightbox from '../shared/lightbox';
import VotePill from '../shared/vote-pill';
import PillButton from '../shared/pill-button';
import { ChevronLeftIcon, CommentIcon, ShareIcon, CloseIcon, AiSparkleIcon } from '../shared/icons';
import CommentSort from './comment-sort';
import Comment from './comment';
import './thread-view.css';

type ThreadViewProps = {
  forum: ReturnType<typeof useForum>;
  onBack: () => void;
};

function filterComments(list: CommentNodeData[], q: string): CommentNodeData[] {
  const lower = q.toLowerCase();
  return list.reduce<CommentNodeData[]>((acc, c) => {
    const filteredReplies = filterComments(c.replies, lower);
    if (c.body.toLowerCase().includes(lower) || filteredReplies.length > 0) {
      acc.push({ ...c, replies: filteredReplies });
    }
    return acc;
  }, []);
}

export default function ThreadView({ forum, onBack }: ThreadViewProps) {
  const {
    state, activePost, sortedComments, communities, currentUserId,
    votePost, voteComment, setCommentInput, submitComment, setCommentSort, toggleCommentCollapsed,
    submitReply, editComment, editPost,
    summarize, suggest,
  } = forum;
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [commentSearch, setCommentSearch] = useState('');
  const [aiPanel, setAiPanel] = useState<'summary' | 'reply' | null>(null);

  const [postEditOpen, setPostEditOpen] = useState(false);
  const [postEditTitle, setPostEditTitle] = useState('');
  const [postEditBody, setPostEditBody] = useState('');
  const [postEditSubmitting, setPostEditSubmitting] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [postEditError, setPostEditError] = useState<string | null>(null);

  if (!activePost) return null;
  const community = communities.find(c => c.id === activePost.communityId);
  const displayComments = commentSearch ? filterComments(sortedComments, commentSearch) : sortedComments;
  const isMyPost = currentUserId !== null && activePost.authorId === currentUserId;

  function handleSummarise() {
    if (aiPanel === 'summary') {
      setAiPanel(null);
    } else {
      setAiPanel('summary');
      if (!state.asst.summary && !state.asst.summarizing) void summarize();
    }
  }

  function handleSuggestReply() {
    if (aiPanel === 'reply') {
      setAiPanel(null);
    } else {
      setAiPanel('reply');
      if (!state.asst.suggested) void suggest();
    }
  }

  function openPostEdit() {
    if (!activePost) return;
    setPostEditTitle(activePost.title);
    setPostEditBody(activePost.body);
    setPostEditError(null);
    setPostEditOpen(true);
  }

  async function handleSavePostEdit() {
    const title = postEditTitle.trim();
    const body = postEditBody.trim();
    if (!title || !body || postEditSubmitting) return;
    setPostEditSubmitting(true);
    setPostEditError(null);
    try {
      await editPost(title, body);
      setPostEditOpen(false);
    } catch (err) {
      setPostEditError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setPostEditSubmitting(false);
    }
  }

  return (
    <div className="fk-thread">
      <PillButton variant="surface" icon={<ChevronLeftIcon />} onClick={onBack}>Back</PillButton>

      <div className="fk-thread-head">
        {community && <Avatar size={26} gradient={community.gradient} letter={community.letter} />}
        <span className="fk-thread-community">{community?.name}</span>
        <span className="fk-thread-time">· {activePost.time}</span>
      </div>

      {postEditOpen ? (
        <div className="fk-comment-edit">
          <input
            className="fk-comment-reply-input"
            value={postEditTitle}
            onChange={e => setPostEditTitle(e.target.value)}
            style={{ marginBottom: 8, fontWeight: 600 }}
          />
          <textarea
            className="fk-comment-edit-input"
            value={postEditBody}
            onChange={e => setPostEditBody(e.target.value)}
            rows={5}
          />
          {postEditError && <p className="fk-comment-error">{postEditError}</p>}
          <div className="fk-comment-edit-actions">
            <button type="button" className="fk-comment-action" onClick={handleSavePostEdit} disabled={postEditSubmitting}>
              {postEditSubmitting ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="fk-comment-action"
              onClick={() => setPostEditOpen(false)}
              disabled={postEditSubmitting}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <h1 className="fk-thread-title">{activePost.title}</h1>
          <p className="fk-thread-body">{activePost.body}</p>
        </>
      )}

      {(() => {
        const images = activePost.imageUrls ?? (activePost.imageUrl ? [activePost.imageUrl] : []);
        if (images.length > 1) {
          return (
            <div style={{ position: 'relative', height: 340, borderRadius: 16, marginBottom: 16 }}>
              <Carousel
                images={images}
                index={carouselIndex}
                onIndexChange={setCarouselIndex}
                onImageClick={() => setLightboxOpen(true)}
              />
            </div>
          );
        }
        return (
          <Thumbnail
            gradient={activePost.thumbGradient}
            imageUrl={images[0] ?? null}
            height={340}
            radius={16}
            style={{ marginBottom: 16, cursor: images[0] ? 'pointer' : undefined }}
            onClick={images[0] ? (() => setLightboxOpen(true)) : undefined}
          />
        );
      })()}

      {lightboxOpen && (() => {
        const images = activePost.imageUrls ?? (activePost.imageUrl ? [activePost.imageUrl] : []);
        return images.length > 0
          ? <Lightbox images={images} startIndex={carouselIndex} onClose={() => setLightboxOpen(false)} />
          : null;
      })()}

      <div className="fk-thread-actions">
        <VotePill votes={activePost.votes} dir={activePost.myVote ?? 0} onVote={dir => votePost(activePost.id, dir)} />
        <div className="fk-thread-chip fk-thread-chip--static">
          <CommentIcon size={18} />
          {activePost.commentCount}
        </div>
        <button type="button" className="fk-thread-chip">
          <ShareIcon size={18} />
          Share
        </button>
        {isMyPost && !postEditOpen && (
          <button type="button" className="fk-thread-chip" onClick={openPostEdit}>
            Edit
          </button>
        )}
      </div>

      <div className="fk-ai-row">
        <button
          type="button"
          className={`fk-ai-btn${aiPanel === 'summary' ? ' fk-ai-btn--active' : ''}`}
          onClick={handleSummarise}
        >
          <AiSparkleIcon gradId="fkAiG1" size={17} />
          Summarise thread
        </button>
        <button
          type="button"
          className={`fk-ai-btn${aiPanel === 'reply' ? ' fk-ai-btn--active' : ''}`}
          onClick={handleSuggestReply}
        >
          <AiSparkleIcon gradId="fkAiG2" size={17} />
          Suggest reply
        </button>
      </div>

      {aiPanel && (
        <div className="fk-ai-panel">
          <div className="fk-ai-panel-head">
            <AiSparkleIcon gradId="fkAiPG" size={16} />
            <span>{aiPanel === 'summary' ? 'Thread summary' : 'Suggested reply'}</span>
            <button type="button" onClick={() => setAiPanel(null)}>
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="fk-ai-panel-body">
            {aiPanel === 'summary'
              ? state.asst.summarizing
                ? 'Summarising…'
                : state.asst.summary
                  ? state.asst.summary.points.map((p, i) => <p key={i}>{p}</p>)
                  : 'No summary yet.'
              : state.thread.commentInput || 'Generating suggestion…'}
          </div>
        </div>
      )}

      <div className="fk-thread-composer">
        <input
          className="fk-thread-composer-input"
          placeholder="Add a comment"
          value={state.thread.commentInput}
          onChange={e => setCommentInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void submitComment(); }}
        />
        <PillButton variant="accent" onClick={() => void submitComment()}>Comment</PillButton>
      </div>

      <CommentSort
        sort={state.thread.commentSort}
        open={sortMenuOpen}
        onToggle={() => setSortMenuOpen(o => !o)}
        onClose={() => setSortMenuOpen(false)}
        onSelect={sort => { setCommentSort(sort); setSortMenuOpen(false); }}
        commentSearch={commentSearch}
        onCommentSearchChange={setCommentSearch}
      />

      {displayComments.map(comment => (
        <Comment
          key={comment.id}
          comment={comment}
          collapsed={state.thread.collapsed}
          currentUserId={currentUserId}
          onToggleCollapsed={toggleCommentCollapsed}
          onVote={voteComment}
          onReply={submitReply}
          onEdit={editComment}
        />
      ))}
    </div>
  );
}
