import { useEffect, useState, type ComponentType } from 'react';
import { Platform, View, Text, Image, Pressable, FlatList, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  listNotifications, markNotificationRead, deleteNotification, describeNotification, fmtRelativeTime,
} from '@forumkit/shared';
import type { Notification } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { useSession } from '../session/SessionContext';
import {
  ChevronLeftIcon, MaterialBackIcon, GearIcon, CommentIcon, ShareIcon, ReportIcon, UpvoteIcon, DownvoteIcon, type IconProps,
} from '../components/icons';
import Avatar from '../components/Avatar';
import NotificationSettingsSheet from '../notifications/NotificationSettingsSheet';
import type { RootStackParamList } from './RootNavigator';

const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

// Type badge (icon + dimmed color) for the avatar corner — mirrors sdk-web's
// getBadge. Colors are pre-dimmed hex (RN has no CSS color-mix).
function badgeFor(n: Notification): { Icon: ComponentType<IconProps>; color: string } {
  if (n.type === 'vote') {
    return n.message === 'down'
      ? { Icon: DownvoteIcon, color: '#7d3fbd' }
      : { Icon: UpvoteIcon, color: '#c0431a' };
  }
  switch (n.type) {
    case 'comment_reply': return { Icon: CommentIcon, color: '#2d5aa0' };
    case 'share': return { Icon: ShareIcon, color: '#219552' };
    case 'report': return { Icon: ReportIcon, color: '#b03636' };
    default: return { Icon: CommentIcon, color: '#2d5aa0' };
  }
}

// Notifications page per README §11 — full-screen overlay, mirroring sdk-web's
// Notifications.tsx: type badge, thread thumbnail, relative time; long-press to
// delete; a settings button for notification preferences.
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
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  function handleDelete(n: Notification) {
    Alert.alert('Delete notification?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          setItems(prev => prev.filter(x => x.id !== n.id));
          if (token) void deleteNotification(apiUrl, forumId, n.id, token).catch(() => { /* best effort */ });
        },
      },
    ]);
  }

  return (
    <View style={[styles.overlay, { backgroundColor: tokens.bg }]}>
      <View style={{ paddingTop: insets.top + ANDROID_TOP_EXTRA, borderBottomWidth: 1, borderBottomColor: tokens.border }}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <BackIcon size={20} color={tokens.text} />
          </Pressable>
          <Text style={[styles.title, { color: tokens.text }]}>Notifications</Text>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={8}>
            <GearIcon size={20} color={tokens['text-2']} />
          </Pressable>
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
          renderItem={({ item, index }) => {
            const badge = badgeFor(item);
            const unread = !item.readAt;
            return (
              <Pressable
                onPress={() => handleOpen(item)}
                onLongPress={() => handleDelete(item)}
                style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: tokens.border }, unread && { backgroundColor: tokens.hover }]}
              >
                <View style={styles.avatarWrap}>
                  <Avatar authorId={item.actorId ?? undefined} author={item.actorDisplayName ?? 'Someone'} avatarUrl={item.actorAvatarUrl} size={34} />
                  <View style={[styles.badge, { backgroundColor: badge.color, borderColor: tokens.bg }]}>
                    <badge.Icon size={9} color="#ffffff" />
                  </View>
                </View>
                <Text style={[styles.text, { color: tokens['text-2'] }]}>{describeNotification(item)}</Text>
                {item.threadImageUrl != null && (
                  <Image source={{ uri: item.threadImageUrl }} style={[styles.thumb, { backgroundColor: tokens['surface-2'] }]} />
                )}
                <Text style={[styles.time, { color: tokens.muted }]}>{fmtRelativeTime(item.createdAt)}</Text>
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}

      {settingsOpen && (
        <NotificationSettingsSheet apiUrl={apiUrl} forumId={forumId} token={token} onClose={() => setSettingsOpen(false)} />
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
  avatarWrap: { width: 34, height: 34 },
  badge: { position: 'absolute', right: -3, bottom: -3, width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  thumb: { width: 40, height: 40, borderRadius: 8 },
  time: { fontSize: 12 },
});
