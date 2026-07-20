import './rich-text-toolbar.css';

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

function LinkIcon() {
  return (
    <svg {...svgBase}>
      <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
      <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="2" />
      <path d="M4 17l5-4 4 3 3-2 4 3" />
    </svg>
  );
}

function LetteredListIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.7}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" />
    </svg>
  );
}

function BulletListIcon() {
  return (
    <svg {...svgBase}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}

function NumberedListIcon() {
  return (
    <svg {...svgBase}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h1v3M4 12h2M4 18h2" />
    </svg>
  );
}

function SpoilerIcon() {
  return (
    <svg {...svgBase}>
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg {...svgBase}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9h17M9 9v10.5" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

const TEXT_BUTTONS: { label: string; glyph: string; style?: React.CSSProperties }[] = [
  { label: 'Bold', glyph: 'B', style: { fontWeight: 800, fontSize: 15 } },
  { label: 'Italic', glyph: 'i', style: { fontStyle: 'italic', fontSize: 15 } },
  { label: 'Strikethrough', glyph: 'S', style: { textDecoration: 'line-through', fontSize: 15 } },
  { label: 'Superscript', glyph: 'x²', style: { fontSize: 14 } },
  { label: 'Heading', glyph: 'T', style: { fontSize: 16, fontWeight: 700 } },
];

const ICON_BUTTONS: { label: string; icon: React.ReactNode }[] = [
  { label: 'Link', icon: <LinkIcon /> },
  { label: 'Image', icon: <ImageIcon /> },
  { label: 'Lettered list', icon: <LetteredListIcon /> },
  { label: 'Bullet list', icon: <BulletListIcon /> },
  { label: 'Numbered list', icon: <NumberedListIcon /> },
];

const QUOTE_GROUP_ICON_BUTTONS: { label: string; icon: React.ReactNode }[] = [
  { label: 'Spoiler', icon: <SpoilerIcon /> },
  { label: 'Table', icon: <TableIcon /> },
];

/** Static rich-text toolbar matching design_files/Forum Kit.dc.html's Text tab exactly — formatting is not wired to a real editor. */
export default function RichTextToolbar() {
  return (
    <div className="fk-rte-toolbar">
      {TEXT_BUTTONS.map(btn => (
        <button key={btn.label} type="button" className="fk-rte-btn" aria-label={btn.label} style={btn.style}>
          {btn.glyph}
        </button>
      ))}
      <span className="fk-rte-divider" />
      {ICON_BUTTONS.map(btn => (
        <button key={btn.label} type="button" className="fk-rte-btn" aria-label={btn.label}>
          {btn.icon}
        </button>
      ))}
      <span className="fk-rte-divider" />
      <button type="button" className="fk-rte-btn" aria-label="Quote" style={{ fontWeight: 800, fontSize: 14 }}>&quot;</button>
      {QUOTE_GROUP_ICON_BUTTONS.map(btn => (
        <button key={btn.label} type="button" className="fk-rte-btn" aria-label={btn.label}>
          {btn.icon}
        </button>
      ))}
      <div className="fk-rte-spacer" />
      <button type="button" className="fk-rte-btn" aria-label="More">
        <MoreIcon />
      </button>
    </div>
  );
}
