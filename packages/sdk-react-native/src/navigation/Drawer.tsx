import { Modal, View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import Mascot from '../components/Mascot';
import { HomeIcon, PopularIcon, NewsIcon } from '../components/icons';

// See navigation/Shell.tsx — Android's statusBarTranslucent inset still
// lands tighter than iOS, so nudge it down a bit further.
const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

export type DrawerRoute = 'home' | 'popular' | 'news';

// Hamburger drawer per README §5 — scrim + 250px panel, brand row (mascot +
// Michroma wordmark), Home/Popular/News. No divider, no Create Post row.
// Glassy per user feedback (matches the bottom bar): a real blur instead of
// an opaque fill, no border.
export default function Drawer({ open, onClose, activeRoute, onSelectRoute }: {
  open: boolean;
  onClose: () => void;
  activeRoute: DrawerRoute;
  onSelectRoute: (route: DrawerRoute) => void;
}) {
  const { tokens, mode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        {/* Panel click doesn't close — stopPropagation equivalent is just
            not forwarding the press to the scrim's Pressable, achieved by
            this inner Pressable swallowing the event. */}
        <Pressable onPress={() => {}}>
        <BlurView
          intensity={60}
          tint={mode === 'dark' ? 'dark' : 'light'}
          style={[styles.panel, { backgroundColor: tokens.glass, paddingTop: 16 + insets.top + ANDROID_TOP_EXTRA }]}
        >
          <View style={styles.brandRow}>
            {Platform.OS === 'ios'
              ? <View style={{ flexShrink: 0, flexGrow: 0, overflow: 'visible' }}><Mascot size={24} /></View>
              : <Mascot size={24} />}
            <Text style={[styles.wordmark, { color: tokens.text }]}>FORUM KIT</Text>
          </View>

          <DrawerRow
            label="Home"
            active={activeRoute === 'home'}
            icon={<HomeIcon size={20} color={activeRoute === 'home' ? tokens.text : tokens['text-2']} />}
            onPress={() => onSelectRoute('home')}
          />
          <DrawerRow
            label="Popular"
            active={activeRoute === 'popular'}
            icon={<PopularIcon size={20} color={tokens['text-2']} />}
            onPress={() => onSelectRoute('popular')}
          />
          <DrawerRow
            label="News"
            active={activeRoute === 'news'}
            icon={<NewsIcon size={20} color={tokens['text-2']} />}
            onPress={() => onSelectRoute('news')}
          />
        </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DrawerRow({ label, icon, active, onPress }: { label: string; icon: React.ReactNode; active: boolean; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, active && { backgroundColor: tokens['hover-2'] }]}
    >
      {icon}
      <Text style={[styles.rowLabel, { color: active ? tokens.text : tokens['text-2'], fontWeight: active ? '600' : '400' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  panel: {
    width: 250,
    height: '100%',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 16,
  },
  wordmark: {
    // Must match the key useFonts() was called with in ForumKit.tsx exactly
    // — iOS resolves fonts leniently by the name baked into the file's own
    // metadata (so 'Michroma' happened to work there), Android requires the
    // exact registered key and silently falls back to the system font
    // otherwise, which was the platform mismatch here.
    fontFamily: 'Michroma_400Regular',
    fontSize: 11,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  rowLabel: {
    fontSize: 15,
  },
});
