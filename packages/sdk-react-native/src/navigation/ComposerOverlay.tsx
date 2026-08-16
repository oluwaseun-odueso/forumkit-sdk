import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { CloseIcon } from '../components/icons';

// Create Post sheet per README §10 — an overlay stopping 94px above the
// bottom so the floating bar stays visible underneath it, no rounded
// bottom corners, no shadow, no divider lines anywhere on this screen.
// Placeholder body for this step; the real tabs/fields come later.
export default function ComposerOverlay({ onClose }: { onClose: () => void }) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.overlay, { backgroundColor: tokens.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose}>
          <CloseIcon size={18} color={tokens.text} />
        </Pressable>
        <Text style={[styles.title, { color: tokens.text }]}>Create post</Text>
        <Text style={{ color: tokens.accent, fontSize: 14, fontWeight: '600' }}>Drafts</Text>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: tokens['text-2'], fontSize: 14 }}>Composer — coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 94,
    zIndex: 60,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
});
