import Svg, { Path, Circle, Rect } from 'react-native-svg';

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
