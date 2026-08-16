import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Rect, Text as SvgText, Defs, LinearGradient, RadialGradient, Stop, ClipPath } from 'react-native-svg';
import { mascotAnimationTiming } from '@forumkit/shared';
import { roundedBlobPath } from './mascot-path';

// The Forum Kit mascot, per design_handoff_forum_kit_mobile/README.md §2 —
// a pure-vector recreation (no image/PNG asset), never substituted with an
// icon. This is a first-pass geometric translation of the CSS reference
// (border-radius/gradient math computed, not eyeballed — see
// mascot-path.ts) but hasn't been visually diffed against the live
// Forum Kit Mobile.dc.html render in a real browser; treat exact curvature/
// gradient stop positioning as provisional until checked against it.
//
// Structure: an outer Animated.View carries the fkdance bounce/spin: for
// everything below it (tail, bubble, dots, badge) so the whole character
// moves together; the badge gets its own nested fkbadge scale animation on
// top of that.

type MascotProps = {
  size?: number;
  /** Static 88px profile-empty-state variant: no animation, no badge, dimmed tail/wrapper. */
  static?: boolean;
};

const TAIL_GRADIENT_ID = 'fkTailGrad';
const BUBBLE_GRADIENT_ID = 'fkBubbleGrad';
const BUBBLE_HIGHLIGHT_ID = 'fkBubbleHighlight';
const BUBBLE_CLIP_ID = 'fkBubbleClip';
const BADGE_GRADIENT_ID = 'fkBadgeGrad';

// CSS border-radius shorthand from the spec, as [topLeft, topRight,
// bottomRight, bottomLeft] fractions — see mascot-path.ts.
const TAIL_RADII: [number, number, number, number] = [0.74, 0.74, 0.80, 0.02];
const BUBBLE_H_RADII: [number, number, number, number] = [0.50, 0.50, 0.52, 0.16];
const BUBBLE_V_RADII: [number, number, number, number] = [0.52, 0.52, 0.50, 0.50];

const BUBBLE_PATH = roundedBlobPath(100, 100, BUBBLE_H_RADII, BUBBLE_V_RADII);
const TAIL_PATH = roundedBlobPath(100, 100, TAIL_RADII, TAIL_RADII);

// Gradient/clip ids must be unique per mounted instance (duplicate
// <linearGradient> ids across a document break the fill elsewhere, same
// issue the design spec calls out for the web reference's gm1/gm2 vs
// agm1/agm2 — see README §3). Plain module-level counter, not a hook.
let uidCounter = 0;
function nextId(prefix: string): string {
  uidCounter += 1;
  return `${prefix}${uidCounter}`;
}

export default function Mascot({ size = 24, static: isStatic = false }: MascotProps) {
  const idsRef = useRef({
    tail: nextId(TAIL_GRADIENT_ID),
    bubble: nextId(BUBBLE_GRADIENT_ID),
    highlight: nextId(BUBBLE_HIGHLIGHT_ID),
    clip: nextId(BUBBLE_CLIP_ID),
    badge: nextId(BADGE_GRADIENT_ID),
  });
  const ids = idsRef.current;

  const danceProgress = useSharedValue(0);
  const dotProgress = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const badgeProgress = useSharedValue(0);

  useEffect(() => {
    if (isStatic) return;
    danceProgress.value = withRepeat(
      withTiming(1, { duration: mascotAnimationTiming.danceDurationMs, easing: Easing.inOut(Easing.ease) }),
      -1,
    );
    mascotAnimationTiming.dotPopDelaysMs.forEach((delay, i) => {
      dotProgress[i]!.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: mascotAnimationTiming.dotPopDurationMs, easing: Easing.inOut(Easing.ease) }), -1),
      );
    });
    badgeProgress.value = withRepeat(
      withTiming(1, { duration: mascotAnimationTiming.badgeDurationMs, easing: Easing.out(Easing.ease) }),
      -1,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [isStatic]);

  const danceStyle = useAnimatedStyle(() => {
    if (isStatic) return {};
    const p = danceProgress.value;
    // fkdance keyframe percentages -> translateY (bounce) and rotateY (spin
    // only in the final third of the loop).
    const bounceStops = [0, 0.10, 0.22, 0.34, 0.46, 0.68, 1];
    const bounceValues = [0, -5, 0, -5, 0, 0, 0];
    const translateY = interpolateStops(p, bounceStops, bounceValues);
    const rotateY = p < 0.68 ? 0 : ((p - 0.68) / (1 - 0.68)) * 360;
    return {
      transform: [{ perspective: 200 }, { translateY }, { rotateY: `${rotateY}deg` }],
    };
  });

  const badgeStyle = useAnimatedStyle(() => {
    if (isStatic) return { opacity: 0 };
    const p = badgeProgress.value;
    const stops = [0, 0.62, 0.78, 1];
    const values = [0, 0, 1.25, 1];
    return { transform: [{ scale: interpolateStops(p, stops, values) }] };
  });

  // Unrolled (not `.map(() => useAnimatedStyle(...))`) — hooks can't be
  // called inside a loop/callback.
  function dotStyleFor(sv: typeof dotProgress[number]) {
    return useAnimatedStyle(() => {
      if (isStatic) return { transform: [{ scale: 1 }], opacity: 0.9 };
      const p = sv.value;
      const stops = [0, 0.36, 0.76, 1];
      const scaleValues = [0.45, 1, 0.45, 0.45];
      const opacityValues = [0.45, 1, 0.45, 0.45];
      return {
        transform: [{ scale: interpolateStops(p, stops, scaleValues) }],
        opacity: interpolateStops(p, stops, opacityValues),
      };
    });
  }
  const dotStyles = [dotStyleFor(dotProgress[0]!), dotStyleFor(dotProgress[1]!), dotStyleFor(dotProgress[2]!)];

  const tailSize = size * 0.35;
  const bubbleInset = size * 0.06;
  const bubbleSize = size - bubbleInset * 2;

  return (
    <View style={{ width: size, height: size, opacity: isStatic ? 0.9 : 1 }}>
      <Animated.View style={[StyleSheet.absoluteFill, danceStyle]}>
        {/* Tail */}
        <View style={{
          position: 'absolute', left: 0, bottom: 0, width: tailSize, height: tailSize,
          opacity: isStatic ? 0.55 : 1, transform: [{ rotate: '11deg' }],
        }}>
          <Svg width={tailSize} height={tailSize} viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id={ids.tail} x1="28.9%" y1="4.7%" x2="71.1%" y2="95.3%">
                <Stop offset="0" stopColor="#8cc0f7" />
                <Stop offset="1" stopColor="#3f7ee2" />
              </LinearGradient>
            </Defs>
            <Path d={TAIL_PATH} fill={`url(#${ids.tail})`} />
          </Svg>
        </View>

        {/* Bubble */}
        <View style={{ position: 'absolute', left: bubbleInset, top: bubbleInset, width: bubbleSize, height: bubbleSize }}>
          <Svg width={bubbleSize} height={bubbleSize} viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id={ids.bubble} x1="28.9%" y1="4.7%" x2="71.1%" y2="95.3%">
                <Stop offset="0" stopColor="#cfe8ff" />
                <Stop offset="0.4" stopColor="#86bdf6" />
                <Stop offset="0.66" stopColor="#3f7ee2" />
                <Stop offset="1" stopColor="#aed6ff" />
              </LinearGradient>
              <RadialGradient id={ids.highlight} cx="32%" cy="22%" r="70%">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={0.92} />
                <Stop offset="0.52" stopColor="#ffffff" stopOpacity={0} />
              </RadialGradient>
              <ClipPath id={ids.clip}>
                <Path d={BUBBLE_PATH} />
              </ClipPath>
            </Defs>
            <Path d={BUBBLE_PATH} fill={`url(#${ids.bubble})`} />
            <Rect x={0} y={0} width={100} height={100} fill={`url(#${ids.highlight})`} clipPath={`url(#${ids.clip})`} />
          </Svg>

          {/* Three head+shoulders dot figures */}
          <View style={{
            position: 'absolute', left: 0, right: 0, bottom: bubbleSize * 0.09,
            flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
            paddingHorizontal: bubbleSize * 0.06, gap: bubbleSize * 0.075 * size / bubbleSize,
          }}>
            {[0, 1, 2].map(i => {
              const isMiddle = i === 1;
              const scale = isMiddle ? 1.2 : 1;
              const headR = bubbleSize * 0.07 * scale;
              const bodyW = bubbleSize * 0.19 * scale;
              const bodyH = bubbleSize * 0.11 * scale;
              return (
                <Animated.View key={i} style={dotStyles[i]}>
                  <Svg width={bodyW} height={headR * 2 + bodyH} viewBox={`0 0 ${bodyW} ${headR * 2 + bodyH}`}>
                    <Circle cx={bodyW / 2} cy={headR} r={headR} fill="#21314e" />
                    <Rect x={0} y={headR * 1.3} width={bodyW} height={bodyH} rx={bodyH / 2} fill="#21314e" />
                  </Svg>
                </Animated.View>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Notification badge */}
      {!isStatic && (
        <Animated.View style={[
          { position: 'absolute', right: -size * 0.08, top: -size * 0.08, width: size * 0.32, height: size * 0.32 },
          badgeStyle,
        ]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Defs>
              <RadialGradient id={ids.badge} cx="35%" cy="30%" r="75%">
                <Stop offset="0" stopColor="#ff9384" />
                <Stop offset="1" stopColor="#e0432f" />
              </RadialGradient>
            </Defs>
            <Circle cx={50} cy={50} r={48} fill={`url(#${ids.badge})`} />
            <SvgText x={50} y={64} fontSize={58} fontWeight="600" fill="#ffffff" textAnchor="middle">1</SvgText>
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

function interpolateStops(p: number, stops: number[], values: number[]): number {
  'worklet';
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i]!) {
      const t = (p - stops[i - 1]!) / (stops[i]! - stops[i - 1]! || 1);
      return values[i - 1]! + (values[i]! - values[i - 1]!) * t;
    }
  }
  return values[values.length - 1]!;
}
