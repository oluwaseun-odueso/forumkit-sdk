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
// Also the collapsed state's circle diameter — borderRadius stays BAR_HEIGHT/2
// throughout the width animation, which is simultaneously a valid capsule
// radius at full pill width and a valid circle radius at width === BAR_HEIGHT.
const BAR_HEIGHT = 66;

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

  const containerStyle = useAnimatedStyle(() => ({
    width: expandedWidth + (BAR_HEIGHT - expandedWidth) * collapseProgress.value,
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
      {background}

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
          <HomeIcon size={20} color={homeActive ? tokens.accent : tokens['text-2']} />
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
  // pinched/concave corner instead of a clean capsule. radius = height/2,
  // which stays valid across the whole collapse animation (see BAR_HEIGHT).
  bar: {
    position: 'absolute',
    // Higher than ComposerOverlay's bottomBackdrop (55) — that backdrop
    // fills the same reserved bottom strip to hide the feed behind the
    // composer, and the bar needs to stay visible/tappable on top of it.
    zIndex: 56,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Background layer (GlassContainer or BlurView) — same explicit radius as
  // `bar` for the native glass corner API reason above; overflow:hidden on
  // `bar` already clips it, this radius is what makes the glass material's
  // own edge rendering (not just RN's clipping) follow the rounded shape.
  glassFill: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: BAR_HEIGHT / 2,
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
  collapsedHomeTarget: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
