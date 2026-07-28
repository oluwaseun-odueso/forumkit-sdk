import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import './carousel.css';

type CarouselProps = {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onImageClick?: () => void;
};

/**
 * Controlled, read-only image carousel — arrows + dots, same interaction
 * pattern as composer/media-gallery.tsx's upload preview carousel, but with
 * index owned by the caller so it can be reused both inline (post-card,
 * thread-view) and inside the full-screen Lightbox.
 */
export default function Carousel({ images, index, onIndexChange, onImageClick }: CarouselProps) {
  const safeIndex = Math.min(index, Math.max(0, images.length - 1));
  const current = images[safeIndex];
  if (!current) return null;

  return (
    <div className="fk-carousel">
      <img
        src={current}
        alt=""
        className="fk-carousel-img"
        onClick={onImageClick}
      />
      {safeIndex > 0 && (
        <button
          type="button"
          className="fk-carousel-arrow fk-carousel-arrow--left"
          aria-label="Previous image"
          onClick={e => { e.stopPropagation(); onIndexChange(safeIndex - 1); }}
        >
          <ChevronLeftIcon />
        </button>
      )}
      {safeIndex < images.length - 1 && (
        <button
          type="button"
          className="fk-carousel-arrow fk-carousel-arrow--right"
          aria-label="Next image"
          onClick={e => { e.stopPropagation(); onIndexChange(safeIndex + 1); }}
        >
          <ChevronRightIcon />
        </button>
      )}
      {images.length > 1 && (
        <div className="fk-carousel-dots">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to image ${i + 1}`}
              className={`fk-carousel-dot${i === safeIndex ? ' fk-carousel-dot--active' : ''}`}
              onClick={e => { e.stopPropagation(); onIndexChange(i); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
