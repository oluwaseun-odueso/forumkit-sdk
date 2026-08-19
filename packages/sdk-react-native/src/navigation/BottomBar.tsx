import type { ReactNode } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { glassTint, glassFill, GLASS_INTENSITY } from '../lib/glass';
import { HomeIcon, BellIcon } from '../components/icons';

const IS_IOS = Platform.OS === 'ios';

// Floating pill bottom bar per README §7 — Home / Create FAB / Notifications
// bell / profile avatar, exactly four items. Real frosted-glass blur, no
// border/shadow. The bottom offset adds the device's own safe-area inset (the
// 3-button/gesture nav bar on Android, home indicator on iOS) on top of the
// visual margin, so hardware nav controls never sit over the bar.
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
  const { tokens, mode } = useTheme();
  const safeBottom = useSafeAreaInsets().bottom;
  const insets = IS_IOS
    ? { left: 24, right: 24, bottom: safeBottom + 8 }
    : { left: 20, right: 20, bottom: safeBottom + 10 };

  return (
    <BlurView
      intensity={GLASS_INTENSITY}
      tint={glassTint(mode)}
      // Android's blur is off ('none') by default — opt in for real blur.
      blurMethod="dimezisBlurView"
      style={[
        styles.bar,
        { left: insets.left, right: insets.right, bottom: insets.bottom },
        glassFill(tokens.glass),
      ]}
    >
      <TabItem active={homeActive} onPress={onHome} label="Home" renderIcon={color => <HomeIcon size={20} color={color} />} />
      <Pressable onPress={onCreate} style={[styles.fab, { backgroundColor: tokens.accent }]}>
        <PlusIconGlyph />
      </Pressable>
      <TabItem active={notificationsActive} onPress={onNotifications} label="Inbox" renderIcon={color => <BellIcon size={19} color={color} />} />
      <TabItem active={profileActive} onPress={onProfile} label="Profile" renderIcon={() => <View style={styles.avatar} />} />
    </BlurView>
  );
}

// One tab's icon+label. The active tab gets a subtle, fully-rounded frosted
// highlight (the theme-aware hover-2 token: a faint light overlay on dark, a
// faint dark overlay on light) matching the reference's active-pill look —
// deliberately subtle, not a heavy solid fill. `renderIcon` takes the resolved
// color so the same icon is muted when inactive, accent when active.
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
  bar: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  // Icon + label stacked; the active tab fills this with a fully-rounded
  // frosted pill (borderRadius 999 = well-rounded per feedback).
  item: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
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
