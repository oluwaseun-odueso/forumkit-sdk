import { Platform, View, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { HomeIcon, BellIcon } from '../components/icons';

// Floating pill bottom bar per README §7 — Home / Create FAB / Notifications
// bell / profile avatar, exactly four items, insets differ per platform to
// clear the home indicator (iOS) vs. gesture bar (Android) — see §3/§7.
// avatarUrl intentionally not wired yet — this step ships a placeholder
// gradient circle only (real avatar image comes with the actual Profile
// screen content in a later step).
export default function BottomBar({ onHome, onCreate, onNotifications, onProfile }: {
  onHome: () => void;
  onCreate: () => void;
  onNotifications: () => void;
  onProfile: () => void;
}) {
  const { tokens } = useTheme();
  const insets = Platform.OS === 'ios'
    ? { left: 24, right: 24, bottom: 18 }
    : { left: 20, right: 20, bottom: 14 };

  return (
    <View
      style={[
        styles.bar,
        {
          left: insets.left, right: insets.right, bottom: insets.bottom,
          backgroundColor: tokens.elev, borderColor: tokens['border-strong'],
        },
      ]}
    >
      <Pressable onPress={onHome} style={styles.item}>
        <HomeIcon size={22} color={tokens.accent} />
      </Pressable>
      <Pressable onPress={onCreate} style={[styles.fab, { backgroundColor: tokens.accent }]}>
        <PlusIconGlyph />
      </Pressable>
      <Pressable onPress={onNotifications} style={styles.item}>
        <BellIcon size={21} color={tokens['text-2']} />
      </Pressable>
      <Pressable onPress={onProfile} style={styles.item}>
        <View style={styles.avatar} />
      </Pressable>
    </View>
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
    height: 58,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 10,
  },
  item: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#b97d52',
  },
});
