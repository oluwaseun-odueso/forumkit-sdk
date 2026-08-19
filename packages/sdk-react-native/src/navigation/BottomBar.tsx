import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
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
      <Pressable onPress={onHome} style={[styles.item, homeActive && { backgroundColor: tokens['hover-2'] }]}>
        <HomeIcon size={20} color={homeActive ? tokens.accent : tokens['text-2']} />
        <Text style={[styles.label, { color: homeActive ? tokens.accent : tokens['text-2'] }]} numberOfLines={1}>Home</Text>
      </Pressable>
      <Pressable onPress={onCreate} style={[styles.fab, { backgroundColor: tokens.accent }]}>
        <PlusIconGlyph />
      </Pressable>
      <Pressable onPress={onNotifications} style={[styles.item, notificationsActive && { backgroundColor: tokens['hover-2'] }]}>
        <BellIcon size={19} color={notificationsActive ? tokens.accent : tokens['text-2']} />
        <Text style={[styles.label, { color: notificationsActive ? tokens.accent : tokens['text-2'] }]} numberOfLines={1}>Inbox</Text>
      </Pressable>
      <Pressable onPress={onProfile} style={[styles.item, profileActive && { backgroundColor: tokens['hover-2'] }]}>
        <View style={styles.avatar} />
        <Text style={[styles.label, { color: profileActive ? tokens.accent : tokens['text-2'] }]} numberOfLines={1}>Profile</Text>
      </Pressable>
    </BlurView>
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
  // Icon + label stacked, wrapped in a pill that only gets a fill when
  // active — per reference, the active tab's icon+label sit inside a
  // highlighted capsule, not just the icon alone.
  item: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
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
