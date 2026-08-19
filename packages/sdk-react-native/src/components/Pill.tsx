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
  width, height, borderWidth = 1.4, radius, children, style,
}: {
  width?: number;
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
          </Defs>
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

// A dark, translucent, glossy pill — a darker-than-surrounding fill (so it
// reads clearly against a light glassy background, e.g. the bottom bar's own
// blur) plus a soft white highlight fading down from the top, simulating a
// glass/glossy surface. Same auto-size-via-onLayout approach as
// GradientBorderPill above, since callers (e.g. an active nav tab) don't know
// their own content-driven width upfront. Content stays translucent overall —
// the highlight/shadow gradient sits at low opacity on top of a not-fully-
// opaque base fill, it isn't a solid color.
export function GlossyPill({ radius = 999, style, contentStyle, children }: {
  radius?: number;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  children: ReactNode;
}) {
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = `fkGloss${++gradIdCounter}`;
  const id = idRef.current;
  const [size, setSize] = useState({ width: 0, height: 0 });

  function handleLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }

  return (
    <View style={[{ overflow: 'hidden', borderRadius: radius }, style]} onLayout={handleLayout}>
      {size.width > 0 && size.height > 0 && (
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.34} />
              <Stop offset="0.45" stopColor="#ffffff" stopOpacity={0.04} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.14} />
            </LinearGradient>
          </Defs>
          {/* Darker base first, so the panel reads as a distinct, more
              visible fill against a light glass background — then the
              gradient above washes a gloss highlight/shadow over it. */}
          <Rect x={0} y={0} width={size.width} height={size.height} fill="#0b0e14" fillOpacity={0.4} />
          <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${id})`} />
        </Svg>
      )}
      <View style={contentStyle}>{children}</View>
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
