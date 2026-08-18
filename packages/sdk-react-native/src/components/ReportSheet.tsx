import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const REASONS = ['Spam', 'Harassment or bullying', 'Hate speech', 'Misinformation', 'Sexual content', 'Other'];

// Report reason picker (bottom sheet) — replaces the canned reason. Reused for
// threads and comments; mirrors the intent of sdk-web's report-modal.tsx.
export default function ReportSheet({ target, onClose, onSubmit }: {
  target: 'post' | 'comment';
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: tokens.elev, borderColor: tokens.border }]} onPress={() => {}}>
          <Text style={[styles.title, { color: tokens.text }]}>Report {target}</Text>
          {REASONS.map(reason => (
            <Pressable
              key={reason}
              onPress={() => { onSubmit(reason); onClose(); }}
              style={[styles.row, { borderTopColor: tokens.border }]}
            >
              <Text style={{ color: tokens.text, fontSize: 14.5 }}>{reason}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={[styles.cancel, { backgroundColor: tokens['surface-2'] }]}>
            <Text style={{ color: tokens['text-2'], fontWeight: '700', fontSize: 14 }}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  row: { paddingVertical: 14, borderTopWidth: 1 },
  cancel: { borderRadius: 999, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
});
