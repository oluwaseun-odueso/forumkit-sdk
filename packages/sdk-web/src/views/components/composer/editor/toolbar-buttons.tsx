// Icon set and button shell shared by every TipTap toolbar in the app
// (the post composer's RichTextEditor and the comment composer's
// collapsible formatting bar) — extracted here so both stay visually
// identical without duplicating the SVGs.

const svgBase = {
  viewBox: '0 0 24 24',
  width: 18,
  height: 18,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function LinkIcon() {
  return (
    <svg {...svgBase}>
      <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
      <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
    </svg>
  );
}

export function ImageIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="2" />
      <path d="M4 17l5-4 4 3 3-2 4 3" />
    </svg>
  );
}

export function VideoIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="5.5" width="13" height="13" rx="2.5" />
      <path d="M16.5 10l4-2.5v9l-4-2.5" />
    </svg>
  );
}

export function BulletListIcon() {
  return (
    <svg {...svgBase}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}

export function NumberedListIcon() {
  return (
    <svg {...svgBase}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h1v3M4 12h2M4 18h2" />
    </svg>
  );
}

export function SpoilerIcon() {
  return (
    <svg {...svgBase}>
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
    </svg>
  );
}

export function CodeBlockIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9.5 9l-2.5 3 2.5 3M14.5 9l2.5 3-2.5 3" />
    </svg>
  );
}

export function TableIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9h17M9 9v10.5" />
    </svg>
  );
}

export function GifIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="M8 9.5v5M12.5 9.5v5M12.5 12h1.7M17.5 9.5h-2v5M15.5 12h1.7" />
    </svg>
  );
}

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export function ToolbarButton({ label, active, onClick, style, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={`fk-rte-btn${active ? ' fk-rte-btn--active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      data-tooltip={label}
      style={style}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
