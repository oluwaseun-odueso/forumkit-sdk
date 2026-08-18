import { useEffect, useState } from 'react';
import { Platform, View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { listNotifications, markNotificationRead, describeNotification, fmtRelativeTime } from '@forumkit/shared';
import type { Notification } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { useSession } from '../session/SessionContext';
import { ChevronLeftIcon, MaterialBackIcon } from '../components/icons';
import Avatar from '../components/Avatar';
import type { RootStackParamList } from './RootNavigator';

// See navigation/Shell.tsx — Android's statusBarTranslucent inset still lands
// tighter than iOS, so nudge it down a bit further.
const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

// Notifications page per README §11 — a full-screen overlay. Mirrors sdk-web's
// Notifications.tsx: 34px gradient avatar + describeNotification text + relative
// time; border-top between rows, none on the first. Tap marks read + opens the
// thread.
export default function NotificationsOverlay({ onClose }: { onClose: () => void }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const BackIcon = Platform.OS === 'ios' ? ChevronLeftIcon : MaterialBackIcon;

  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listNotifications(apiUrl, forumId, { limit: 30 }, token)
      .then(res => { if (!cancelled) setItems(res.results); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load notifications'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, token]);

  function handleOpen(n: Notification) {
    if (token && !n.readAt) {
      void markNotificationRead(apiUrl, forumId, n.id, token).catch(() => { /* best effort */ });
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, readAt: new Date() } : x)));
    }
    if (n.threadId) {
      onClose();
      navigation.navigate('Thread', { threadId: n.threadId });
    }
  }

  return (
    <View style={[styles.overlay, { backgroundColor: tokens.bg }]}>
      <View style={{ paddingTop: insets.top + ANDROID_TOP_EXTRA, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <BackIcon size={20} color={tokens.text} />
          </Pressable>
          <Text style={[styles.title, { color: tokens.text }]}>Notifications</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={tokens.accent} /></View>
      ) : error ? (
        <View style={styles.center}><Text style={{ color: tokens['text-2'] }}>{error}</Text></View>
      ) : items.length === 0 ? (
        <View style={styles.center}><Text style={{ color: tokens['text-2'] }}>No notifications yet</Text></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={n => n.id}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => handleOpen(item)}
              style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: tokens.border }]}
            >
              <Avatar authorId={item.actorId ?? undefined} author={item.actorDisplayName ?? 'Someone'} avatarUrl={item.actorAvatarUrl} size={34} />
              <Text style={[styles.text, { color: tokens['text-2'] }]}>{describeNotification(item)}</Text>
              <Text style={[styles.time, { color: tokens.muted }]}>{fmtRelativeTime(item.createdAt)}</Text>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 65 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16 },
  title: { fontSize: 16, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  text: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  time: { fontSize: 12 },
});
