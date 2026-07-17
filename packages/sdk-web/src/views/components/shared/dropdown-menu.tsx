import type { CSSProperties, ReactNode } from 'react';
import './dropdown-menu.css';

type DropdownMenuProps = {
  open: boolean;
  onClose: () => void;
  style: CSSProperties;
  children: ReactNode;
};

/**
 * Positioned dropdown panel + full-viewport transparent backdrop that closes
 * it on outside click. Shared by the account menu, feed sort/view menus, the
 * post ellipsis menu, and the comment-sort menu.
 */
export default function DropdownMenu({ open, onClose, style, children }: DropdownMenuProps) {
  if (!open) return null;
  return (
    <>
      <div className="fk-dropdown-backdrop" onClick={onClose} />
      <div className="fk-dropdown-panel" style={style}>
        {children}
      </div>
    </>
  );
}

export function DropdownMenuTitle({ children }: { children: ReactNode }) {
  return <div className="fk-dropdown-title">{children}</div>;
}

export function DropdownMenuDivider() {
  return <div className="fk-dropdown-divider" />;
}

type DropdownMenuItemProps = {
  icon?: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  beta?: boolean;
  active?: boolean;
  onClick?: () => void;
};

/** A single hoverable icon+label(+sub/beta) row, used inside DropdownMenu. */
export function DropdownMenuItem({ icon, label, sub, beta, active, onClick }: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      className={`fk-dropdown-row${active ? ' fk-dropdown-row--active' : ''}`}
      onClick={onClick}
    >
      {icon && <span className="fk-dropdown-row-icon">{icon}</span>}
      <span className="fk-dropdown-row-labels">
        <span className="fk-dropdown-row-label">{label}</span>
        {sub && <span className="fk-dropdown-row-sub">{sub}</span>}
      </span>
      {beta && <span className="fk-dropdown-row-beta">BETA</span>}
    </button>
  );
}
