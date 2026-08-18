import { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  getMyProfile, getProfileActivity, updateMyProfile, profileEmptyCopy, PROFILE_TABS,
  threadToFeedRow, saveThread, unsaveThread, voteOnThread, removeVoteFromThread,
  reportThread, shareThreadWithUsers,
  type MyProfile, type FeedRow,
} from '@forumkit/shared';
import type { UserProfile, ProfileActivityScope, VoteDirection, Comment } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import { applyVote, nextVoteDir } from '../lib/vote';
import { pickAndUploadImage } from '../lib/upload';
import Shell, { useShell } from '../navigation/Shell';
import BackRow from '../components/BackRow';
import Avatar from '../components/Avatar';
import TabPills from '../components/TabPills';
import Mascot from '../components/Mascot';
import PostRow from '../feed/PostRow';
import ReportSheet from '../components/ReportSheet';
import ShareSheet from '../components/ShareSheet';
import { EyeIcon, CameraIcon } from '../components/icons';
import SocialLinks from '../profile/SocialLinks';
import ProfileCommentCard from '../profile/ProfileCommentCard';
import EditProfileSheet from '../profile/EditProfileSheet';
import type { RootStackParamList } from '../navigation/RootNavigator';

type ActivityRow =
  | { kind: 'thread'; row: FeedRow }
  | { kind: 'comment'; comment: Comment; threadId: string; threadTitle: string; replyingTo?: { author: string; snippet: string } | undefined };

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
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    getMyProfile(apiUrl, forumId, token)
      .then(p => { if (!cancelled) setProfile(p); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setActivityLoading(true);
    getProfileActivity(apiUrl, forumId, activeTab.toLowerCase() as ProfileActivityScope, 1, 20, 'new', 'all', token)
      .then(res => {
        if (cancelled) return;
        setActivity(res.items.map((it): ActivityRow => it.kind === 'thread'
          ? { kind: 'thread', row: threadToFeedRow(it.thread) }
          : { kind: 'comment', comment: it.comment, threadId: it.threadId, threadTitle: it.threadTitle, replyingTo: it.replyingTo }));
      })
      .catch(() => { if (!cancelled) setActivity([]); })
      .finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, activeTab, token]);

  const updateThreadRow = useCallback((id: string, fn: (r: FeedRow) => FeedRow) => {
    setActivity(prev => prev.map(a => (a.kind === 'thread' && a.row.id === id ? { kind: 'thread', row: fn(a.row) } : a)));
  }, []);

  function onVote(row: FeedRow, dir: VoteDirection) {
    if (!token) return;
    const oldDir = row.myVote;
    const newDir = nextVoteDir(oldDir, dir);
    const prev = row.voteCounts;
    updateThreadRow(row.id, r => ({ ...r, myVote: newDir, voteCounts: applyVote(r.voteCounts, oldDir, newDir) }));
    const req = newDir === null ? removeVoteFromThread(apiUrl, forumId, row.id, token) : voteOnThread(apiUrl, forumId, row.id, newDir, token);
    req.then(res => updateThreadRow(row.id, r => ({ ...r, myVote: res.myVote, voteCounts: res.voteCounts })))
      .catch(() => updateThreadRow(row.id, r => ({ ...r, myVote: oldDir, voteCounts: prev })));
  }

  function onSave(row: FeedRow) {
    if (!token) return;
    const next = !row.saved;
    updateThreadRow(row.id, r => ({ ...r, saved: next }));
    const req = next ? saveThread(apiUrl, forumId, row.id, token) : unsaveThread(apiUrl, forumId, row.id, token);
    req.catch(() => updateThreadRow(row.id, r => ({ ...r, saved: !next })));
  }

  async function editImage(kind: 'avatar' | 'banner') {
    if (!token || !profile) return;
    const uploaded = await pickAndUploadImage(apiUrl, forumId, kind, token, kind === 'avatar' ? [1, 1] : [3, 1]);
    if (!uploaded) return;
    const field = kind === 'avatar' ? { avatarUrl: uploaded.downloadUrl } : { bannerUrl: uploaded.downloadUrl };
    const updated = await updateMyProfile(apiUrl, forumId, {
      displayName: profile.displayName, bio: profile.bio, socialLinks: profile.socialLinks, ...field,
    }, token);
    setProfile(p => (p ? { ...p, ...updated } : p));
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={tokens.accent} /></View>;

  const name = profile?.displayName ?? 'You';
  const copy = profileEmptyCopy(activeTab);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={{ paddingHorizontal: 16 }}><BackRow onPress={() => navigation.goBack()} /></View>

      {/* Banner + avatar */}
      <View style={[styles.banner, { backgroundColor: tokens['surface-2'] }]}>
        {profile?.bannerUrl != null && <Image source={{ uri: profile.bannerUrl }} style={StyleSheet.absoluteFill} />}
        <Pressable onPress={() => void editImage('banner')} style={[styles.bannerCam, { backgroundColor: tokens.elev }]}>
          <CameraIcon size={14} color={tokens['text-2']} />
        </Pressable>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarRing, { borderColor: tokens.bg }]}>
            <Avatar authorId={profile?.id} author={name} avatarUrl={profile?.avatarUrl} size={72} />
          </View>
          <Pressable onPress={() => void editImage('avatar')} style={[styles.avatarCam, { backgroundColor: tokens.accent }]}>
            <CameraIcon size={12} color={tokens['accent-fg']} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        <Text style={[styles.name, { color: tokens.text }]}>{name}</Text>
        <Text style={[styles.handle, { color: tokens.muted }]}>/{name}</Text>
        {profile?.bio != null && profile.bio.trim().length > 0 && (
          <Text style={[styles.bio, { color: tokens['text-2'] }]}>{profile.bio}</Text>
        )}
        {profile && <SocialLinks links={profile.socialLinks} />}

        <View style={styles.headerBtns}>
          <Pressable onPress={() => setEditOpen(true)} style={[styles.outlineBtn, { borderColor: tokens['border-strong'] }]}>
            <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }}>Edit Profile</Text>
          </Pressable>
          <Pressable onPress={openComposer} style={[styles.outlineBtn, { borderColor: tokens['border-strong'] }]}>
            <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '600' }}>Create Post</Text>
          </Pressable>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <TabPills tabs={PROFILE_TABS} active={activeTab} onSelect={setActiveTab} />
      </View>

      <View style={styles.showingRow}>
        <EyeIcon size={15} color={tokens.muted} />
        <Text style={{ color: tokens.muted, fontSize: 13 }}>Showing all content</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: tokens.border }]} />

      {activityLoading ? (
        <ActivityIndicator color={tokens.accent} style={{ marginTop: 30 }} />
      ) : activity.length === 0 ? (
        <View style={styles.empty}>
          <Mascot size={88} animated={false} badge={false} />
          <Text style={[styles.emptyTitle, { color: tokens.text }]}>{copy.title}</Text>
          <Text style={[styles.emptyDesc, { color: tokens.muted }]}>{copy.description}</Text>
          <Pressable onPress={() => setEditOpen(true)} style={[styles.settingsBtn, { backgroundColor: tokens.text }]}>
            <Text style={{ color: tokens.bg, fontSize: 13.5, fontWeight: '700' }}>Update Settings</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16 }}>
          {activity.map((a, i) => a.kind === 'thread' ? (
            <PostRow
              key={`t-${a.row.id}-${i}`}
              row={a.row}
              view="card"
              onOpen={() => navigation.navigate('Thread', { threadId: a.row.id })}
              onVote={dir => onVote(a.row, dir)}
              onSave={() => onSave(a.row)}
              onReport={() => setReportId(a.row.id)}
              onShare={() => setShareId(a.row.id)}
            />
          ) : (
            <ProfileCommentCard
              key={`c-${a.comment.id}-${i}`}
              comment={a.comment}
              threadTitle={a.threadTitle}
              replyingTo={a.replyingTo}
              onOpen={() => navigation.navigate('Thread', { threadId: a.threadId })}
            />
          ))}
        </View>
      )}

      {editOpen && profile && (
        <EditProfileSheet
          apiUrl={apiUrl}
          forumId={forumId}
          token={token}
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={(updated: UserProfile) => setProfile(p => (p ? { ...p, ...updated } : p))}
        />
      )}
      {reportId && <ReportSheet target="post" onClose={() => setReportId(null)} onSubmit={reason => { if (token) void reportThread(apiUrl, forumId, reportId, reason, token).catch(() => {}); }} />}
      {shareId && <ShareSheet apiUrl={apiUrl} forumId={forumId} token={token} onClose={() => setShareId(null)} onShare={ids => { if (token && ids.length) void shareThreadWithUsers(apiUrl, forumId, shareId, ids, undefined, token).catch(() => {}); }} />}
    </ScrollView>
  );
}

// Profile — mirrors sdk-web profile-header/tabs/empty-state + banner/avatar +
// edit + activity (README §9 plus web-only features). Always the /me profile.
export default function ProfileScreen() {
  return <Shell><ProfileBody /></Shell>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 12, paddingBottom: 110 },
  banner: { height: 120, marginTop: 12, marginBottom: 44, position: 'relative' },
  bannerCam: { position: 'absolute', top: 10, right: 12, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { position: 'absolute', left: 16, bottom: -36 },
  avatarRing: { borderRadius: 40, borderWidth: 3 },
  avatarCam: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '800' },
  handle: { fontSize: 13, marginTop: 2 },
  bio: { fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  headerBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  outlineBtn: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  showingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 16 },
  divider: { height: 1, marginTop: 14 },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  emptyDesc: { fontSize: 13.5, textAlign: 'center', marginTop: 8, maxWidth: 280, lineHeight: 20 },
  settingsBtn: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, marginTop: 18 },
});
