import { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator, Alert, StyleSheet } from 'react-native';
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
import Avatar from '../components/Avatar';
import ImageLightbox from '../components/ImageLightbox';
import TabPills from '../components/TabPills';
import Mascot from '../components/Mascot';
import PostRow from '../feed/PostRow';
import ReportSheet from '../components/ReportSheet';
import ShareSheet from '../components/ShareSheet';
import { CameraIcon, PencilIcon, PlusIcon } from '../components/icons';
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
  const [imageUploading, setImageUploading] = useState<'avatar' | 'banner' | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

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
    if (!token || !profile || imageUploading) return;
    setImageUploading(kind);
    try {
      const uploaded = await pickAndUploadImage(apiUrl, forumId, kind, token, kind === 'avatar' ? [1, 1] : [3, 1]);
      if (!uploaded) return;
      const field = kind === 'avatar' ? { avatarUrl: uploaded.downloadUrl } : { bannerUrl: uploaded.downloadUrl };
      // Reflect immediately with the URL we already know is valid (the
      // upload's own confirm step already succeeded) — don't wait on the
      // PATCH round-trip just to show the image the user just picked.
      setProfile(p => (p ? { ...p, ...field } : p));
      const updated = await updateMyProfile(apiUrl, forumId, {
        displayName: profile.displayName, bio: profile.bio, socialLinks: profile.socialLinks, ...field,
      }, token);
      setProfile(p => (p ? { ...p, ...updated } : p));
    } catch (e) {
      // Previously had no error handling at all — any failure (upload,
      // network, validation) just silently did nothing, indistinguishable
      // from "avatar/banner update doesn't work".
      Alert.alert('Update failed', e instanceof Error ? e.message : `Couldn't update your ${kind}. Please try again.`);
    } finally {
      setImageUploading(null);
    }
  }

  if (loading) return <View style={styles.center}><Mascot size={36} /></View>;

  const name = profile?.displayName ?? 'You';
  const copy = profileEmptyCopy(activeTab);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Banner + avatar — each wrapped in its own Pressable that opens a
          full-screen preview on tap; the camera-badge Pressables nest inside
          unchanged, RN resolves a tap to whichever Pressable's own bounds it
          landed in. */}
      <Pressable
        onPress={() => profile?.bannerUrl && setPreviewUri(profile.bannerUrl)}
        disabled={!profile?.bannerUrl}
        style={[styles.banner, { backgroundColor: tokens['surface-2'] }]}
      >
        {profile?.bannerUrl != null && <Image source={{ uri: profile.bannerUrl }} style={StyleSheet.absoluteFill} />}
        <Pressable onPress={() => void editImage('banner')} disabled={imageUploading != null} style={[styles.bannerCam, { backgroundColor: tokens.elev }]}>
          {imageUploading === 'banner'
            ? <ActivityIndicator size="small" color={tokens['text-2']} />
            : <CameraIcon size={14} color={tokens['text-2']} />}
        </Pressable>
        <View style={styles.avatarWrap}>
          <Pressable
            onPress={() => profile?.avatarUrl && setPreviewUri(profile.avatarUrl)}
            disabled={!profile?.avatarUrl}
            style={[styles.avatarRing, { borderColor: tokens.bg }]}
          >
            <Avatar authorId={profile?.id} author={name} avatarUrl={profile?.avatarUrl} size={72} />
          </Pressable>
          <Pressable onPress={() => void editImage('avatar')} disabled={imageUploading != null} style={[styles.avatarCam, { backgroundColor: tokens.accent }]}>
            {imageUploading === 'avatar'
              ? <ActivityIndicator size="small" color={tokens['accent-fg']} />
              : <CameraIcon size={12} color={tokens['accent-fg']} />}
          </Pressable>
        </View>
      </Pressable>

      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.nameRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: tokens.text }]}>{name}</Text>
            <Text style={[styles.handle, { color: tokens.muted }]}>/{name}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={openComposer} hitSlop={8} style={styles.editIconBtn}>
              <PlusIcon size={16} color={tokens.text} />
            </Pressable>
            <Pressable onPress={() => setEditOpen(true)} hitSlop={8} style={styles.editIconBtn}>
              <PencilIcon size={15} color={tokens.text} />
            </Pressable>
          </View>
        </View>

        {profile?.bio != null && profile.bio.trim().length > 0 && (
          <Text style={[styles.bio, { color: tokens['text-2'] }]}>{profile.bio}</Text>
        )}
        {profile && <SocialLinks links={profile.socialLinks} onEditProfile={() => setEditOpen(true)} />}
      </View>

      <View style={[styles.karmaRow, { borderTopColor: tokens.border }]}>
        <View style={styles.karmaBlock}>
          <Text style={[styles.karmaValue, { color: tokens.text }]}>{(profile?.postKarma ?? 0).toLocaleString()}</Text>
          <Text style={[styles.karmaLabel, { color: tokens.muted }]}>Post Karma</Text>
        </View>
        <View style={[styles.karmaDivider, { backgroundColor: tokens.border }]} />
        <View style={styles.karmaBlock}>
          <Text style={[styles.karmaValue, { color: tokens.text }]}>{(profile?.commentKarma ?? 0).toLocaleString()}</Text>
          <Text style={[styles.karmaLabel, { color: tokens.muted }]}>Comment Karma</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: tokens.border }]} />

      <View style={{ marginTop: 6, marginBottom: 14 }}>
        <TabPills tabs={PROFILE_TABS} active={activeTab} onSelect={setActiveTab} />
      </View>

      {activityLoading ? (
        <View style={{ alignItems: 'center', paddingVertical: 30 }}><Mascot size={36} /></View>
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
              view="compact"
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
      {previewUri && <ImageLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />}
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
  content: { paddingBottom: 110 },
  banner: { height: 120, marginBottom: 44, position: 'relative' },
  bannerCam: { position: 'absolute', top: 10, right: 12, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { position: 'absolute', left: 16, bottom: -36 },
  avatarRing: { borderRadius: 40, borderWidth: 3 },
  avatarCam: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { fontSize: 20, fontWeight: '800' },
  handle: { fontSize: 13, marginTop: 2 },
  // No visible circle — just a same-sized invisible tap target around the icon.
  editIconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  bio: { fontSize: 13.5, lineHeight: 20, marginTop: 12 },
  // Full-width stat row (below social links, above the tab pills) — a thin
  // top border separates it from the content above, and a single vertical
  // divider separates the two figures; no card/border/background/rounded
  // corners around the row itself, matching the reference design exactly
  // (a prior bordered-card treatment here was rejected as unsuitable).
  karmaRow: { flexDirection: 'row', borderTopWidth: 1, marginTop: 16, paddingVertical: 12, paddingHorizontal: 16 },
  karmaBlock: { flex: 1, alignItems: 'center' },
  karmaDivider: { width: 1, alignSelf: 'stretch' },
  karmaValue: { fontSize: 15, fontWeight: '800' },
  karmaLabel: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginTop: 10 },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  emptyDesc: { fontSize: 13.5, textAlign: 'center', marginTop: 8, maxWidth: 280, lineHeight: 20 },
  settingsBtn: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, marginTop: 18 },
});
