import { useRef, useState, type ReactNode } from 'react';
import { View, Pressable, StyleSheet, type ViewStyle, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

let gradIdCounter = 0;

// The brand AI gradient border — web achieves this with a double-background
// padding-box/border-box trick (README §1); RN has no such trick, so this
// draws the rounded-rect outline as a stroked SVG path with a linear
// gradient. `width` is optional: pass it for a fixed-size pill, or omit it
// to have the pill fill its flex parent and measure itself via onLayout —
// a fixed width doesn't account for how much room siblings (e.g. the top
// bar's other buttons) leave on a given screen, which was clipping the
// search pill on narrower phones.
export function GradientBorderPill({
  width, height, borderWidth = 1.4, radius, filled = false, children, style,
}: {
  width?: number;
  height: number;
  borderWidth?: number;
  radius?: number;
  filled?: boolean | undefined;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = `fkGradBorder${++gradIdCounter}`;
  const id = idRef.current;
  const fillId = `${id}Fill`;
  const r = radius ?? height / 2;
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const w = width ?? measuredWidth;

  function handleLayout(e: LayoutChangeEvent) {
    if (width == null) setMeasuredWidth(e.nativeEvent.layout.width);
  }

  return (
    <View style={[width != null ? { width, height } : { flex: 1, height }, { overflow: 'visible' }, style]} onLayout={handleLayout}>
      {w > 0 && (
        <Svg width={w} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0" stopColor="#3f7ee2" />
              <Stop offset="0.55" stopColor="#7b5cff" />
              <Stop offset="1" stopColor="#37e0e6" />
            </LinearGradient>
            {filled && (
              <LinearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0" stopColor="#3f7ee2" stopOpacity={0.18} />
                <Stop offset="0.55" stopColor="#7b5cff" stopOpacity={0.18} />
                <Stop offset="1" stopColor="#37e0e6" stopOpacity={0.18} />
              </LinearGradient>
            )}
          </Defs>
          {filled && (
            <Rect
              x={borderWidth / 2} y={borderWidth / 2}
              width={w - borderWidth} height={height - borderWidth}
              rx={r} ry={r}
              fill={`url(#${fillId})`}
            />
          )}
          <Rect
            x={borderWidth / 2} y={borderWidth / 2}
            width={w - borderWidth} height={height - borderWidth}
            rx={r} ry={r}
            fill="none" stroke={`url(#${id})`} strokeWidth={borderWidth}
          />
        </Svg>
      )}
      <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row', overflow: 'visible' }}>{children}</View>
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
