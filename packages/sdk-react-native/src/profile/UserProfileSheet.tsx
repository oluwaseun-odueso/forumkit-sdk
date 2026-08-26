import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, Modal, Pressable, ScrollView, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import {
  getUserProfile, getProfileActivityForUser, profileEmptyCopy, threadToFeedRow,
  type FeedRow,
} from '@forumkit/shared';
import type { UserProfile, Comment } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import ImageLightbox from '../components/ImageLightbox';
import TabPills from '../components/TabPills';
import Mascot from '../components/Mascot';
import PostRow from '../feed/PostRow';
import SocialLinks from './SocialLinks';
import ProfileCommentCard from './ProfileCommentCard';

const PUBLIC_TABS = ['Overview', 'Posts', 'Comments', 'Upvoted', 'Downvoted'] as const;

type ActivityRow =
  | { kind: 'thread'; row: FeedRow }
  | { kind: 'comment'; comment: Comment; threadId: string; threadTitle: string; replyingTo?: { author: string; snippet: string } | undefined };

export default function UserProfileSheet({ userId, onClose }: {
  userId: string;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const session = useSession();
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const windowHeight = Dimensions.get('window').height;
  const HALF = windowHeight * 0.52;
  const FULL = 0;
  const CLOSED = windowHeight;

  const translateY = useRef(new Animated.Value(CLOSED)).current;

  useEffect(() => {
    Animated.spring(translateY, { toValue: HALF, useNativeDriver: false, bounciness: 4 }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.5,
      onPanResponderMove: (_evt, gesture) => {
        const current = (translateY as unknown as { _value: number })._value;
        const next = Math.max(FULL, current + gesture.dy);
        translateY.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const current = (translateY as unknown as { _value: number })._value;
        if (gesture.vy > 1.2 || current > windowHeight * 0.65) {
          Animated.timing(translateY, { toValue: CLOSED, duration: 220, useNativeDriver: false }).start(onClose);
        } else if (current < windowHeight * 0.25 || gesture.vy < -0.8) {
          Animated.spring(translateY, { toValue: FULL, useNativeDriver: false, bounciness: 4 }).start();
        } else {
          Animated.spring(translateY, { toValue: HALF, useNativeDriver: false, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: HALF, useNativeDriver: false, bounciness: 4 }).start();
      },
    })
  ).current;

  const scrimOpacity = translateY.interpolate({
    inputRange: [FULL, HALF, CLOSED],
    outputRange: [0.5, 0.4, 0],
    extrapolate: 'clamp',
  });

  function handleClose() {
    Animated.timing(translateY, { toValue: CLOSED, duration: 220, useNativeDriver: false }).start(onClose);
  }

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getUserProfile(apiUrl, forumId, userId, token)
      .then(p => { if (!cancelled) setProfile(p); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, userId, token]);

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    const scope = activeTab.toLowerCase() as Exclude<typeof PUBLIC_TABS[number], never>;
    getProfileActivityForUser(apiUrl, forumId, userId, scope as 'overview' | 'posts' | 'comments' | 'upvoted' | 'downvoted', 1, 20, 'new', 'all', token)
      .then(res => {
        if (cancelled) return;
        setActivity(res.items.map((it): ActivityRow => it.kind === 'thread'
          ? { kind: 'thread', row: threadToFeedRow(it.thread) }
          : { kind: 'comment', comment: it.comment, threadId: it.threadId, threadTitle: it.threadTitle, replyingTo: it.replyingTo }));
      })
      .catch(() => { if (!cancelled) setActivity([]); })
      .finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, userId, token, activeTab]);

  const name = profile?.displayName ?? '…';
  const copy = profileEmptyCopy(activeTab);

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} pointerEvents="none" />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      <Animated.View
        style={[styles.sheet, { backgroundColor: tokens.bg, transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.dragHandle, { backgroundColor: tokens['surface-2'] }]} />
        </View>

        {loading ? (
          <View style={styles.center}><Mascot size={36} /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} nestedScrollEnabled>
            {/* Banner — tappable for full-screen preview, no camera badge */}
            <Pressable
              onPress={() => profile?.bannerUrl && setPreviewUri(profile.bannerUrl)}
              disabled={!profile?.bannerUrl}
              style={[styles.banner, { backgroundColor: tokens['surface-2'] }]}
            >
              {profile?.bannerUrl != null && (
                <Image source={{ uri: profile.bannerUrl }} style={StyleSheet.absoluteFill} />
              )}
              {/* Avatar — overlapping the banner bottom, tappable for preview */}
              <View style={styles.avatarWrap}>
                <Pressable
                  onPress={() => profile?.avatarUrl && setPreviewUri(profile.avatarUrl)}
                  disabled={!profile?.avatarUrl}
                  style={[styles.avatarRing, { borderColor: tokens.bg }]}
                >
                  <Avatar authorId={profile?.id} author={name} avatarUrl={profile?.avatarUrl} size={72} />
                </Pressable>
              </View>
            </Pressable>

            <View style={{ paddingHorizontal: 16 }}>
              {/* nameRow — no edit/compose buttons on the right */}
              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: tokens.text }]}>{name}</Text>
                  <Text style={[styles.handle, { color: tokens.muted }]}>/{name}</Text>
                </View>
              </View>

              {profile?.bio != null && profile.bio.trim().length > 0 && (
                <Text style={[styles.bio, { color: tokens['text-2'] }]}>{profile.bio}</Text>
              )}
              {profile && <SocialLinks links={profile.socialLinks} />}
            </View>

            <View style={[styles.karmaRow, { borderTopColor: tokens.border }]}>
              <View style={styles.karmaBlock}>
                <Text style={[styles.karmaValue, { color: tokens.text }]}>
                  {(profile?.postKarma ?? 0).toLocaleString()}
                </Text>
                <Text style={[styles.karmaLabel, { color: tokens.muted }]}>Post Karma</Text>
              </View>
              <View style={[styles.karmaDivider, { backgroundColor: tokens.border }]} />
              <View style={styles.karmaBlock}>
                <Text style={[styles.karmaValue, { color: tokens.text }]}>
                  {(profile?.commentKarma ?? 0).toLocaleString()}
                </Text>
                <Text style={[styles.karmaLabel, { color: tokens.muted }]}>Comment Karma</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.border }]} />

            <View style={{ marginTop: 6, marginBottom: 14 }}>
              <TabPills tabs={PUBLIC_TABS} active={activeTab} onSelect={setActiveTab} />
            </View>

            {activityLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}><Mascot size={36} /></View>
            ) : activity.length === 0 ? (
              <View style={styles.empty}>
                <Mascot size={88} animated={false} badge={false} />
                <Text style={[styles.emptyTitle, { color: tokens.text }]}>{copy.title}</Text>
                <Text style={[styles.emptyDesc, { color: tokens.muted }]}>{copy.description}</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {activity.map((a, i) => a.kind === 'thread' ? (
                  <PostRow
                    key={`t-${a.row.id}-${i}`}
                    row={a.row}
                    view="card"
                    onOpen={() => {}}
                    onVote={() => {}}
                    onSave={() => {}}
                    onReport={() => {}}
                    onShare={() => {}}
                  />
                ) : (
                  <ProfileCommentCard
                    key={`c-${a.comment.id}-${i}`}
                    comment={a.comment}
                    threadTitle={a.threadTitle}
                    replyingTo={a.replyingTo}
                    onOpen={() => {}}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </Animated.View>

      {previewUri && <ImageLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />}
    </Modal>
  );
}

// Styles mirror ProfileScreen exactly — same values, same names.
// Only additions are the sheet-specific ones (scrim, sheet, handleWrap, handle).
const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,1)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  dragHandle: { width: 36, height: 4, borderRadius: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 110 },
  banner: { height: 120, marginBottom: 44, position: 'relative' },
  avatarWrap: { position: 'absolute', left: 16, bottom: -36 },
  avatarRing: { borderRadius: 40, borderWidth: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { fontSize: 20, fontWeight: '800' },
  handle: { fontSize: 13, marginTop: 2 },
  bio: { fontSize: 13.5, lineHeight: 20, marginTop: 12 },
  karmaRow: { flexDirection: 'row', borderTopWidth: 1, marginTop: 16, paddingVertical: 12, paddingHorizontal: 16 },
  karmaBlock: { flex: 1, alignItems: 'center' },
  karmaDivider: { width: 1, alignSelf: 'stretch' },
  karmaValue: { fontSize: 15, fontWeight: '800' },
  karmaLabel: { fontSize: 12, marginTop: 2 },
  divider: { height: 1, marginTop: 10 },
  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  emptyDesc: { fontSize: 13.5, textAlign: 'center', marginTop: 8, maxWidth: 280, lineHeight: 20 },
});
