import { useLayoutEffect, useRef, useState } from 'react';
import type { FeedPost, VoteDir } from '../../hooks/use-forum-state';
import { authorAvatar } from '../../lib/author-avatar';
import Avatar from '../shared/avatar';
import Thumbnail from '../shared/thumbnail';
import Carousel from '../shared/carousel';
import Lightbox from '../shared/lightbox';
import RenderedBody from '../shared/rendered-body';
import VotePill from '../shared/vote-pill';
import DropdownMenu, { DropdownMenuItem } from '../shared/dropdown-menu';
import { CommentIcon, ShareIcon, EllipsisIcon, SaveIcon, ReportIcon, LinkIcon } from '../shared/icons';
import { useShare } from '../../hooks/use-share';
import { useForum } from '../../hooks/use-forum-state';
import './post-card.css';

type PostCardProps = {
  post: FeedPost;
  view: 'card' | 'compact';
  vote: VoteDir;
  saved: boolean;
  menuOpen: boolean;
  onOpen: () => void;
  onVote: (dir: VoteDir) => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onSave: () => void;
};

export default function PostCard({
  post, view, vote, saved, menuOpen,
  onOpen, onVote, onToggleMenu, onCloseMenu, onSave,
}: PostCardProps) {
  const avatar = authorAvatar(post.authorId, post.author);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const share = useShare(post.id);
  const { openReportModal } = useForum();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [snippetExpanded, setSnippetExpanded] = useState(false);
  const [snippetOverflowing, setSnippetOverflowing] = useState(false);
  const snippetRef = useRef<HTMLDivElement>(null);
  const images = post.imageUrls ?? (post.imageUrl ? [post.imageUrl] : []);

  useLayoutEffect(() => {
    if (snippetExpanded) return;
    const el = snippetRef.current;
    if (!el) return;
    setSnippetOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [post.body, snippetExpanded]);

  function openLightbox(e: React.MouseEvent, index: number) {
    e.stopPropagation();
    setCarouselIndex(index);
    setLightboxOpen(true);
  }

  function renderSnippet() {
    return (
      <>
        <div
          ref={snippetRef}
          className={`fk-post-card-snippet${snippetExpanded ? ' fk-post-card-snippet--expanded' : ''}`}
        >
          <RenderedBody body={post.body} />
        </div>
        {snippetOverflowing && (
          <button
            type="button"
            className="fk-post-card-showmore"
            onClick={e => { e.stopPropagation(); setSnippetExpanded(x => !x); }}
          >
            {snippetExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </>
    );
  }

  return (
    <article className="fk-post-card" onClick={onOpen}>
      <div className="fk-post-card-head">
        <Avatar size={22} gradient={avatar.gradient} letter={avatar.letter} imageUrl={post.authorAvatarUrl} />
        <span className="fk-post-card-author">{post.author}</span>
        <span className="fk-post-card-time">· {post.time}</span>
      </div>

      {view === 'card' ? (
        <>
          <h3 className="fk-post-card-title fk-post-card-title--card">{post.title}</h3>
          {renderSnippet()}
          {images.length > 0 ? (
            <div className="fk-post-card-cardimg" onClick={stop}>
              {images.length > 1 ? (
                <Carousel
                  images={images}
                  index={carouselIndex}
                  onIndexChange={setCarouselIndex}
                  onImageClick={() => setLightboxOpen(true)}
                />
              ) : (
                <Thumbnail gradient={post.thumbGradient} imageUrl={images[0] ?? null} radius={16} style={{ cursor: 'pointer' }} onClick={e => openLightbox(e, 0)} />
              )}
            </div>
          ) : post.videoUrl ? (
            <video src={post.videoUrl} controls className="fk-post-card-video" onClick={stop} />
          ) : null}
        </>
      ) : (
        <div className="fk-post-card-row">
          <div className="fk-post-card-row-text">
            <h3 className="fk-post-card-title fk-clamp-2">{post.title}</h3>
            {renderSnippet()}
          </div>
          {images.length > 0 ? (
            <div className="fk-post-card-row-img" onClick={stop} style={{ position: 'relative' }}>
              <Thumbnail
                gradient={post.thumbGradient}
                imageUrl={images[0] ?? null}
                width={150}
                height={110}
                radius={14}
                domain={post.domain}
                style={{ cursor: 'pointer' }}
                onClick={e => openLightbox(e, 0)}
              />
              {images.length > 1 && (
                <span className="fk-post-card-more-badge">+{images.length - 1}</span>
              )}
            </div>
          ) : post.videoUrl ? (
            <video src={post.videoUrl} controls width={150} height={110} className="fk-post-card-row-video" onClick={stop} />
          ) : null}
        </div>
      )}

      <div className="fk-post-card-actions" onClick={stop}>
        <VotePill votes={post.votes} dir={vote} onVote={onVote} />
        <button type="button" className="fk-post-card-chip">
          <CommentIcon />
          {post.commentCount}
        </button>
        <div className="fk-post-card-spacer" />
        <div className="fk-post-card-menu-anchor">
          <button type="button" className="fk-post-card-chip" onClick={share.handleShareClick}>
            <ShareIcon />
            Share
          </button>
          <DropdownMenu open={share.menuOpen} onClose={share.closeMenu} style={{ top: 40, right: 0, width: 210, padding: 6 }}>
            <DropdownMenuItem icon={<LinkIcon size={16} />} label="Copy link" onClick={share.handleCopyLink} />
            <DropdownMenuItem icon={<ShareIcon />} label="Share with a member" onClick={share.handleShareWithMember} />
          </DropdownMenu>
        </div>
        <div className="fk-post-card-menu-anchor">
          <button type="button" className={`fk-post-card-ellipsis${menuOpen ? ' fk-post-card-ellipsis--open' : ''}`} onClick={onToggleMenu}>
            <EllipsisIcon />
          </button>
          <DropdownMenu open={menuOpen} onClose={onCloseMenu} style={{ top: 40, right: 0, width: 190, padding: 6 }}>
            <DropdownMenuItem icon={<SaveIcon />} label={saved ? 'Unsave' : 'Save'} onClick={onSave} />
            <DropdownMenuItem
              icon={<ReportIcon />}
              label="Report"
              onClick={() => { onCloseMenu(); openReportModal({ type: 'thread', threadId: post.id }); }}
            />
          </DropdownMenu>
        </div>
      </div>
      <div className="fk-post-card-divider" />

      {lightboxOpen && images.length > 0 && (
        <Lightbox images={images} startIndex={carouselIndex} onClose={() => setLightboxOpen(false)} />
      )}
    </article>
  );
}
