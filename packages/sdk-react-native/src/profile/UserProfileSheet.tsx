import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Image, Modal, Pressable, ScrollView, FlatList, ActivityIndicator, Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import {
  getUserProfile, getProfileActivityForUser, threadToFeedRow,
  type ProfileActivityResult,
} from '@forumkit/shared';
import type { UserProfile, ProfileActivityScope, Comment } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import TabPills from '../components/TabPills';
import Mascot from '../components/Mascot';
import SocialLinks from './SocialLinks';
import ProfileCommentCard from './ProfileCommentCard';
import PostRow from '../feed/PostRow';
import type { FeedRow } from '@forumkit/shared';

const PUBLIC_TABS = ['Overview', 'Posts', 'Comments', 'Upvoted', 'Downvoted'] as const;
type PublicTab = typeof PUBLIC_TABS[number];

const TAB_TO_SCOPE: Record<PublicTab, Exclude<ProfileActivityScope, 'saved'>> = {
  Overview: 'overview',
  Posts: 'posts',
  Comments: 'comments',
  Upvoted: 'upvoted',
  Downvoted: 'downvoted',
};

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
  // Snap points: half (52% down from top), full (0 = fills screen), closed
  const HALF = windowHeight * 0.52;
  const FULL = 0;
  const CLOSED = windowHeight;

  const translateY = useRef(new Animated.Value(CLOSED)).current;

  // Open to half on mount
  useEffect(() => {
    Animated.spring(translateY, { toValue: HALF, useNativeDriver: false, bounciness: 4 }).start();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2,
      onPanResponderMove: (_evt, gesture) => {
        const raw = (translateY as unknown as { _value: number })._value;
        const next = Math.max(FULL, raw + gesture.dy);
        translateY.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const raw = (translateY as unknown as { _value: number })._value;
        const velocity = gesture.vy;
        // Snap logic: fast flick down → close; above 25% from top → full;
        // between 25% and 65% → half; below 65% → close.
        if (velocity > 1.2 || raw > windowHeight * 0.65) {
          Animated.timing(translateY, { toValue: CLOSED, duration: 220, useNativeDriver: false }).start(onClose);
        } else if (raw < windowHeight * 0.25 || velocity < -0.8) {
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

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    getUserProfile(apiUrl, forumId, userId, token)
      .then(p => { if (!cancelled) setProfile(p); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, userId, token]);

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    const scope = TAB_TO_SCOPE[activeTab as PublicTab] ?? 'overview';
    getProfileActivityForUser(apiUrl, forumId, userId, scope, 1, 20, 'new', 'all', token)
      .then((res: ProfileActivityResult) => {
        if (cancelled) return;
        setActivity(res.items.map((it): ActivityRow => it.kind === 'thread'
          ? { kind: 'thread', row: threadToFeedRow(it.thread) }
          : { kind: 'comment', comment: it.comment, threadId: it.threadId, threadTitle: it.threadTitle, replyingTo: it.replyingTo }));
      })
      .catch(() => { if (!cancelled) setActivity([]); })
      .finally(() => { if (!cancelled) setActivityLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, userId, token, activeTab]);

  const displayName = profile?.displayName ?? '...';

  function handleClose() {
    Animated.timing(translateY, { toValue: CLOSED, duration: 220, useNativeDriver: false }).start(onClose);
  }

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleClose}>
      {/* Animated scrim behind the sheet — opacity tied to translateY */}
      <Animated.View
        style={[styles.scrim, { opacity: scrimOpacity }]}
        pointerEvents="box-only"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      <Animated.View
        style={[styles.sheet, { backgroundColor: tokens.elev, transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={styles.handleWrap} pointerEvents="none">
          <View style={[styles.handle, { backgroundColor: tokens['surface-2'] }]} />
        </View>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: tokens['surface-2'] }]}>
          {profile?.bannerUrl != null && (
            <Image source={{ uri: profile.bannerUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
        </View>

        {/* Avatar overlapping banner */}
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarRing, { borderColor: tokens.elev }]}>
            <Avatar authorId={userId} author={displayName} avatarUrl={profile?.avatarUrl} size={56} />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          onStartShouldSetResponder={() => false}
        >
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Text style={[styles.name, { color: tokens.text }]}>{displayName}</Text>
            <Text style={[styles.username, { color: tokens.muted }]}>/{displayName}</Text>

            {profile?.bio != null && profile.bio.trim().length > 0 && (
              <Text style={[styles.bio, { color: tokens['text-2'] }]}>{profile.bio}</Text>
            )}
            {profile && profile.socialLinks.length > 0 && (
              <SocialLinks links={profile.socialLinks} />
            )}
          </View>

          {profileLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator color={tokens.accent} />
            </View>
          ) : (
            <>
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

              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <TabPills tabs={PUBLIC_TABS} active={activeTab} onSelect={setActiveTab} />
              </View>

              {activityLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Mascot size={36} />
                </View>
              ) : activity.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Mascot size={64} animated={false} badge={false} />
                  <Text style={{ color: tokens.muted, marginTop: 10, fontSize: 14 }}>Nothing here yet</Text>
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
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,1)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  banner: { height: 64, width: '100%' },
  avatarWrap: { position: 'absolute', top: 48, left: 16 },
  avatarRing: { borderWidth: 3, borderRadius: 999, alignSelf: 'flex-start' },
  scrollContent: { paddingBottom: 60 },
  name: { fontSize: 17, fontWeight: '800' as const, marginTop: 36 },
  username: { fontSize: 13, marginTop: 2, marginBottom: 4 },
  bio: { fontSize: 13.5, marginTop: 6, lineHeight: 19 },
  karmaRow: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 16, paddingTop: 14, marginHorizontal: 16 },
  karmaBlock: { flex: 1, alignItems: 'center' },
  karmaValue: { fontSize: 17, fontWeight: '800' },
  karmaLabel: { fontSize: 12, marginTop: 2 },
  karmaDivider: { width: StyleSheet.hairlineWidth, marginVertical: 4 },
});
