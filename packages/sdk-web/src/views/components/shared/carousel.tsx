import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import './carousel.css';

export type MediaItem = { type: 'image' | 'video'; url: string };

type CarouselProps = {
  items: MediaItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onItemClick?: () => void;
};

/**
 * Controlled, read-only media carousel — arrows + dots, same interaction
 * pattern as composer/media-gallery.tsx's upload preview carousel, but with
 * index owned by the caller so it can be reused both inline (post-card,
 * thread-view) and inside the full-screen Lightbox. Takes a mixed
 * image/video item list (not images only) so a video attached alongside
 * images is a navigable slide like any other, not a separate element with
 * no way to arrow to/from it.
 */
export default function Carousel({ items, index, onIndexChange, onItemClick }: CarouselProps) {
  const safeIndex = Math.min(index, Math.max(0, items.length - 1));
  const current = items[safeIndex];
  if (!current) return null;

  return (
    <div className="fk-carousel">
      {current.type === 'video' ? (
        <video
          src={current.url}
          controls
          className="fk-carousel-img"
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <img
          src={current.url}
          alt=""
          className="fk-carousel-img"
          onClick={onItemClick}
        />
      )}
      {safeIndex > 0 && (
        <button
          type="button"
          className="fk-carousel-arrow fk-carousel-arrow--left"
          aria-label="Previous media"
          onClick={e => { e.stopPropagation(); onIndexChange(safeIndex - 1); }}
        >
          <ChevronLeftIcon />
        </button>
      )}
      {safeIndex < items.length - 1 && (
        <button
          type="button"
          className="fk-carousel-arrow fk-carousel-arrow--right"
          aria-label="Next media"
          onClick={e => { e.stopPropagation(); onIndexChange(safeIndex + 1); }}
        >
          <ChevronRightIcon />
        </button>
      )}
      {items.length > 1 && (
        <div className="fk-carousel-dots">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to media ${i + 1}`}
              className={`fk-carousel-dot${i === safeIndex ? ' fk-carousel-dot--active' : ''}`}
              onClick={e => { e.stopPropagation(); onIndexChange(i); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
