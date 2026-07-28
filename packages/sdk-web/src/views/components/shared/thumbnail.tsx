import type { CSSProperties, MouseEvent } from 'react';
import './thumbnail.css';

type ThumbnailProps = {
  gradient: string;
  imageUrl?: string | null | undefined;
  width?: number | string;
  height?: number | string;
  radius?: number;
  domain?: string | null;
  style?: CSSProperties;
  onClick?: ((e: MouseEvent<HTMLDivElement>) => void) | undefined;
};

/** Renders a real image when imageUrl is set, falling back to a gradient placeholder otherwise. */
export default function Thumbnail({ gradient, imageUrl, width = '100%', height = '100%', radius = 14, domain, style, onClick }: ThumbnailProps) {
  const background = imageUrl ? `url("${imageUrl}") center/cover no-repeat` : gradient;
  return (
    <div
      className="fk-thumb"
      style={{ width, height, borderRadius: radius, background, ...style }}
      onClick={onClick}
    >
      {domain && <span className="fk-thumb-domain">{domain}</span>}
    </div>
  );
}
