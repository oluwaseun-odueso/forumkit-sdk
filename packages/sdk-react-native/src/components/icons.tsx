import { useRef } from 'react';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { nextGradientId } from '../lib/svg-gradient';

// Path data copied verbatim from packages/sdk-web/src/views/components/shared/icons.tsx
// wherever the icon is shared between platforms (per design_handoff_forum_kit_mobile/
// README.md: "no icon-library substitutions, copy the SVG path data from the
// reference"). RN SVG has no `currentColor` cascade the way web CSS does, so
// `color` is an explicit prop here instead of inheriting from a parent.
type IconProps = { size?: number; color?: string };

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
