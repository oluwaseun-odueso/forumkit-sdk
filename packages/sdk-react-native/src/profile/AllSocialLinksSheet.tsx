import { Modal, View, Text, Pressable, ScrollView, Linking, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { CloseIcon, PencilIcon, LinkIcon } from '../components/icons';
import { SOCIAL_PLATFORM_ICON } from './SocialLinks';
import { useSheetLayout } from '../lib/sheet-layout';

// "View all" social links sheet, opened from SocialLinks.tsx's "View all"
// pill once a profile has more links than fit inline. Reuses
// EditProfileSheet's scrim + pointerEvents="box-none" sheet shell — the
// scrim and the sheet-positioning wrapper are siblings, not nested, so a
// scroll gesture's release inside the list can't get mistaken for a tap
// that bubbles up and closes the sheet mid-scroll.
export default function AllSocialLinksSheet({ links, onClose, onEditProfile }: {
  links: Array<{ platform: string; url: string }>;
  onClose: () => void;
  onEditProfile?: () => void;
}) {
  const { tokens } = useTheme();
  const { maxHeight, paddingBottom } = useSheetLayout(24);

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: tokens.elev, borderColor: tokens.border, maxHeight, paddingBottom }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: tokens.text }]}>Social links</Text>
            <View style={styles.headerBtns}>
              {onEditProfile && <Pressable onPress={onEditProfile} hitSlop={8}><PencilIcon size={16} color={tokens.text} /></Pressable>}
              <Pressable onPress={onClose} hitSlop={8}><CloseIcon size={18} color={tokens.text} /></Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
            {links.map((l, i) => {
              const Icon = SOCIAL_PLATFORM_ICON[l.platform] ?? LinkIcon;
              return (
                <Pressable key={`${l.platform}-${i}`} onPress={() => void Linking.openURL(l.url)} style={styles.row}>
                  <Icon size={18} color={tokens.text} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.platform, { color: tokens.text }]}>{l.platform}</Text>
                    <Text style={[styles.url, { color: tokens.muted }]} numberOfLines={1}>{l.url}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  title: { fontSize: 16, fontWeight: '800' },
  // No divider lines between rows, per the request — vertical padding alone.
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  platform: { fontSize: 14, fontWeight: '600' },
  url: { fontSize: 12.5, marginTop: 2 },
});
