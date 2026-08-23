import { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { getModerationQueue, resolveModerationItem } from '@forumkit/shared';
import type { ModerationQueueItem } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Shell from '../navigation/Shell';
import BackRow from '../components/BackRow';
import Mascot from '../components/Mascot';
import { ShieldIcon, ReportIcon, CheckIcon, CloseIcon } from '../components/icons';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Reached from the drawer's "Moderation" row (moderator/admin only — see
// Shell.tsx's isModerator check). Mirrors sdk-web's Moderation.tsx: a
// queue of pending user reports and AI-flagged content, one table serving
// both (see badgeFor), with Approve/Remove actions per row. No pagination
// widget — matches this app's other list screens (Search, Notifications),
// which likewise fetch one page and stop rather than infinite-scrolling.
const PAGE_LIMIT = 50;

function badgeFor(item: ModerationQueueItem): { label: string; Icon: typeof ShieldIcon; color: string } {
  if (item.reporterId) return { label: 'Reported', Icon: ReportIcon, color: '#ef4444' };
  return { label: `AI flagged ${Math.round(item.aiScore * 100)}%`, Icon: ShieldIcon, color: '#f59e0b' };
}

export default function ModerationScreen() {
  const { tokens } = useTheme();
  const session = useSession();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { apiUrl } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getModerationQueue(apiUrl, { limit: PAGE_LIMIT }, token)
      .then(r => { if (!cancelled) setItems(r.items); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load the queue'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, token]);

  async function handleResolve(item: ModerationQueueItem, action: 'approved' | 'removed') {
    setResolvingId(item.id);
    try {
      await resolveModerationItem(apiUrl, item.id, action, token);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {
      // Left in the list on failure so the moderator can retry — a
      // silently-failed approve/remove would leave the queue looking
      // resolved when it isn't.
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <Shell>
      <View style={styles.content}>
        <BackRow onPress={() => navigation.goBack()} />
        <Text style={[styles.heading, { color: tokens.text }]}>Moderation</Text>

        {loading ? (
          <View style={styles.center}><Mascot size={32} /></View>
        ) : error ? (
          <View style={styles.center}><Text style={{ color: tokens['text-2'] }}>{error}</Text></View>
        ) : items.length === 0 ? (
          <View style={styles.center}><Text style={{ color: tokens['text-2'] }}>Nothing pending review</Text></View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={i => i.id}
            renderItem={({ item, index }) => {
              const badge = badgeFor(item);
              const resolving = resolvingId === item.id;
              return (
                <Pressable
                  onPress={() => { if (item.threadId) navigation.navigate('Thread', { threadId: item.threadId }); }}
                  style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: tokens.border }]}
                >
                  <View style={styles.rowTop}>
                    <View style={[styles.badge, { backgroundColor: `${badge.color}30` }]}>
                      <badge.Icon size={12} color={badge.color} />
                      <Text style={[styles.badgeLabel, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  </View>
                  <Text style={[styles.threadTitle, { color: tokens.text }]} numberOfLines={1}>
                    {item.threadTitle ?? 'Untitled thread'}
                  </Text>
                  <Text style={[styles.body, { color: tokens['text-2'] }]} numberOfLines={2}>
                    {item.commentBody ?? 'The thread itself was reported.'}
                  </Text>
                  {item.reason ? (
                    <Text style={[styles.reason, { color: tokens.muted }]} numberOfLines={1}>“{item.reason}”</Text>
                  ) : null}
                  <View style={styles.actions}>
                    <Pressable
                      disabled={resolving}
                      onPress={() => handleResolve(item, 'approved')}
                      style={[styles.actionBtn, { backgroundColor: 'rgba(46,193,106,0.18)' }, resolving && styles.actionDisabled]}
                    >
                      <CheckIcon size={16} color="#2ec16a" />
                    </Pressable>
                    <Pressable
                      disabled={resolving}
                      onPress={() => handleResolve(item, 'removed')}
                      style={[styles.actionBtn, { backgroundColor: 'rgba(239,68,68,0.18)' }, resolving && styles.actionDisabled]}
                    >
                      <CloseIcon size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        )}
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  heading: { fontSize: 17, fontWeight: '800', marginTop: 12, marginBottom: 8 },
  center: { alignItems: 'center', marginTop: 40 },
  row: { paddingVertical: 14, gap: 4 },
  rowTop: { flexDirection: 'row' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 20, alignSelf: 'flex-start' },
  badgeLabel: { fontSize: 11.5, fontWeight: '700' },
  threadTitle: { fontSize: 14.5, fontWeight: '700', marginTop: 4 },
  body: { fontSize: 13, lineHeight: 18 },
  reason: { fontSize: 12.5, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionDisabled: { opacity: 0.5 },
});
