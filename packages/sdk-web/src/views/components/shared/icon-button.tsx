import type { CSSProperties, ReactNode } from 'react';
import './icon-button.css';

type IconButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  size?: number;
  label: string;
  active?: boolean;
  style?: CSSProperties;
};

/** A circular icon-only button used throughout the top nav, feed, and thread view. */
export default function IconButton({ children, onClick, size = 40, label, active, style }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`fk-icon-btn${active ? ' fk-icon-btn--active' : ''}`}
      style={{ width: size, height: size, ...style }}
    >
      {children}
    </button>
  );
}
