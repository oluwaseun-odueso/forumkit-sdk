import { useRef } from 'react';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { nextGradientId } from '../lib/svg-gradient';

// Path data copied verbatim from packages/sdk-web/src/views/components/shared/icons.tsx
// wherever the icon is shared between platforms (per design_handoff_forum_kit_mobile/
// README.md: "no icon-library substitutions, copy the SVG path data from the
// reference"). RN SVG has no `currentColor` cascade the way web CSS does, so
// `color` is an explicit prop here instead of inheriting from a parent.
export type IconProps = { size?: number; color?: string };

const strokeBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function SearchIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.9}>
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-3.2-3.2" />
    </Svg>
  );
}

export function SunIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color}>
      <Circle cx={12} cy={12} r={4.2} />
      <Path d="M12 2.5v2.5M12 19v2.5M4.4 4.4l1.8 1.8M17.8 17.8l1.8 1.8M2.5 12h2.5M19 12h2.5M4.4 19.6l1.8-1.8M17.8 6.2l1.8-1.8" />
    </Svg>
  );
}

export function MoonIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color}>
      <Path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z" />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color}>
      <Rect x={3.5} y={3.5} width={17} height={17} rx={4} />
      <Path d="M12 8.5v7M8.5 12h7" />
    </Svg>
  );
}

export function BellIcon({ size = 21, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color}>
      {/* clapper path (M13.7...) must stay — it's what makes this match the
          web bell exactly, called out explicitly in README §7 */}
      <Path d="M18 8.5a6 6 0 10-12 0c0 7-3 8.5-3 8.5h18s-3-1.5-3-8.5" />
      <Path d="M13.7 20.5a2 2 0 01-3.4 0" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function CloseIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function HamburgerIcon({ size = 21, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  );
}

export function HomeIcon({ size = 21, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <Path d="M11.3 3.3a1 1 0 011.4 0l8 7.4a1 1 0 01-.7 1.7H19V20a1 1 0 01-1 1h-4v-6h-4v6H6a1 1 0 01-1-1v-7.6H3.9a1 1 0 01-.7-1.7z" />
    </Svg>
  );
}

export function PopularIcon({ size = 21, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M9 15l6-6M10.5 9H15v4.5" />
    </Svg>
  );
}

export function NewsIcon({ size = 21, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Rect x={3.5} y={5} width={17} height={14} rx={2} />
      <Path d="M7 9h6M7 12.5h6M7 16h4M16.5 9h1" />
    </Svg>
  );
}

// Android's Material back arrow, distinct from ChevronLeftIcon (iOS) — see
// README §3: "Back affordance: Material arrow-left everywhere iOS uses the
// chevron — thread back, profile back, notifications back."
export function MaterialBackIcon({ size = 21, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5M11 18l-6-6 6-6" />
    </Svg>
  );
}

// ── Feed icons — path data copied verbatim from sdk-web's shared/icons.tsx
// (and README §6) so the two platforms stay pixel-identical. Every icon is
// color-driven via the `color` prop (React Native has no `currentColor`); the
// consuming component passes the right token per state. The vote triangles are
// OUTLINED (never filled) and recolored by state, matching web's vote-pill.css:
// both default to `muted`, the up arrow turns `up` (#ff6a3d) when active and the
// down arrow turns `down` (#8b6dff).

export function ChevronDownIcon({ size = 15, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function UpvoteIcon({ size = 19, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.9}>
      <Path d="M12 5l7 8H5z" />
    </Svg>
  );
}

export function DownvoteIcon({ size = 19, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.9}>
      <Path d="M12 19l-7-8h14z" />
    </Svg>
  );
}

export function CommentIcon({ size = 17, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color}>
      <Path d="M21 11.5a8 8 0 01-11.6 7.1L3 21l2.4-6.4A8 8 0 1121 11.5z" />
    </Svg>
  );
}

export function ShareIcon({ size = 17, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color}>
      <Path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
      <Path d="M12 15V4M8 8l4-4 4 4" />
    </Svg>
  );
}

export function EllipsisIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={5} cy={12} r={1.7} />
      <Circle cx={12} cy={12} r={1.7} />
      <Circle cx={19} cy={12} r={1.7} />
    </Svg>
  );
}

// `filled` swaps the bookmark from outline to solid — shows saved/unsaved
// state at a glance, mirroring sdk-web's SaveIcon (the one icon here web does
// fill).
export function SaveIcon({ size = 19, color = '#000', filled = false }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7} fill={filled ? color : 'none'}>
      <Path d="M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z" />
    </Svg>
  );
}

export function ReportIcon({ size = 19, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M5 21V4h11l-1.5 3.5L16 11H5" />
    </Svg>
  );
}

export function CompactViewIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color}>
      <Rect x={4} y={4} width={16} height={16} rx={2.5} />
      <Path d="M4 9.5h16M4 14.5h16" />
    </Svg>
  );
}

export function CardViewIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color}>
      <Rect x={4} y={4} width={16} height={16} rx={2.5} />
      <Path d="M4 11h16" />
    </Svg>
  );
}

export function LinkIcon({ size = 16, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M10 13.5a3.5 3.5 0 004.9.3l2.6-2.6a3.5 3.5 0 00-4.9-4.9l-1.3 1.3" />
      <Path d="M14 10.5a3.5 3.5 0 00-4.9-.3L6.5 12.8a3.5 3.5 0 004.9 4.9l1.3-1.3" />
    </Svg>
  );
}

export function ListIcon({ size = 16, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </Svg>
  );
}

export function ImageIcon({ size = 16, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Circle cx={8.5} cy={10} r={1.5} />
      <Path d="M21 16l-5-5L5 20" />
    </Svg>
  );
}

// ── Social + profile icons (paths from sdk-web's shared/icons.tsx) ──

export function GlobeIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3.6 9h16.8M3.6 15h16.8" />
      <Path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" />
    </Svg>
  );
}

export function DribbbleIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M5 6c3.5 3 9 4 14 3M4 15c5-2 10-1 13 3M9 3.5c3 5 4 11 3.5 17" />
    </Svg>
  );
}

export function GitHubIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </Svg>
  );
}

export function LinkedInIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM9 17H6.5v-7H9v7zm-1.25-8a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm9.25 8H14.5v-3.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V17H9v-7h2.5v1.17C12 10.45 12.83 10 14 10c1.93 0 3 1.57 3 3.5V17z" />
    </Svg>
  );
}

export function TwitterXIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M18.24 2.25h3.31L14.32 10.5l8.5 11.25H16.17l-4.71-6.23-5.4 6.23H2.75l7.73-8.84L1.25 2.25H8.08l4.26 5.63 5.9-5.63zm-1.16 17.52h1.83L7.08 4.13H5.12z" />
    </Svg>
  );
}

export function BehanceIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M4 4h6c2.2 0 4 1.8 4 4a4 4 0 01-1.8 3.38A4 4 0 0114 15c0 2.2-1.8 4-4 4H4V4zm2 7v5h3.5a2 2 0 000-4H6zm0-5v3h3a1.5 1.5 0 000-3H6zm8.5-2h5v2h-5V4z" />
    </Svg>
  );
}

export function CameraIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
      <Circle cx={12} cy={13} r={3.2} />
    </Svg>
  );
}

export function GearIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Circle cx={12} cy={12} r={3.2} />
      <Path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" />
    </Svg>
  );
}

export function EyeIcon({ size = 16, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}

// The brand AI sparkle — two gradient-filled 4-point stars, path data + gradient
// stops copied verbatim from sdk-web's AiSparkleIcon (README §8's sparkle). Each
// instance gets a unique gradient id (duplicate ids across the doc break fills).
export function SparkleIcon({ size = 17 }: { size?: number }) {
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = nextGradientId('fkSparkle');
  const id = idRef.current;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <LinearGradient id={id} x1="3" y1="3" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#3f7ee2" />
          <Stop offset="0.55" stopColor="#7b5cff" />
          <Stop offset="1" stopColor="#37e0e6" />
        </LinearGradient>
      </Defs>
      <Path d="M12 3l1.8 4.6L18.4 9l-4.6 1.8L12 15.4 10.2 10.8 5.6 9l4.6-1.8z" fill={`url(#${id})`} />
      <Path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" fill={`url(#${id})`} />
    </Svg>
  );
}
