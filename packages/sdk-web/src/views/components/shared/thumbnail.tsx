import type { CSSProperties } from 'react';
import './thumbnail.css';

type ThumbnailProps = {
  gradient: string;
  width?: number | string;
  height?: number | string;
  radius?: number;
  domain?: string | null;
  style?: CSSProperties;
};

/** A gradient placeholder thumbnail (stand-in for post/rail imagery), with an optional domain badge. */
export default function Thumbnail({ gradient, width = '100%', height = '100%', radius = 14, domain, style }: ThumbnailProps) {
  return (
    <div
      className="fk-thumb"
      style={{ width, height, borderRadius: radius, background: gradient, ...style }}
    >
      {domain && <span className="fk-thumb-domain">{domain}</span>}
    </div>
  );
}
