import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { NOTIFICATION_PREF_ROWS, getMyProfile, updateNotificationPrefs } from '@forumkit/shared';
import type { NotificationPrefs } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import Toggle from '../components/Toggle';

// Notification settings (bottom sheet) — mirrors sdk-web's
// notification-settings-modal: the four preference toggles (mod-only rows hidden
// for members), each saved immediately via updateNotificationPrefs.
export default function NotificationSettingsSheet({ apiUrl, forumId, token, onClose }: {
  apiUrl: string;
  forumId: string;
  token: string | undefined;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [isMod, setIsMod] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getMyProfile(apiUrl, forumId, token)
      .then(p => { if (!cancelled && p) { setPrefs(p.notificationPrefs); setIsMod(p.role === 'moderator' || p.role === 'admin'); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, token]);

  function toggle(key: keyof NotificationPrefs) {
    if (!prefs || !token) return;
    const prev = prefs;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    void updateNotificationPrefs(apiUrl, forumId, next, token).catch(() => setPrefs(prev));
  }

  const rows = NOTIFICATION_PREF_ROWS.filter(r => !r.modOnly || isMod);

  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: tokens.elev, borderColor: tokens.border }]} onPress={() => {}}>
          <Text style={[styles.title, { color: tokens.text }]}>Notification settings</Text>
          {loading || !prefs ? (
            <ActivityIndicator color={tokens.accent} style={{ padding: 16 }} />
          ) : (
            rows.map((row, i) => (
              <View key={row.key} style={[styles.row, i < rows.length - 1 && { marginBottom: 22 }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.label, { color: tokens.text }]}>{row.label}</Text>
                  <Text style={[styles.sub, { color: tokens.muted }]}>{row.sub}</Text>
                </View>
                <Toggle value={prefs[row.key]} onValueChange={() => toggle(row.key)} />
              </View>
            ))
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 14.5, fontWeight: '600' },
  sub: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
});
