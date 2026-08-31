import { useRef, useState, type ReactNode } from 'react';
import { View, Pressable, PixelRatio, StyleSheet, type ViewStyle, type LayoutChangeEvent } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

let gradIdCounter = 0;

// The brand AI gradient border. Uses PixelRatio.roundToNearestPixel on the
// onLayout width so the SVG viewport matches the physical pixel grid exactly
// and the right-edge stroke never clips on high-DPI screens.
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
  // inset by 1 extra logical pixel so the stroke never kisses the SVG boundary
  const inset = borderWidth / 2 + 0.5;

  function handleLayout(e: LayoutChangeEvent) {
    if (width == null) {
      setMeasuredWidth(PixelRatio.roundToNearestPixel(e.nativeEvent.layout.width));
    }
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
            <LinearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0" stopColor="#3f7ee2" stopOpacity={0.18} />
              <Stop offset="0.55" stopColor="#7b5cff" stopOpacity={0.18} />
              <Stop offset="1" stopColor="#37e0e6" stopOpacity={0.18} />
            </LinearGradient>
          </Defs>
          <Rect
            x={inset} y={inset}
            width={w - inset * 2} height={height - inset * 2}
            rx={r} ry={r}
            fill={filled ? `url(#${fillId})` : 'none'}
          />
          <Rect
            x={inset} y={inset}
            width={w - inset * 2} height={height - inset * 2}
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
