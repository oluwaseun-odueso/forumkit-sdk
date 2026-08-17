import { useEffect, useRef } from 'react';
import { View, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, withSequence, Easing,
  type SharedValue, type EasingFunction,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { mascotAnimationTiming } from '@forumkit/shared';
import { roundedBlobPath } from './mascot-path';

// The Forum Kit mascot — a pure-CSS chat-bubble character (nested divs with
// layered gradients + three head/shoulders figures + a badge), NOT an image,
// icon, or rounded-square-with-dots. This is a literal port of the design
// spec's markup (design_handoff_forum_kit_mobile/README.md §2), values taken
// verbatim at size=24 and scaled by s = size/24 exactly as instructed —
// nothing here is eyeballed or approximated from a generic "blob" shape.
//
// RN has no CSS, so the translation choices are:
// - border-radius (including the CSS "50% 50% 52% 16% / 52% 52% 50% 50%"
//   per-corner elliptical shorthand) -> an SVG Path via roundedBlobPath,
//   computed geometrically, not traced.
// - linear-gradient(<angle>deg, ...) -> SVG <LinearGradient> x1/y1/x2/y2,
//   converted with x1=50-50sinθ, y1=50+50cosθ, x2=50+50sinθ, y2=50-50cosθ.
// - the three figures (head circle + shouldered body) -> plain RN Views
//   with per-corner borderRadius, not SVG — simpler and exact for flat
//   shapes.
// - box-shadow -> RN shadow*/elevation on the bubble's wrapper (outer drop
//   shadow only; CSS's *inset* highlight/shadow has no direct RN
//   equivalent and is intentionally not attempted here).

type MascotProps = {
  size?: number;
  animated?: boolean;
  badge?: boolean;
};

const TAIL_GRADIENT_ID = 'fkTailGrad';
const BUBBLE_GRADIENT_ID = 'fkBubbleGrad';
const BUBBLE_HIGHLIGHT_ID = 'fkBubbleHighlight';
const BADGE_GRADIENT_ID = 'fkBadgeGrad';

// border-radius: 74% 74% 80% 2px on an 8.5px box — the 2px corner is a flat
// px value, not a %, so its fraction (2/8.5) is what stays constant as the
// whole tail scales by s, not the literal 2px.
const TAIL_RADII: [number, number, number, number] = [0.74, 0.74, 0.80, 2 / 8.5];
// border-radius: 50% 50% 52% 16% / 52% 52% 50% 50% — all %, scale-invariant.
const BUBBLE_H_RADII: [number, number, number, number] = [0.50, 0.50, 0.52, 0.16];
const BUBBLE_V_RADII: [number, number, number, number] = [0.52, 0.52, 0.50, 0.50];

// linear-gradient(<angle>deg) -> SVG x1/y1/x2/y2 (CSS 0deg = "to top").
function gradientEndpoints(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  return {
    x1: `${50 - 50 * sin}%`,
    y1: `${50 + 50 * cos}%`,
    x2: `${50 + 50 * sin}%`,
    y2: `${50 - 50 * cos}%`,
  };
}
const TAIL_GRADIENT_DIR = gradientEndpoints(150);
const BUBBLE_GRADIENT_DIR = gradientEndpoints(155);

const IOS = Platform.OS === 'ios';

let uidCounter = 0;
function nextId(prefix: string): string {
  uidCounter += 1;
  return `${prefix}${uidCounter}`;
}

// A fixed reference instant, set once when the JS module first loads (i.e.
// effectively "app launch"). Every Mascot instance's loops are phased off
// this same epoch instead of off their own mount time, so the search-pill
// mascot (which mounts fresh each time the pill opens, since the top-bar
// instance unmounts) picks up the bounce/spin/dot-pop/badge cycle at
// whatever point a continuously-running mascot would be at right now,
// rather than visibly restarting from the beginning of the loop.
const APP_EPOCH = Date.now();

// Jumps `progress` straight to its current phase against APP_EPOCH, then
// finishes that cycle (shortened to whatever time is left) before settling
// into the normal full-duration repeat — so every instance of the same loop
// stays in lockstep regardless of when it happened to mount.
function startSynced(progress: SharedValue<number>, durationMs: number, delayMs: number, easing: EasingFunction) {
  const elapsed = Date.now() - APP_EPOCH - delayMs;
  if (elapsed < 0) {
    progress.value = withDelay(-elapsed, withRepeat(withTiming(1, { duration: durationMs, easing }), -1));
    return;
  }
  const phase = (elapsed % durationMs) / durationMs;
  progress.value = phase;
  progress.value = withSequence(
    // Catch up to the end of the current cycle...
    withTiming(1, { duration: durationMs * (1 - phase), easing }),
    // ...then an instant, zero-duration reset back to 0. withRepeat resets
    // to whatever the value was AT THE MOMENT it was assigned, not to 0 —
    // without this jump it would reset to 1 (where the catch-up leg left
    // off) and every "repeat" after the first would just be 1 -> 1, a
    // no-op frozen on the last frame. This is what "plays once and stops"
    // actually was.
    withTiming(0, { duration: 0 }),
    withRepeat(withTiming(1, { duration: durationMs, easing }), -1),
  );
}

export default function Mascot({ size = 24, animated = true, badge = true }: MascotProps) {
  const idsRef = useRef({
    tail: nextId(TAIL_GRADIENT_ID),
    bubble: nextId(BUBBLE_GRADIENT_ID),
    highlight: nextId(BUBBLE_HIGHLIGHT_ID),
    badge: nextId(BADGE_GRADIENT_ID),
  });
  const ids = idsRef.current;
  const s = size / 24;

  const danceProgress = useSharedValue(0);
  const dotProgress = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const badgeProgress = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    startSynced(danceProgress, mascotAnimationTiming.danceDurationMs, 0, Easing.inOut(Easing.ease));
    mascotAnimationTiming.dotPopDelaysMs.forEach((delay, i) => {
      startSynced(dotProgress[i]!, mascotAnimationTiming.dotPopDurationMs, delay, Easing.inOut(Easing.ease));
    });
    if (badge) {
      startSynced(badgeProgress, mascotAnimationTiming.badgeDurationMs, 0, Easing.out(Easing.ease));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [animated, badge]);

  const danceStyle = useAnimatedStyle(() => {
    if (!animated) return {};
    const p = danceProgress.value;
    // fkdance: translateY bounce at 10/34%, rotateY 0->360 across 68-100%.
    const bounceStops = [0, 0.10, 0.22, 0.34, 0.46, 0.68, 1];
    const bounceValues = [0, -5, 0, -5, 0, 0, 0];
    const translateY = interpolateStops(p, bounceStops, bounceValues) * s;
    const rotateYDeg = p < 0.68 ? 0 : ((p - 0.68) / (1 - 0.68)) * 360;
    // The flip is done as a 2D scaleX, NOT a 3D rotateY. Symptom that led
    // here: the mascot flips fine everywhere on iOS (top bar, drawer) but
    // breaks ONLY inside the search pill — the one place it sits over
    // GradientBorderPill's SVG gradient-border layer. iOS composites a
    // 3D-transformed (perspective/rotateY) child over that SVG context
    // badly. A no-perspective rotateY is visually just a horizontal squash,
    // which scaleX = cos(angle) reproduces exactly: 1 -> 0 -> -1 -> 0 -> 1
    // over the 360°, the negative half being the mirrored "back". It's a
    // pure 2D transform iOS composites cleanly in any container, and it's
    // identical on both platforms so no branching is needed.
    const scaleX = Math.cos((rotateYDeg * Math.PI) / 180);
    return {
      transform: [{ translateY }, { scaleX }],
    };
  });

  const badgeStyle = useAnimatedStyle(() => {
    if (!animated) return { opacity: badge ? 1 : 0 };
    const p = badgeProgress.value;
    const stops = [0, 0.62, 0.78, 1];
    const values = [0, 0, 1.25, 1];
    return { transform: [{ scale: interpolateStops(p, stops, values) }] };
  });

  // Unrolled (not `.map(() => useAnimatedStyle(...))`) — hooks can't be
  // called inside a loop/callback.
  function dotStyleFor(sv: typeof dotProgress[number]) {
    return useAnimatedStyle(() => {
      if (!animated) return { transform: [{ scale: 1 }], opacity: 0.9 };
      const p = sv.value;
      // fkdotpop: 0%/76%/100% -> .45 scale/opacity, 36% -> 1/1.
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

  const tailSize = 8.5 * s;
  const bubbleInset = 1.4 * s;
  const bubbleSize = size - bubbleInset * 2;
  const badgeSize = 9.7 * s;
  const badgeOffset = 2 * s;

  const tailPath = roundedBlobPath(tailSize, tailSize, TAIL_RADII, TAIL_RADII);
  const bubblePath = roundedBlobPath(bubbleSize, bubbleSize, BUBBLE_H_RADII, BUBBLE_V_RADII);

  return (
    // Android wasn't clipping the badge and the iOS-only fixes below didn't
    // actually resolve the iOS clipping either, so these are scoped to iOS
    // only rather than risking a regression on Android's already-working
    // render — see the ios ternaries below.
    //
    // The body wrapper below is NOT platform-branched (unlike the rest of
    // this component) — it used to be `width:'100%',height:'100%'` on iOS
    // specifically, a percentage size on an Animated.View carrying a
    // `transform`. That's the one change that predates every screenshot of
    // the pill mascot rendering as a thin sliver (only the tail visible,
    // bubble collapsed to near-nothing) — the fixed-pixel-size + absolute
    // version below has never shown that symptom on either platform, so
    // it's unified rather than kept iOS-only.
    <View style={{ width: size, height: size, ...(IOS ? { flexShrink: 0, flexGrow: 0 } : null), opacity: animated ? 1 : 0.9, overflow: 'visible' }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size, overflow: 'visible' }, danceStyle]}>
        {/* 1. Tail */}
        <View style={{
          position: 'absolute', left: 2 * s, bottom: 1 * s, width: tailSize, height: tailSize,
          opacity: animated ? 1 : 0.55, transform: [{ rotate: '11deg' }],
        }}>
          <Svg width={tailSize} height={tailSize}>
            <Defs>
              <LinearGradient id={ids.tail} {...TAIL_GRADIENT_DIR}>
                <Stop offset="0" stopColor="#8cc0f7" />
                <Stop offset="1" stopColor="#3f7ee2" />
              </LinearGradient>
            </Defs>
            <Path d={tailPath} fill={`url(#${ids.tail})`} />
          </Svg>
        </View>

        {/* 2. Bubble */}
        <View style={{
          position: 'absolute', left: bubbleInset, top: bubbleInset, width: bubbleSize, height: bubbleSize,
          shadowColor: '#10265c', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 * s }, shadowRadius: 5 * s,
          elevation: 4 * s,
        }}>
          <Svg width={bubbleSize} height={bubbleSize}>
            <Defs>
              <LinearGradient id={ids.bubble} {...BUBBLE_GRADIENT_DIR}>
                <Stop offset="0" stopColor="#cfe8ff" />
                <Stop offset="0.4" stopColor="#86bdf6" />
                <Stop offset="0.66" stopColor="#3f7ee2" />
                <Stop offset="1" stopColor="#aed6ff" />
              </LinearGradient>
              <RadialGradient id={ids.highlight} cx="32%" cy="22%" r="70%">
                <Stop offset="0" stopColor="#ffffff" stopOpacity={0.92} />
                <Stop offset="0.52" stopColor="#ffffff" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Path d={bubblePath} fill={`url(#${ids.bubble})`} />
            <Path d={bubblePath} fill={`url(#${ids.highlight})`} />
          </Svg>

          {/* 3. Three head+shoulders figures (middle one larger) */}
          <View style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            gap: 1.8 * s, paddingRight: 1.5 * s, paddingBottom: 2.2 * s, paddingLeft: 1.5 * s,
          }}>
            <Figure headSize={2.9 * s} bodyW={4.4 * s} bodyH={3 * s} radiusTop={2.2 * s} radiusBottom={0.8 * s} marginTop={0.3 * s} style={dotStyles[0]!} />
            <Figure headSize={3.5 * s} bodyW={5.4 * s} bodyH={3.6 * s} radiusTop={2.7 * s} radiusBottom={0.8 * s} marginTop={0.3 * s} style={dotStyles[1]!} />
            <Figure headSize={2.9 * s} bodyW={4.4 * s} bodyH={3 * s} radiusTop={2.2 * s} radiusBottom={0.8 * s} marginTop={0.3 * s} style={dotStyles[2]!} />
          </View>
        </View>
      </Animated.View>

      {/* 4. Badge */}
      {badge && (
        <Animated.View style={[
          { position: 'absolute', top: -badgeOffset, right: -badgeOffset, width: badgeSize, height: badgeSize },
          badgeStyle,
        ]}>
          <Svg width={badgeSize} height={badgeSize}>
            <Defs>
              <RadialGradient id={ids.badge} cx="35%" cy="30%" r="75%">
                <Stop offset="0" stopColor="#ff9384" />
                <Stop offset="1" stopColor="#e0432f" />
              </RadialGradient>
            </Defs>
            <Circle cx={badgeSize / 2} cy={badgeSize / 2} r={badgeSize / 2} fill={`url(#${ids.badge})`} />
          </Svg>
          <View style={{ position: 'absolute', width: badgeSize, height: badgeSize, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.Text
              style={IOS
                ? { fontSize: 5.5 * s, fontWeight: '600', color: '#ffffff', lineHeight: 5.5 * s, padding: 0, fontVariant: ['tabular-nums'] }
                : { fontSize: 5.5 * s, fontWeight: '600', color: '#ffffff', lineHeight: 5.5 * s * 1.2 }}
            >
              1
            </Animated.Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function Figure({ headSize, bodyW, bodyH, radiusTop, radiusBottom, marginTop, style }: {
  headSize: number; bodyW: number; bodyH: number; radiusTop: number; radiusBottom: number; marginTop: number;
  style: ReturnType<typeof useAnimatedStyle>;
}) {
  return (
    <Animated.View style={[{ alignItems: 'center' }, style]}>
      <View style={{ width: headSize, height: headSize, borderRadius: headSize / 2, backgroundColor: '#21314e' }} />
      <View style={{
        width: bodyW, height: bodyH, marginTop,
        borderTopLeftRadius: radiusTop, borderTopRightRadius: radiusTop,
        borderBottomLeftRadius: radiusBottom, borderBottomRightRadius: radiusBottom,
        backgroundColor: '#21314e',
      }} />
    </Animated.View>
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
