import type { CSSProperties } from 'react';
import './avatar.css';

type AvatarProps = {
  size?: number;
  gradient: string;
  letter?: string;
  online?: boolean;
  style?: CSSProperties;
};

/** A circular gradient-filled avatar, used for both communities (with a letter) and users. */
export default function Avatar({ size = 22, gradient, letter, online, style }: AvatarProps) {
  return (
    <div className="fk-avatar" style={{ width: size, height: size, background: gradient, ...style }}>
      {letter && <span className="fk-avatar-letter" style={{ fontSize: size * 0.5 }}>{letter}</span>}
      {online && <span className="fk-avatar-online" />}
    </div>
  );
}
