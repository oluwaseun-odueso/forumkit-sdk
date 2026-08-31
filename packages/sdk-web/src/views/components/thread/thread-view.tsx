import { useState, lazy, Suspense } from 'react';
import { filterComments } from '@forumkit/shared';
import type { useForum } from '../../hooks/use-forum-state';
import { authorAvatar } from '../../lib/author-avatar';
import Avatar from '../shared/avatar';
import Thumbnail from '../shared/thumbnail';
import Carousel, { type MediaItem } from '../shared/carousel';
import Lightbox from '../shared/lightbox';
import RenderedBody from '../shared/rendered-body';
import VotePill from '../shared/vote-pill';
import PillButton from '../shared/pill-button';
import { ChevronLeftIcon, CommentIcon, ShareIcon, CloseIcon, AiSparkleIcon, LinkIcon, EllipsisIcon, TrashIcon, CopyIcon, CheckIcon } from '../shared/icons';
import DropdownMenu, { DropdownMenuItem } from '../shared/dropdown-menu';
import ConfirmDialog from '../shared/confirm-dialog';
import { useShare } from '../../hooks/use-share';
import CommentSort from './comment-sort';
import Comment from './comment';
import CommentComposer from './comment-composer';
import './thread-view.css';

const RichTextEditor = lazy(() => import('../composer/rich-text-editor'));

type ThreadViewProps = {
  forum: ReturnType<typeof useForum>;
  onBack: () => void;
};

export default function ThreadView({ forum, onBack }: ThreadViewProps) {
  const {
    state, activePost, sortedComments, currentUserId, forumId, sessionToken,
    votePost, voteComment, toggleSaveComment, toggleAcceptedAnswer, submitComment, setCommentSort, toggleCommentCollapsed,
    submitReply, editComment, editPost, deletePost, deleteComment,
    summarize, suggest,
  } = forum;
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [commentSearch, setCommentSearch] = useState('');
  const [aiPanel, setAiPanel] = useState<'summary' | 'reply' | null>(null);
  const [deletePostConfirmOpen, setDeletePostConfirmOpen] = useState(false);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [suggestCopied, setSuggestCopied] = useState(false);

  const [postEditOpen, setPostEditOpen] = useState(false);
  const [postEditTitle, setPostEditTitle] = useState('');
  const [postEditBody, setPostEditBody] = useState('');
  const [postEditSubmitting, setPostEditSubmitting] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [postEditError, setPostEditError] = useState<string | null>(null);
  // Called unconditionally (before the activePost null-check below) since
  // hooks can't be conditional — activePost.id is stable once non-null, so
  // an empty-string placeholder while it's still loading is harmless.
  const share = useShare(activePost?.id ?? '');

  if (!activePost) return null;
  const avatar = authorAvatar(activePost.authorId, activePost.author);
  const displayComments = commentSearch ? filterComments(sortedComments, commentSearch) : sortedComments;
  // One ordered list covering every attached image AND the video (if any) —
  // previously video was only ever rendered as a fallback when there were
  // zero images, so it silently disappeared whenever the post also had
  // images, with no way to arrow to it from the image carousel.
  const media: MediaItem[] = [
    ...(activePost.imageUrls ?? (activePost.imageUrl ? [activePost.imageUrl] : [])).map((url): MediaItem => ({ type: 'image', url })),
    ...(activePost.videoUrl ? [{ type: 'video', url: activePost.videoUrl } as MediaItem] : []),
  ];
  const isMyPost = currentUserId !== null && activePost.authorId === currentUserId;
  const isModerator = state.profile.role === 'moderator' || state.profile.role === 'admin';
  const canAcceptAnswer = isMyPost || isModerator;
  const canDeletePost = isMyPost || isModerator;

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
        <Avatar size={26} gradient={avatar.gradient} letter={avatar.letter} imageUrl={activePost.authorAvatarUrl} />
        <span className="fk-thread-author">{activePost.author}</span>
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
          <Suspense fallback={<textarea className="fk-comment-edit-input" value={postEditBody} onChange={e => setPostEditBody(e.target.value)} rows={5} />}>
            <RichTextEditor content={postEditBody} onChange={setPostEditBody} forumId={forumId} sessionToken={sessionToken} onInlineUpload={() => {}} />
          </Suspense>
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
          <RenderedBody body={activePost.body} className="fk-thread-body" />
        </>
      )}

      {media.length > 1 ? (
        <div style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: 16, marginBottom: 16 }}>
          <Carousel
            items={media}
            index={carouselIndex}
            onIndexChange={setCarouselIndex}
            onItemClick={() => setLightboxOpen(true)}
          />
        </div>
      ) : media.length === 1 && media[0]?.type === 'image' ? (
        <Thumbnail
          gradient={activePost.thumbGradient}
          imageUrl={media[0].url}
          height="auto"
          radius={16}
          style={{ aspectRatio: '4 / 3', marginBottom: 16, cursor: 'pointer' }}
          onClick={() => setLightboxOpen(true)}
        />
      ) : media.length === 1 && media[0]?.type === 'video' ? (
        <video
          src={media[0].url}
          controls
          className="fk-thread-video"
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {lightboxOpen && media.length > 0 && (
        <Lightbox items={media} startIndex={carouselIndex} onClose={() => setLightboxOpen(false)} />
      )}

      <div className="fk-thread-actions">
        <VotePill voteCounts={activePost.voteCounts} dir={activePost.myVote ?? 0} onVote={dir => votePost(activePost.id, dir)} />
        <div className="fk-thread-chip fk-thread-chip--static">
          <CommentIcon size={18} />
          {activePost.commentCount}
        </div>
        {isMyPost && !postEditOpen && (
          <button type="button" className="fk-thread-chip" onClick={openPostEdit}>
            Edit
          </button>
        )}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="fk-thread-chip"
            aria-label="More actions"
            onClick={() => setThreadMenuOpen(o => !o)}
          >
            <EllipsisIcon size={18} />
          </button>
          <DropdownMenu open={threadMenuOpen} onClose={() => setThreadMenuOpen(false)} style={{ top: 40, right: 0, width: 210, padding: 6 }}>
            <DropdownMenuItem icon={<LinkIcon size={16} />} label="Copy link" onClick={() => { share.handleCopyLink(); setThreadMenuOpen(false); }} />
            <DropdownMenuItem icon={<ShareIcon size={16} />} label="Share with a member" onClick={() => { share.handleShareWithMember(); setThreadMenuOpen(false); }} />
            {canDeletePost && (
              <DropdownMenuItem icon={<TrashIcon size={16} />} label="Delete" onClick={() => { setThreadMenuOpen(false); setDeletePostConfirmOpen(true); }} />
            )}
          </DropdownMenu>
        </div>
      </div>

      {deletePostConfirmOpen && (
        <ConfirmDialog
          title="Delete post?"
          message="This can't be undone. The post and its comments will be permanently removed."
          onCancel={() => setDeletePostConfirmOpen(false)}
          onConfirm={() => deletePost(activePost.id)}
        />
      )}

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
              : state.asst.suggestedText
                ? (
                  <div className="fk-ai-suggest-block">
                    <p className="fk-ai-suggest-text">{state.asst.suggestedText}</p>
                    <button
                      type="button"
                      className={`fk-ai-copy-btn${suggestCopied ? ' fk-ai-copy-btn--copied' : ''}`}
                      title={suggestCopied ? 'Copied!' : 'Copy'}
                      onClick={() => {
                        void navigator.clipboard.writeText(state.asst.suggestedText!);
                        setSuggestCopied(true);
                        setTimeout(() => setSuggestCopied(false), 1500);
                      }}
                    >
                      {suggestCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                    </button>
                  </div>
                )
                : 'Generating suggestion…'}
          </div>
        </div>
      )}

      <CommentComposer
        forumId={forumId}
        sessionToken={sessionToken}
        placeholder="Join the conversation"
        submitLabel="Comment"
        syncedValue={state.thread.commentInput}
        onSubmit={(body, attachmentIds) => submitComment(body, attachmentIds)}
      />

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
          threadId={activePost.id}
          collapsed={state.thread.collapsed}
          currentUserId={currentUserId}
          onToggleCollapsed={toggleCommentCollapsed}
          onVote={voteComment}
          onReply={submitReply}
          onEdit={editComment}
          onSave={toggleSaveComment}
          onAcceptAnswer={canAcceptAnswer ? (id: string) => void toggleAcceptedAnswer(id) : undefined}
          onDelete={deleteComment}
          isModerator={isModerator}
        />
      ))}
    </div>
  );
}
