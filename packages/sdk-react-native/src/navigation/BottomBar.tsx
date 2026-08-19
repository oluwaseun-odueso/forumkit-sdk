import type { ReactNode } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { GlossyPill } from '../components/Pill';
import { HomeIcon, BellIcon } from '../components/icons';

// Floating pill bottom bar per README §7 — Home / Create FAB / Notifications
// bell / profile avatar, exactly four items. Glassy per user feedback: a real
// blur (not just a translucent fill) with no border/shadow. The bottom offset
// adds the device's own safe-area inset (the 3-button/gesture nav bar on
// Android, home indicator on iOS) on top of the visual margin, so hardware
// nav controls never sit over the bar.
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
  const insets = Platform.OS === 'ios'
    ? { left: 24, right: 24, bottom: safeBottom + 8 }
    : { left: 20, right: 20, bottom: safeBottom + 10 };

  return (
    <BlurView
      intensity={80}
      tint={mode === 'dark' ? 'dark' : 'light'}
      // expo-blur's Android blur defaults to 'none' (no actual blur, just a
      // flat translucent fill) unless opted into — without this, the bar had
      // no real glass distortion on Android, just a faint tint that read as
      // "blends into the background".
      blurMethod="dimezisBlurView"
      style={[
        styles.bar,
        { left: insets.left, right: insets.right, bottom: insets.bottom, backgroundColor: tokens.glass },
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

// One tab's icon+label — inactive is a plain (no fill) column, active wraps
// the same content in GlossyPill (dark/translucent/glossy fill, well-rounded
// per feedback) so the active tab reads clearly against the bar's own light
// glass tint. `renderIcon` takes the resolved color so the same icon can be
// muted (inactive) or accent-colored (active) without the caller branching.
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

  return (
    <Pressable onPress={onPress} style={styles.item}>
      {active
        ? <GlossyPill contentStyle={styles.itemInner}>{content}</GlossyPill>
        : <View style={styles.itemInner}>{content}</View>}
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
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Icon + label stacked; used both as the inactive (unfilled) layout and as
  // GlossyPill's inner content when active.
  itemInner: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
