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

// Sort-dropdown icons — path data copied verbatim from sdk-web's
// shared/icons.tsx (feed sort: Best/Hot/New/Top/Rising; comment sort:
// Best/Top/Controversial/Old — Best and Top are shared between the two).
export function RocketIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M12 2c2.4 2.1 3.8 5.4 3.8 8.8 0 2-1 4-2 5.2l-1.8 2-1.8-2c-1-1.2-2-3.2-2-5.2C8.2 7.4 9.6 4.1 12 2z" />
      <Circle cx={12} cy={9.5} r={1.5} />
      <Path d="M8.5 15l-2 4M15.5 15l2 4" />
    </Svg>
  );
}

export function TopIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M4 17l5-5 4 4 7-8" />
      <Path d="M20 8h-4M20 8v4" />
    </Svg>
  );
}

export function ControversialIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M7 4l4 6H3z" />
      <Path d="M17 20l4-6h-8z" />
    </Svg>
  );
}

export function OldIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function FlameIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </Svg>
  );
}

export function FreshIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M12 3v6M12 15v6M4.2 12h6M13.8 12h6" />
      <Path d="M6.3 6.3l4.2 4.2M13.5 13.5l4.2 4.2M17.7 6.3l-4.2 4.2M10.5 13.5l-4.2 4.2" />
    </Svg>
  );
}

export function RisingIcon({ size = 20, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M4 20V14M9 20V10M14 20V6M19 20V3" />
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

// The five brand icons below use the actual Simple Icons (simple-icons.org,
// MIT-licensed) paths, each composited onto its own fixed platform-color tile
// (matching web's shared/icons.tsx exactly) instead of the incoming `color`
// prop — GitHub's and X's marks are near-black, so leaving them theme-adaptive
// made them nearly invisible against this app's dark surface colors.
export function DribbbleIcon({ size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={12} fill="#fff" />
      <Path
        fill="#EA4C89"
        d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"
      />
    </Svg>
  );
}

export function GitHubIcon({ size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width={24} height={24} rx={6} fill="#181717" />
      <Path
        fill="#fff"
        transform="translate(12,12) scale(0.72) translate(-12,-12)"
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
      />
    </Svg>
  );
}

export function LinkedInIcon({ size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width={24} height={24} rx={6} fill="#0A66C2" />
      <Path
        fill="#fff"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"
      />
    </Svg>
  );
}

export function TwitterXIcon({ size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width={24} height={24} rx={6} fill="#000" />
      <Path
        fill="#fff"
        transform="translate(12,12) scale(0.72) translate(-12,-12)"
        d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"
      />
    </Svg>
  );
}

export function BehanceIcon({ size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect width={24} height={24} rx={6} fill="#1769FF" />
      <Path
        fill="#fff"
        transform="translate(12,12) scale(0.72) translate(-12,-12)"
        d="M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z"
      />
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

export function PencilIcon({ size = 14, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  );
}

export function GearIcon({ size = 18, color = '#000' }: IconProps) {
  return (
    <Svg width={size} height={size} {...strokeBase} stroke={color} strokeWidth={1.7}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19 12a7 7 0 00-.14-1.4l2-1.5-2-3.46-2.3.9a7 7 0 00-2.42-1.4L13.8 2h-3.6l-.34 2.44a7 7 0 00-2.42 1.4l-2.3-.9-2 3.46 2 1.5A7 7 0 005 12a7 7 0 00.14 1.4l-2 1.5 2 3.46 2.3-.9a7 7 0 002.42 1.4l.34 2.44h3.6l.34-2.44a7 7 0 002.42-1.4l2.3.9 2-3.46-2-1.5A7 7 0 0019 12z" />
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
