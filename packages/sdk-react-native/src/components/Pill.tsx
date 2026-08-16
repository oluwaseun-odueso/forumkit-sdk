import { useRef, type ReactNode } from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

let gradIdCounter = 0;

// The brand AI gradient border — web achieves this with a double-background
// padding-box/border-box trick (README §1); RN has no such trick, so this
// draws the rounded-rect outline as a stroked SVG path with a linear
// gradient, sized to exactly wrap `width`/`height` (fixed, not measured —
// every pill this wraps has a known fixed height per the design spec).
export function GradientBorderPill({
  width, height, borderWidth = 1.4, radius, children, style,
}: {
  width: number;
  height: number;
  borderWidth?: number;
  radius?: number;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = `fkGradBorder${++gradIdCounter}`;
  const id = idRef.current;
  const r = radius ?? height / 2;

  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0" stopColor="#3f7ee2" />
            <Stop offset="0.55" stopColor="#7b5cff" />
            <Stop offset="1" stopColor="#37e0e6" />
          </LinearGradient>
        </Defs>
        <Rect
          x={borderWidth / 2} y={borderWidth / 2}
          width={width - borderWidth} height={height - borderWidth}
          rx={r} ry={r}
          fill="none" stroke={`url(#${id})`} strokeWidth={borderWidth}
        />
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}>{children}</View>
    </View>
  );
}

type PillVariant = 'surface' | 'ghost' | 'accent' | 'outline';

export function Pill({
  children, variant = 'surface', onPress, style,
}: {
  children: ReactNode;
  variant?: PillVariant;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const { tokens } = useTheme();
  const variantStyle: ViewStyle = {
    surface: { backgroundColor: tokens['surface-2'] },
    ghost: { backgroundColor: 'transparent' },
    accent: { backgroundColor: tokens.accent },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: tokens['border-strong'] },
  }[variant];

  const pillStyle = [
    { flexDirection: 'row' as const, alignItems: 'center' as const, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9, gap: 7 },
    variantStyle,
    style,
  ];

  if (!onPress) return <View style={pillStyle}>{children}</View>;
  return <Pressable onPress={onPress} style={pillStyle}>{children}</Pressable>;
}
