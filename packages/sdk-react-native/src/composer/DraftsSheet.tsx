import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { listDrafts, deleteDraft, fmtRelativeTime } from '@forumkit/shared';
import type { Draft } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { CloseIcon } from '../components/icons';
import Mascot from '../components/Mascot';

// Drafts list (bottom sheet) — mirrors sdk-web's drafts-list-modal. Opened from
// the composer's "Drafts" link: tap a draft to load it into the composer, or
// delete it. A banner notes media isn't saved in drafts.
export default function DraftsSheet({ apiUrl, forumId, token, onClose, onOpen }: {
  apiUrl: string;
  forumId: string;
  token: string | undefined;
  onClose: () => void;
  onOpen: (draft: Draft) => void;
}) {
  const { tokens } = useTheme();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    listDrafts(apiUrl, forumId, token)
      .then(d => { if (!cancelled) setDrafts(d); })
      .catch(() => { if (!cancelled) setDrafts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, token]);

  function remove(id: string) {
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (token) void deleteDraft(apiUrl, forumId, id, token).catch(() => { /* best effort */ });
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: tokens.elev, borderColor: tokens.border }]} onPress={() => {}}>
          <Text style={[styles.title, { color: tokens.text }]}>Drafts</Text>
          <Text style={[styles.note, { color: tokens.muted }]}>Media isn’t saved in drafts.</Text>

          {loading ? (
            <View style={{ alignItems: 'center', padding: 16 }}><Mascot size={36} /></View>
          ) : drafts.length === 0 ? (
            <Text style={{ color: tokens['text-2'], padding: 12 }}>No drafts yet</Text>
          ) : (
            <FlatList
              data={drafts}
              keyExtractor={d => d.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => onOpen(item)} style={[styles.row, { borderTopColor: tokens.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dTitle, { color: tokens.text }]} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                    {item.content.body ? <Text style={[styles.dBody, { color: tokens['text-2'] }]} numberOfLines={1}>{item.content.body}</Text> : null}
                    <Text style={[styles.dTime, { color: tokens.muted }]}>{fmtRelativeTime(item.updatedAt)}</Text>
                  </View>
                  <Pressable onPress={() => remove(item.id)} hitSlop={8} style={[styles.del, { backgroundColor: tokens['surface-2'] }]}>
                    <CloseIcon size={14} color={tokens['text-2']} />
                  </Pressable>
                </Pressable>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  title: { fontSize: 16, fontWeight: '800' },
  note: { fontSize: 12, marginTop: 4, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1 },
  dTitle: { fontSize: 14.5, fontWeight: '700' },
  dBody: { fontSize: 13, marginTop: 2 },
  dTime: { fontSize: 12, marginTop: 4 },
  del: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
