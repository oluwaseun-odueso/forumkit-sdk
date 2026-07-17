import type { CSSProperties, ReactNode } from 'react';
import './pill-button.css';

export type PillVariant = 'ghost' | 'surface' | 'accent' | 'outline';

type PillButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: PillVariant;
  active?: boolean;
  icon?: ReactNode;
  style?: CSSProperties;
  type?: 'button' | 'submit';
};

/**
 * A pill-shaped button used for nav actions, feed controls, vote/comment/share
 * chips, and composer footer buttons. `variant` picks the fill:
 * - ghost: transparent, hover fill (Create button, Back button text-weight actions)
 * - surface: filled with --surface-2 (comment/share pills, Save Draft)
 * - accent: filled with --accent (primary actions like Post, Comment)
 * - outline: bordered, transparent fill (Select Community, Create Post)
 */
export default function PillButton({ children, onClick, variant = 'surface', active, icon, style, type = 'button' }: PillButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`fk-pill fk-pill--${variant}${active ? ' fk-pill--active' : ''}`}
      style={style}
    >
      {icon}
      {children}
    </button>
  );
}
