import { useState } from 'react';
import Carousel from './carousel';
import { CloseIcon } from './icons';
import './lightbox.css';

type LightboxProps = {
  images: string[];
  startIndex: number;
  onClose: () => void;
};

/**
 * Full-viewport overlay for viewing image(s) in place, without navigating
 * away. Closes on backdrop click or the close button; the stage itself
 * stops click propagation so interacting with the image/arrows/dots
 * doesn't also close it.
 */
export default function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex);

  return (
    <div className="fk-lightbox-overlay" onClick={onClose}>
      <button type="button" className="fk-lightbox-close" aria-label="Close" onClick={onClose}>
        <CloseIcon size={20} />
      </button>
      <div className="fk-lightbox-stage" onClick={e => e.stopPropagation()}>
        <Carousel images={images} index={index} onIndexChange={setIndex} />
      </div>
    </div>
  );
}
