import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { ChevronLeftIcon, MaterialBackIcon } from '../components/icons';

// See navigation/Shell.tsx — Android's statusBarTranslucent inset still
// lands tighter than iOS, so nudge it down a bit further.
const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

// Notifications per README §11 — a full-screen page (not a bottom sheet),
// back affordance + title, no top border on the first row (list content
// comes in a later step). Absolutely positioned (see `overlay` below), so
// it doesn't inherit Shell's safe-area padding — needs its own top inset.
// paddingTop lives on a separate wrapper from the fixed-height row (RN's
// border-box sizing means padding on a height-52 box would shrink its
// content instead of growing the box).
export default function NotificationsOverlay({ onClose }: { onClose: () => void }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const BackIcon = Platform.OS === 'ios' ? ChevronLeftIcon : MaterialBackIcon;

  return (
    <View style={[styles.overlay, { backgroundColor: tokens.bg }]}>
      <View style={{ paddingTop: insets.top + ANDROID_TOP_EXTRA, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <BackIcon size={20} color={tokens.text} />
          </Pressable>
          <Text style={[styles.title, { color: tokens.text }]}>Notifications</Text>
        </View>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: tokens['text-2'], fontSize: 14 }}>Notifications — coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 65,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
});
