import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Confirm dialog — the RN counterpart to sdk-web's confirm-dialog.tsx. Used for
// destructive actions (delete post/comment).
export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onCancel, onConfirm }: {
  title: string;
  message?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Modal transparent visible animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel}>
        <Pressable style={[styles.card, { backgroundColor: tokens.elev, borderColor: tokens.border }]} onPress={() => {}}>
          <Text style={[styles.title, { color: tokens.text }]}>{title}</Text>
          {message && <Text style={[styles.msg, { color: tokens['text-2'] }]}>{message}</Text>}
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.btn, { backgroundColor: tokens['surface-2'] }]}>
              <Text style={{ color: tokens['text-2'], fontWeight: '700', fontSize: 13.5 }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={[styles.btn, { backgroundColor: tokens.danger }]}>
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13.5 }}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: { width: '100%', maxWidth: 340, borderWidth: 1, borderRadius: 16, padding: 18 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  msg: { fontSize: 13.5, lineHeight: 20, marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18 },
});
