import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Platform, View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { GlassView, GlassContainer } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { glassTint, glassBarTint, glassPillTint, glassBorderColor, glassFill, GLASS_INTENSITY, LIQUID_GLASS_AVAILABLE } from '../lib/glass';
import { HomeIcon, BellIcon } from '../components/icons';
import Avatar from '../components/Avatar';

const IS_IOS = Platform.OS === 'ios';
const BAR_HEIGHT = 66;
// The collapsed circle is smaller than the expanded bar's height, not equal
// to it — width, height, and borderRadius all animate together (radius always
// tracks size/2, valid as a capsule at full width and a circle at any smaller
// size), unlike the earlier version where only width animated and the circle
// was pinned to BAR_HEIGHT. Kept ≥44pt so it stays a real iOS/Android tap
// target despite being visually smaller than the expanded bar.
const COLLAPSED_SIZE = 52;

// Floating pill bottom bar per README §7 — Home / Create FAB / Notifications
// bell / profile avatar, exactly four items. On iOS 26+ this is real Apple
// Liquid Glass (GlassContainer/GlassView from expo-glass-effect) — the actual
// native glass material with specular highlights, not an approximation.
// Everywhere else it falls back to expo-blur's frosted system material. The
// bottom offset adds the device's own safe-area inset (the 3-button/gesture
// nav bar on Android, home indicator on iOS) on top of the visual margin, so
// hardware nav controls never sit over the bar.
//
// `collapsed` shrinks the bar down to just a Home-only circle (scroll-driven,
// via Shell's setBottomBarCollapsed / useScrollCollapse) — BottomBar owns the
// width/opacity animation internally so it stays a stateless, fully-controlled
// component from Shell's point of view, same as homeActive/notificationsActive.
export default function BottomBar({
  collapsed, homeActive, notificationsActive, profileActive, authorId, displayName, avatarUrl,
  onHome, onCreate, onNotifications, onProfile,
}: {
  collapsed: boolean;
  homeActive: boolean;
  notificationsActive: boolean;
  profileActive: boolean;
  authorId?: string | undefined;
  displayName?: string | undefined;
  avatarUrl?: string | null | undefined;
  onHome: () => void;
  onCreate: () => void;
  onNotifications: () => void;
  onProfile: () => void;
}) {
  const { tokens, mode } = useTheme();
  const safeBottom = useSafeAreaInsets().bottom;
  const windowWidth = useWindowDimensions().width;
  const insets = IS_IOS
    ? { left: 24, right: 24, bottom: safeBottom + 8 }
    : { left: 20, right: 20, bottom: safeBottom + 10 };
  const expandedWidth = windowWidth - insets.left - insets.right;

  // 0 = expanded, 1 = collapsed. Same useSharedValue/useEffect/withTiming
  // template as Shell's own drawerX.
  const collapseProgress = useSharedValue(0);
  useEffect(() => {
    collapseProgress.value = withTiming(collapsed ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
  }, [collapsed, collapseProgress]);

  const containerStyle = useAnimatedStyle(() => {
    const size = BAR_HEIGHT + (COLLAPSED_SIZE - BAR_HEIGHT) * collapseProgress.value;
    return {
      width: expandedWidth + (COLLAPSED_SIZE - expandedWidth) * collapseProgress.value,
      height: size,
      borderRadius: size / 2,
    };
  });
  // Same radius as containerStyle, isolated onto its own wrapping Animated.View
  // around the glass background below — GlassContainer/BlurView aren't
  // Reanimated-aware, so they can't consume an animated style directly, and
  // the background needs to track the *current* animated radius itself (not
  // just be clipped by the outer view's overflow:hidden) since GlassView's
  // native corner API doesn't clamp an oversized radius — see the `bar` style
  // comment below for what happens when it doesn't match.
  const backgroundRadiusStyle = useAnimatedStyle(() => ({
    borderRadius: (BAR_HEIGHT + (COLLAPSED_SIZE - BAR_HEIGHT) * collapseProgress.value) / 2,
  }));
  const expandedContentStyle = useAnimatedStyle(() => ({ opacity: 1 - collapseProgress.value }));
  const collapsedContentStyle = useAnimatedStyle(() => ({ opacity: collapseProgress.value }));

  const background = LIQUID_GLASS_AVAILABLE ? (
    <GlassContainer spacing={14} style={styles.glassFill}>
      {/* tintColor swaps instantly with `collapsed` rather than crossfading —
          the 220ms width animation is already the dominant visual motion, so
          interpolating between two tint colors on top of it isn't worth the
          extra complexity. */}
      <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="clear" colorScheme={mode} tintColor={collapsed ? glassPillTint(mode) : glassBarTint(mode)} />
    </GlassContainer>
  ) : (
    <BlurView
      intensity={GLASS_INTENSITY}
      tint={glassTint(mode)}
      // Android's blur is off ('none') by default — opt in for real blur.
      blurMethod="dimezisBlurView"
      style={[styles.glassFill, glassFill(tokens.glass)]}
    />
  );

  return (
    <Animated.View style={[styles.bar, { left: insets.left, bottom: insets.bottom, borderColor: glassBorderColor(mode) }, containerStyle]}>
      <Animated.View style={[styles.backgroundClip, backgroundRadiusStyle]}>
        {background}
      </Animated.View>

      {/* Expanded: the original 4-item row. pointerEvents toggles in lockstep
          with `collapsed` (not animated/delayed) so Create/Inbox/Profile are
          never tappable-but-invisible once the bar has visually shrunk. */}
      <Animated.View style={[styles.content, expandedContentStyle]} pointerEvents={collapsed ? 'none' : 'auto'}>
        <TabItem active={homeActive} onPress={onHome} label="Home" renderIcon={color => <HomeIcon size={20} color={color} />} />
        <Pressable onPress={onCreate} style={[styles.fab, { backgroundColor: tokens.accent }]}>
          <PlusIconGlyph />
        </Pressable>
        <TabItem active={notificationsActive} onPress={onNotifications} label="Inbox" renderIcon={color => <BellIcon size={19} color={color} />} />
        <TabItem
          active={profileActive}
          onPress={onProfile}
          label="Profile"
          renderIcon={() => <Avatar authorId={authorId} author={displayName ?? 'You'} avatarUrl={avatarUrl} size={20} />}
        />
      </Animated.View>

      {/* Collapsed: just Home, reusing its existing unchanged onHome handler
          — tapping it navigates home exactly like the expanded tab does, no
          separate expand gesture. */}
      <Animated.View style={[styles.collapsedContent, collapsedContentStyle]} pointerEvents={collapsed ? 'auto' : 'none'}>
        <Pressable onPress={onHome} style={styles.collapsedHomeTarget}>
          <HomeIcon size={26} color={homeActive ? tokens.accent : tokens['text-2']} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// One tab's icon+label. The active tab gets a flat, theme-aware hover-2
// fill on every platform — this used to be a real, translucent Liquid Glass
// pill on iOS 26+, but glass is inherently translucent/refractive by
// design, so it can't guarantee reading well against whatever content sits
// behind the bar (the same reasoning that already replaced the hamburger
// drawer's glass background with a solid one). `renderIcon` takes the
// resolved color so the same icon is muted when inactive, accent when
// active — that accent color lives on the icon/label text, not the pill's
// own background.
function TabItem({ active, renderIcon, label, onPress }: {
  active: boolean;
  renderIcon: (color: string) => ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const color = active ? tokens.accent : tokens['text-2'];
  return (
    <Pressable onPress={onPress} style={[styles.item, active && { backgroundColor: tokens['hover-2'] }]}>
      {renderIcon(color)}
      <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

// The FAB's plus glyph is a plain white cross, not the outlined-square
// PlusIcon used elsewhere (that one's for the Create Post button, matching
// its own reference) — kept inline since it's a one-off shape.
function PlusIconGlyph() {
  return (
    <View style={{ width: 16, height: 16 }}>
      <View style={{ position: 'absolute', left: 7, top: 0, width: 2, height: 16, backgroundColor: '#fff', borderRadius: 1 }} />
      <View style={{ position: 'absolute', top: 7, left: 0, height: 2, width: 16, backgroundColor: '#fff', borderRadius: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  // height + borderRadius are both explicit (not the usual borderRadius:999
  // shorthand) because GlassView's native corner API doesn't clamp an
  // oversized radius to half the shape's size the way CSS/plain RN Views do
  // — 999 on a real GlassView overshot the ~64px-tall bar and rendered as a
  // pinched/concave corner instead of a clean capsule. height/borderRadius
  // are set by containerStyle (animated) instead of here, since they now
  // transition between the expanded bar's and collapsed circle's sizes —
  // radius always tracks size/2 there too, same reasoning, just per-frame.
  bar: {
    position: 'absolute',
    // Higher than ComposerOverlay's bottomBackdrop (55) — that backdrop
    // fills the same reserved bottom strip to hide the feed behind the
    // composer, and the bar needs to stay visible/tappable on top of it.
    zIndex: 56,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Background layer (GlassContainer or BlurView) — just an edge-to-edge
  // fill; radius + clipping come from the wrapping backgroundClip
  // Animated.View below (it tracks the live collapse-animation radius, which
  // this static stylesheet can't).
  glassFill: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  // Wraps the glass background — its own radius must track the same
  // animated value as `bar`'s (via backgroundRadiusStyle), not a fixed one:
  // GlassView's native corner API doesn't clamp an oversized radius to half
  // its own bounds (see the `bar` comment above), so a static radius here
  // would render as a pinched/concave corner once the collapsed circle is a
  // different size than the expanded bar's radius.
  backgroundClip: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    overflow: 'hidden',
  },
  // Icon + label stacked; the active tab fills this with a fully-rounded
  // pill. Same explicit-radius reasoning as `bar` above.
  item: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: 25,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
  },
  fab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
  },
  collapsedContent: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fills whatever size the (animated) collapsed circle actually is, rather
  // than a fixed size, so the tap target always matches what's drawn.
  collapsedHomeTarget: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
