import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { getMyProfile, profileEmptyCopy, PROFILE_TABS, type MyProfile } from '@forumkit/shared';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Shell, { useShell } from '../navigation/Shell';
import BackRow from '../components/BackRow';
import Avatar from '../components/Avatar';
import TabPills from '../components/TabPills';
import Mascot from '../components/Mascot';
import { EyeIcon } from '../components/icons';
import type { RootStackParamList } from '../navigation/RootNavigator';

function ProfileBody() {
  const { tokens } = useTheme();
  const session = useSession();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { openComposer } = useShell();
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('Overview');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    getMyProfile(apiUrl, forumId, token)
      .then(p => { if (!cancelled) setProfile(p); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, token]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={tokens.accent} /></View>;
  }

  const name = profile?.displayName ?? 'You';
  const copy = profileEmptyCopy(activeTab);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <BackRow onPress={() => navigation.goBack()} />

      <View style={styles.header}>
        <Avatar authorId={profile?.id} author={name} avatarUrl={profile?.avatarUrl} size={64} />
        <View style={{ marginLeft: 14 }}>
          <Text style={[styles.name, { color: tokens.text }]}>{name}</Text>
          <Text style={[styles.handle, { color: tokens.muted }]}>/{name}</Text>
        </View>
      </View>

      <View style={{ marginHorizontal: -16 }}>
        <TabPills tabs={PROFILE_TABS} active={activeTab} onSelect={setActiveTab} />
      </View>

      <View style={styles.showingRow}>
        <EyeIcon size={15} color={tokens.muted} />
        <Text style={{ color: tokens.muted, fontSize: 13 }}>Showing all content</Text>
      </View>

      <Pressable onPress={openComposer} style={[styles.createBtn, { borderColor: tokens['border-strong'] }]}>
        <Text style={{ color: tokens.text, fontSize: 13.5, fontWeight: '600' }}>Create Post</Text>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: tokens.border }]} />

      <View style={styles.empty}>
        <Mascot size={88} animated={false} badge={false} />
        <Text style={[styles.emptyTitle, { color: tokens.text }]}>{copy.title}</Text>
        <Text style={[styles.emptyDesc, { color: tokens.muted }]}>{copy.description}</Text>
        <Pressable style={[styles.settingsBtn, { backgroundColor: tokens.text }]}>
          <Text style={{ color: tokens.bg, fontSize: 13.5, fontWeight: '700' }}>Update Settings</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// Profile — mirrors sdk-web profile-header/tabs/empty-state (README §9). Header
// from getMyProfile; the empty state is the design's focus. Per-tab activity
// lists are deferred.
export default function ProfileScreen() {
  return (
    <Shell>
      <ProfileBody />
    </Shell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 16 },
  name: { fontSize: 20, fontWeight: '800' },
  handle: { fontSize: 13, marginTop: 2 },
  showingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  createBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  divider: { height: 1, marginTop: 16 },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  emptyDesc: { fontSize: 13.5, textAlign: 'center', marginTop: 8, maxWidth: 280, lineHeight: 20 },
  settingsBtn: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, marginTop: 18 },
});
