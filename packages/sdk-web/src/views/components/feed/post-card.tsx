import { useState } from 'react';
import type { FeedPost, Community, VoteDir } from '../../hooks/use-forum-state';
import Avatar from '../shared/avatar';
import Thumbnail from '../shared/thumbnail';
import Carousel from '../shared/carousel';
import Lightbox from '../shared/lightbox';
import VotePill from '../shared/vote-pill';
import DropdownMenu, { DropdownMenuItem } from '../shared/dropdown-menu';
import { CommentIcon, ShareIcon, EllipsisIcon, SaveIcon, ReportIcon } from '../shared/icons';
import './post-card.css';

type PostCardProps = {
  post: FeedPost;
  community: Community | undefined;
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
  post, community, view, vote, saved, menuOpen,
  onOpen, onVote, onToggleMenu, onCloseMenu, onSave,
}: PostCardProps) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const images = post.imageUrls ?? (post.imageUrl ? [post.imageUrl] : []);

  function openLightbox(e: React.MouseEvent, index: number) {
    e.stopPropagation();
    setCarouselIndex(index);
    setLightboxOpen(true);
  }

  return (
    <article className="fk-post-card" onClick={onOpen}>
      <div className="fk-post-card-head">
        {community && <Avatar size={22} gradient={community.gradient} letter={community.letter} />}
        <span className="fk-post-card-community">{community?.name}</span>
        <span className="fk-post-card-time">· {post.time}</span>
      </div>

      {view === 'card' ? (
        <>
          <h3 className="fk-post-card-title fk-post-card-title--card">{post.title}</h3>
          <div className="fk-post-card-cardimg" onClick={stop}>
            {images.length > 1 ? (
              <Carousel
                images={images}
                index={carouselIndex}
                onIndexChange={setCarouselIndex}
                onImageClick={() => setLightboxOpen(true)}
              />
            ) : (
              <Thumbnail gradient={post.thumbGradient} imageUrl={images[0] ?? null} radius={16} style={{ cursor: images[0] ? 'pointer' : undefined }} onClick={images[0] ? (e => openLightbox(e, 0)) : undefined} />
            )}
            <span className="fk-post-card-cardimg-label">{community?.name}</span>
          </div>
        </>
      ) : (
        <div className="fk-post-card-row">
          <div className="fk-post-card-row-text">
            <h3 className="fk-post-card-title fk-clamp-2">{post.title}</h3>
            <p className="fk-post-card-snippet fk-clamp-2">{post.snippet}</p>
          </div>
          <div className="fk-post-card-row-img" onClick={stop} style={{ position: 'relative' }}>
            <Thumbnail
              gradient={post.thumbGradient}
              imageUrl={images[0] ?? null}
              width={150}
              height={110}
              radius={14}
              domain={post.domain}
              style={{ cursor: images[0] ? 'pointer' : undefined }}
              onClick={images[0] ? (e => openLightbox(e, 0)) : undefined}
            />
            {images.length > 1 && (
              <span className="fk-post-card-more-badge">+{images.length - 1}</span>
            )}
          </div>
        </div>
      )}

      <div className="fk-post-card-actions" onClick={stop}>
        <VotePill votes={post.votes} dir={vote} onVote={onVote} />
        <button type="button" className="fk-post-card-chip">
          <CommentIcon />
          {post.commentCount}
        </button>
        <div className="fk-post-card-spacer" />
        <button type="button" className="fk-post-card-chip">
          <ShareIcon />
          Share
        </button>
        <div className="fk-post-card-menu-anchor">
          <button type="button" className={`fk-post-card-ellipsis${menuOpen ? ' fk-post-card-ellipsis--open' : ''}`} onClick={onToggleMenu}>
            <EllipsisIcon />
          </button>
          <DropdownMenu open={menuOpen} onClose={onCloseMenu} style={{ top: 40, right: 0, width: 190, padding: 6 }}>
            <DropdownMenuItem icon={<SaveIcon />} label={saved ? 'Unsave' : 'Save'} onClick={onSave} />
            <DropdownMenuItem icon={<ReportIcon />} label="Report" />
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
