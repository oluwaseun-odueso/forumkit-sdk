type IconProps = { size?: number };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function SearchIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.9}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.2-3.2" />
    </svg>
  );
}

export function SparkleIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </svg>
  );
}

export function SunIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.5M12 19v2.5M4.4 4.4l1.8 1.8M17.8 17.8l1.8 1.8M2.5 12h2.5M19 12h2.5M4.4 19.6l1.8-1.8M17.8 6.2l1.8-1.8" />
    </svg>
  );
}

export function MoonIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z" />
    </svg>
  );
}

export function MessagesIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6A8.4 8.4 0 0112.5 3h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

export function PlusIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

export function BellIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M18 8.5a6 6 0 10-12 0c0 7-3 8.5-3 8.5h18s-3-1.5-3-8.5" />
      <path d="M13.7 20.5a2 2 0 01-3.4 0" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// An actual arrow (chevron head + stem, like ↑), not a triangle — rounded
// corners baked into the path itself via quadratic curves through each
// original vertex, not just a stroke's line-join (too thin to visibly round
// a shape this small).
export function UpvoteIcon({ size = 19, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} {...base} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.9}>
      <path d="M13.2 6.6L16.8 11.4Q18 13 16 13L15 13Q14 13 14 14L14 18Q14 19 13 19L11 19Q10 19 10 18L10 14Q10 13 9 13L8 13Q6 13 7.2 11.4L10.8 6.6Q12 5 13.2 6.6Z" />
    </svg>
  );
}

export function DownvoteIcon({ size = 19, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} {...base} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.9}>
      <path d="M13.2 17.4L16.8 12.6Q18 11 16 11L15 11Q14 11 14 10L14 6Q14 5 13 5L11 5Q10 5 10 6L10 10Q10 11 9 11L8 11Q6 11 7.2 12.6L10.8 17.4Q12 19 13.2 17.4Z" />
    </svg>
  );
}

export function CommentIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M21 11.5a8 8 0 01-11.6 7.1L3 21l2.4-6.4A8 8 0 1121 11.5z" />
    </svg>
  );
}

export function ShareIcon({ size = 17 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
      <path d="M12 15V4M8 8l4-4 4 4" />
    </svg>
  );
}

export function EllipsisIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

// `filled` swaps the bookmark from outline to solid — used to show
// saved/unsaved state at a glance (e.g. post-card.tsx's Save/Unsave menu
// item) rather than relying on the label text alone.
export function SaveIcon({ size = 19, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} {...base} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.7}>
      <path d="M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z" />
    </svg>
  );
}

export function ReportIcon({ size = 19 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M5 21V4h11l-1.5 3.5L16 11H5" />
    </svg>
  );
}

export function CloseIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CheckIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function HamburgerIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function HomeIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M11.3 3.3a1 1 0 011.4 0l8 7.4a1 1 0 01-.7 1.7H19V20a1 1 0 01-1 1h-4v-6h-4v6H6a1 1 0 01-1-1v-7.6H3.9a1 1 0 01-.7-1.7z" />
    </svg>
  );
}

export function PopularIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 15l6-6M10.5 9H15v4.5" />
    </svg>
  );
}

export function NewsIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M7 9h6M7 12.5h6M7 16h4M16.5 9h1" />
    </svg>
  );
}

export function ExploreIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <circle cx="6" cy="8" r="2.2" />
      <circle cx="6" cy="16" r="2.2" />
      <circle cx="16" cy="12" r="2.2" />
      <path d="M8 8h6M8 16h6M14 12l-6-3.5M14 12l-6 3.5" />
    </svg>
  );
}

export function CompactViewIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M4 9.5h16M4 14.5h16" />
    </svg>
  );
}

export function CardViewIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M4 11h16" />
    </svg>
  );
}

export function RocketIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M12 2c2.4 2.1 3.8 5.4 3.8 8.8 0 2-1 4-2 5.2l-1.8 2-1.8-2c-1-1.2-2-3.2-2-5.2C8.2 7.4 9.6 4.1 12 2z" />
      <circle cx="12" cy="9.5" r="1.5" />
      <path d="M8.5 15l-2 4M15.5 15l2 4" />
    </svg>
  );
}

export function TopIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M4 17l5-5 4 4 7-8" />
      <path d="M20 8h-4M20 8v4" />
    </svg>
  );
}

export function ControversialIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M7 4l4 6H3z" />
      <path d="M17 20l4-6h-8z" />
    </svg>
  );
}

export function OldIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

// Feed sort icons (Hot/New/Rising) — Best and Top reuse RocketIcon/TopIcon
// above, same as the comment sort dropdown.
export function FlameIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </svg>
  );
}

export function FreshIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M12 3v6M12 15v6M4.2 12h6M13.8 12h6" />
      <path d="M6.3 6.3l4.2 4.2M13.5 13.5l4.2 4.2M17.7 6.3l-4.2 4.2M10.5 13.5l-4.2 4.2" />
    </svg>
  );
}

export function RisingIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M4 20V14M9 20V10M14 20V6M19 20V3" />
    </svg>
  );
}

export function EyeIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function FilterIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.8}>
      <path d="M5 8h9M17 8h2M5 16h2M10 16h9" />
      <circle cx="15" cy="8" r="2" />
      <circle cx="8" cy="16" r="2" />
    </svg>
  );
}

export function CameraIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} {...base}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <circle cx="9" cy="11" r="2" />
      <path d="M4 17l5-4 4 3 3-2 4 3" />
    </svg>
  );
}

export function TrophyIcon({ size = 26 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6 6.6.6-5 4.3 1.5 6.5L12 16.9 5.9 20 7.4 13.5l-5-4.3L9 8z" />
    </svg>
  );
}

export function LockIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.8}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

export function ShirtIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M8 4l4 2 4-2 4 3-3 3v10H7V10L4 7z" />
    </svg>
  );
}

export function DraftIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h5" />
    </svg>
  );
}

export function DollarIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9a2.5 2.5 0 00-2.5-1.5c-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2A2.5 2.5 0 019.5 15M12 6v1.5M12 16.5V18" />
    </svg>
  );
}

export function ShieldIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </svg>
  );
}

export function ToggleIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="2.5" y="7.5" width="19" height="9" rx="4.5" />
      <circle cx="8" cy="12" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LogoutIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M14 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </svg>
  );
}

export function ClickIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M9 9l11 4-4.5 1.8L13 20z" />
      <path d="M5 5l1 2M5 9H3M9 5l-.5 2" />
    </svg>
  );
}

export function ChartIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M12 3a9 9 0 109 9h-9z" />
      <path d="M12 3v9" />
    </svg>
  );
}

export function StackedImagesIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <rect x="7" y="3.5" width="14" height="11" rx="2.2" />
      <path d="M3 8.5v9a2.2 2.2 0 002.2 2.2h9" />
    </svg>
  );
}

export function UploadIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M6 16a4 4 0 01-.8-7.9 5.5 5.5 0 0110.6-1.6A4.5 4.5 0 0117 16" />
      <path d="M12 12v7M9 15l3-3 3 3" />
    </svg>
  );
}

export function GearIcon({ size = 21 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 00-.14-1.4l2-1.5-2-3.46-2.3.9a7 7 0 00-2.42-1.4L13.8 2h-3.6l-.34 2.44a7 7 0 00-2.42 1.4l-2.3-.9-2 3.46 2 1.5A7 7 0 005 12a7 7 0 00.14 1.4l-2 1.5 2 3.46 2.3-.9a7 7 0 002.42 1.4l.34 2.44h3.6l.34-2.44a7 7 0 002.42-1.4l2.3.9 2-3.46-2-1.5A7 7 0 0019 12z" />
    </svg>
  );
}

export function TrashIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

export function PencilIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function ExternalLinkIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

// The five icons below (GitHub/LinkedIn/Twitter-X/Behance/Dribbble) use the
// actual Simple Icons (simple-icons.org, MIT-licensed) brand paths, each
// composited onto its own fixed platform-color tile/circle with a white
// glyph — mirrors each platform's own real app icon. The fixed color (not
// `currentColor`) is deliberate: a plain black/near-black GitHub or X glyph
// nearly disappeared against this app's dark-theme surface colors, so
// contrast can't be left to the surrounding theme. Marks that fill their
// whole 24x24 box in the source (GitHub/X/Behance) are scaled down and
// centered so they don't crowd the tile's rounded corners; LinkedIn's source
// path already isolates the "in" glyph with margin, so it needs no scaling.
export function GitHubIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#181717" />
      <path
        fill="#fff"
        transform="translate(12,12) scale(0.72) translate(-12,-12)"
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    </svg>
  );
}

export function LinkedInIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"
      />
    </svg>
  );
}

export function TwitterXIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#000" />
      <path
        fill="#fff"
        transform="translate(12,12) scale(0.72) translate(-12,-12)"
        d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"
      />
    </svg>
  );
}

export function BehanceIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect width="24" height="24" rx="6" fill="#1769FF" />
      <path
        fill="#fff"
        transform="translate(12,12) scale(0.72) translate(-12,-12)"
        d="M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z"
      />
    </svg>
  );
}

export function DribbbleIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill="#fff" />
      <path
        fill="#EA4C89"
        d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"
      />
    </svg>
  );
}

export function GlobeIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
      <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" />
    </svg>
  );
}

export function LinkIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function AiSparkleIcon({ size = 17, gradId }: IconProps & { gradId: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id={gradId} x1="3" y1="3" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3f7ee2" />
          <stop offset="0.55" stopColor="#7b5cff" />
          <stop offset="1" stopColor="#37e0e6" />
        </linearGradient>
      </defs>
      <path d="M12 3l1.8 4.6L18.4 9l-4.6 1.8L12 15.4 10.2 10.8 5.6 9l4.6-1.8z" fill={`url(#${gradId})`} />
      <path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill={`url(#${gradId})`} />
    </svg>
  );
}
