import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { searchUsers } from '@forumkit/shared';
import type { UserSearchResult } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import Avatar from './Avatar';

// In-app member share — the native platform's share target (per ForumKitConfig:
// native share goes to in-app member sharing, not a copyable link). Mirrors
// sdk-web's share-modal.tsx: search members, select recipients, send.
export default function ShareSheet({ apiUrl, forumId, token, onClose, onShare }: {
  apiUrl: string;
  forumId: string;
  token: string | undefined;
  onClose: () => void;
  onShare: (recipientIds: string[]) => void;
}) {
  const { tokens } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const handle = setTimeout(() => {
      setLoading(true);
      searchUsers(apiUrl, forumId, q, { limit: 20 }, token)
        .then(r => setResults(r.results))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, apiUrl, forumId, token]);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: tokens.elev, borderColor: tokens.border }]} onPress={() => {}}>
          <Text style={[styles.title, { color: tokens.text }]}>Share with a member</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search members"
            placeholderTextColor={tokens.muted}
            style={[styles.search, { color: tokens.text, backgroundColor: tokens['surface-2'], borderColor: tokens['border-strong'] }]}
          />
          {loading ? (
            <ActivityIndicator color={tokens.accent} style={{ padding: 16 }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={u => u.id}
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => {
                const isSel = selected.has(item.id);
                return (
                  <Pressable onPress={() => toggle(item.id)} style={styles.row}>
                    <Avatar authorId={item.id} author={item.displayName} avatarUrl={item.avatarUrl} size={32} />
                    <Text style={{ flex: 1, color: tokens.text, fontSize: 14 }}>{item.displayName}</Text>
                    <View style={[styles.check, { borderColor: isSel ? tokens.accent : tokens['border-strong'], backgroundColor: isSel ? tokens.accent : 'transparent' }]} />
                  </Pressable>
                );
              }}
              ListEmptyComponent={query.trim() ? <Text style={{ color: tokens.muted, fontSize: 13, padding: 12 }}>No members found</Text> : null}
            />
          )}
          <Pressable
            onPress={() => { onShare([...selected]); onClose(); }}
            disabled={selected.size === 0}
            style={[styles.shareBtn, { backgroundColor: tokens.accent, opacity: selected.size ? 1 : 0.5 }]}
          >
            <Text style={{ color: tokens['accent-fg'], fontWeight: '700', fontSize: 14 }}>
              Share{selected.size ? ` (${selected.size})` : ''}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  search: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  check: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  shareBtn: { borderRadius: 999, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
});
