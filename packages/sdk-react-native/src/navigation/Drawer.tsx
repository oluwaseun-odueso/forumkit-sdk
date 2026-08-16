import { Modal, View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Mascot from '../components/Mascot';
import { HomeIcon, PopularIcon, NewsIcon } from '../components/icons';

export type DrawerRoute = 'home' | 'popular' | 'news';

// Hamburger drawer per README §5 — scrim + 250px panel, brand row (mascot +
// Michroma wordmark), Home/Popular/News. No divider, no Create Post row.
export default function Drawer({ open, onClose, activeRoute, onSelectRoute }: {
  open: boolean;
  onClose: () => void;
  activeRoute: DrawerRoute;
  onSelectRoute: (route: DrawerRoute) => void;
}) {
  const { tokens } = useTheme();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        {/* Panel click doesn't close — stopPropagation equivalent is just
            not forwarding the press to the scrim's Pressable, achieved by
            this inner Pressable swallowing the event. */}
        <Pressable style={[styles.panel, { backgroundColor: tokens.nav, borderRightColor: tokens.border }]} onPress={() => {}}>
          <View style={styles.brandRow}>
            <Mascot size={24} />
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
    borderRightWidth: 1,
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
    fontFamily: 'Michroma',
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
