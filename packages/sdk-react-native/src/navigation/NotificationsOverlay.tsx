import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ChevronLeftIcon, MaterialBackIcon } from '../components/icons';

// Notifications per README §11 — a full-screen page (not a bottom sheet),
// back affordance + title, no top border on the first row (list content
// comes in a later step).
export default function NotificationsOverlay({ onClose }: { onClose: () => void }) {
  const { tokens } = useTheme();
  const BackIcon = Platform.OS === 'ios' ? ChevronLeftIcon : MaterialBackIcon;

  return (
    <View style={[styles.overlay, { backgroundColor: tokens.bg }]}>
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <Pressable onPress={onClose} hitSlop={8}>
          <BackIcon size={20} color={tokens.text} />
        </Pressable>
        <Text style={[styles.title, { color: tokens.text }]}>Notifications</Text>
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
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
});
