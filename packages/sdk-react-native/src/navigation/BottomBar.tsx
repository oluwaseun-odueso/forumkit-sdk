import type { ReactNode } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, GlassContainer } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { glassTint, glassFill, GLASS_INTENSITY, LIQUID_GLASS_AVAILABLE } from '../lib/glass';
import { HomeIcon, BellIcon } from '../components/icons';

const IS_IOS = Platform.OS === 'ios';

// Floating pill bottom bar per README §7 — Home / Create FAB / Notifications
// bell / profile avatar, exactly four items. On iOS 26+ this is real Apple
// Liquid Glass (GlassContainer/GlassView from expo-glass-effect) — the actual
// native glass material with specular highlights, not an approximation.
// Everywhere else it falls back to expo-blur's frosted system material. The
// bottom offset adds the device's own safe-area inset (the 3-button/gesture
// nav bar on Android, home indicator on iOS) on top of the visual margin, so
// hardware nav controls never sit over the bar.
// avatarUrl intentionally not wired yet — this step ships a placeholder
// gradient circle only (real avatar image comes with the actual Profile
// screen content in a later step).
export default function BottomBar({
  homeActive, notificationsActive, profileActive, onHome, onCreate, onNotifications, onProfile,
}: {
  homeActive: boolean;
  notificationsActive: boolean;
  profileActive: boolean;
  onHome: () => void;
  onCreate: () => void;
  onNotifications: () => void;
  onProfile: () => void;
}) {
  const { tokens } = useTheme();
  const safeBottom = useSafeAreaInsets().bottom;
  const insets = IS_IOS
    ? { left: 24, right: 24, bottom: safeBottom + 8 }
    : { left: 20, right: 20, bottom: safeBottom + 10 };
  const position = { left: insets.left, right: insets.right, bottom: insets.bottom };

  const items = (
    <>
      <TabItem active={homeActive} onPress={onHome} label="Home" renderIcon={color => <HomeIcon size={20} color={color} />} />
      <Pressable onPress={onCreate} style={[styles.fab, { backgroundColor: tokens.accent }]}>
        <PlusIconGlyph />
      </Pressable>
      <TabItem active={notificationsActive} onPress={onNotifications} label="Inbox" renderIcon={color => <BellIcon size={19} color={color} />} />
      <TabItem active={profileActive} onPress={onProfile} label="Profile" renderIcon={() => <View style={styles.avatar} />} />
    </>
  );

  if (LIQUID_GLASS_AVAILABLE) {
    return (
      // spacing lets the active tab's own nested GlassView (below, in
      // TabItem) visually merge with this background glass — the "liquid"
      // part of Liquid Glass — rather than sitting as two flat unrelated
      // layers.
      <GlassContainer spacing={14} style={[styles.bar, position]}>
        {/* 'clear' — Apple's more-transparent, less-adaptive-blur style; a
            prior version used 'regular' to calm an earlier too-dark/muddy
            render, but that was really the missing tintColor below, not this
            style. Now that the color is right, 'clear' per feedback: more
            transparent, less blurry. colorScheme="light" alone did NOT force
            a light render on-device — the explicit white tintColor is what
            actually did. */}
        <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="clear" colorScheme="light" tintColor="#d5d2d27d" />
        {items}
      </GlassContainer>
    );
  }

  return (
    <BlurView
      intensity={GLASS_INTENSITY}
      tint={glassTint()}
      // Android's blur is off ('none') by default — opt in for real blur.
      blurMethod="dimezisBlurView"
      style={[styles.bar, position, glassFill(tokens.glass)]}
    >
      {items}
    </BlurView>
  );
}

// One tab's icon+label. On iOS 26+, the active tab is its own small, plain
// (no color tint) GlassView — isInteractive, merges with the bar's
// background glass via the shared GlassContainer above, giving it the real
// "selected glass capsule" look iOS tab bars use. No tintColor: the
// reference is a neutral light highlight, not a colored pill. Elsewhere, the
// active tab gets the subtler theme-aware hover-2 fill instead. `renderIcon`
// takes the resolved color so the same icon is muted when inactive, accent
// when active — that accent color lives on the icon/label text, not the
// pill's own background.
function TabItem({ active, renderIcon, label, onPress }: {
  active: boolean;
  renderIcon: (color: string) => ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const color = active ? tokens.accent : tokens['text-2'];
  const content = (
    <>
      {renderIcon(color)}
      <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
    </>
  );

  if (active && LIQUID_GLASS_AVAILABLE) {
    return (
      <Pressable onPress={onPress}>
        <GlassView style={styles.item} glassEffectStyle="clear" colorScheme="light" tintColor="#ffffff" isInteractive>
          {content}
        </GlassView>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.item, active && { backgroundColor: tokens['hover-2'] }]}>
      {content}
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
  // pinched/concave corner instead of a clean capsule. radius = height/2.
  bar: {
    position: 'absolute',
    // Higher than ComposerOverlay's bottomBackdrop (55) — that backdrop
    // fills the same reserved bottom strip to hide the feed behind the
    // composer, and the bar needs to stay visible/tappable on top of it.
    zIndex: 56,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
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
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#b97d52',
  },
});
