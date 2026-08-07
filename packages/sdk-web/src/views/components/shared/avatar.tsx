import type { CSSProperties } from 'react';
import './avatar.css';

type AvatarProps = {
  size?: number;
  gradient: string;
  letter?: string;
  imageUrl?: string | null | undefined;
  online?: boolean;
  style?: CSSProperties;
};

/** A circular avatar: a real photo when imageUrl is set, otherwise a gradient + initial. */
export default function Avatar({ size = 22, gradient, letter, imageUrl, online, style }: AvatarProps) {
  const background = imageUrl ? `url("${imageUrl}") center/cover no-repeat` : gradient;
  return (
    <div className="fk-avatar" style={{ width: size, height: size, background, ...style }}>
      {!imageUrl && letter && <span className="fk-avatar-letter" style={{ fontSize: size * 0.5 }}>{letter}</span>}
      {online && <span className="fk-avatar-online" />}
    </div>
  );
}
