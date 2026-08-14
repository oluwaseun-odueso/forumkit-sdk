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

export function UpvoteIcon({ size = 19 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.9}>
      <path d="M12 5l7 8H5z" />
    </svg>
  );
}

export function DownvoteIcon({ size = 19 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.9}>
      <path d="M12 19l-7-8h14z" />
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
      <path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1" />
      <path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" />
    </svg>
  );
}

export function TopIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="2" />
      <path d="M4 17l5-4 4 3 3-2 4 3" />
    </svg>
  );
}

export function ControversialIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" />
    </svg>
  );
}

export function OldIcon({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} {...base} strokeWidth={1.7}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9h17M9 9v10.5" />
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

export function GitHubIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function LinkedInIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM9 17H6.5v-7H9v7zm-1.25-8a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm9.25 8H14.5v-3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V17H9v-7h2.5v1.17C12 10.45 12.83 10 14 10c1.93 0 3 1.57 3 3.5V17z" />
    </svg>
  );
}

export function TwitterXIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M18.24 2.25h3.31L14.32 10.5l8.5 11.25H16.17l-4.71-6.23-5.4 6.23H2.75l7.73-8.84L1.25 2.25H8.08l4.26 5.63 5.9-5.63zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
    </svg>
  );
}

export function BehanceIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M4 4h6c2.2 0 4 1.8 4 4a4 4 0 01-1.8 3.38A4 4 0 0114 15c0 2.2-1.8 4-4 4H4V4zm2 7v5h3.5a2 2 0 000-4H6zm0-5v3h3a1.5 1.5 0 000-3H6zm8.5-2h5v2h-5V4zm5.5 8h-5.9c.1 1.5.9 2.5 2.4 2.5.7 0 1.4-.5 1.7-1.2H22c-.3 1-.9 1.9-1.7 2.4-.8.5-1.7.8-2.8.8-2.5 0-4.5-2-4.5-4.5S15 8 17.5 8s4.5 2 4.5 4.5V12z" />
    </svg>
  );
}

export function DribbbleIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8" />
      <path d="M12 3c-2 3-2.5 7-1 12" />
      <path d="M12 3c2 3 2.5 7 1 12" />
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
