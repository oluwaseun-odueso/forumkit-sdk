import { useEffect, useRef, useState } from 'react';
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

  // Refs readable inside PanResponder closures (created once on mount).
  // isAtFull tracks whether the sheet is snapped to full height; when false,
  // scroll is disabled so all drags in the content area move the sheet.
  const isAtFull = useRef(false);
  const scrollAtTop = useRef(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // scrollEnabled drives the ScrollView — false at half height so the
  // content area doesn't compete with the sheet's pan responder.
  const [scrollEnabled, setScrollEnabled] = useState(false);

  // lastMoveY tracks the touch Y at the moment each responder last fired,
  // so we can compute incremental deltas rather than using gesture.dy
  // (which is cumulative from touch start — causes a jump when contentPan
  // steals the gesture mid-drag from the ScrollView).
  const lastMoveY = useRef<number | null>(null);

  useEffect(() => {
    Animated.spring(translateY, { toValue: HALF, useNativeDriver: false, bounciness: 4 }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Called when a responder claims the gesture. Stop any running snap
  // animation so it doesn't fight the finger, then record the Y baseline.
  const onPanGrant = (_evt: unknown, gesture: { moveY: number }) => {
    translateY.stopAnimation();
    lastMoveY.current = gesture.moveY;
  };

  // Shared move handler: uses incremental moveY delta, not cumulative dy,
  // so stealing the gesture mid-drag produces no position jump.
  const onPanMove = (_evt: unknown, gesture: { moveY: number }) => {
    const current = (translateY as unknown as { _value: number })._value;
    const delta = lastMoveY.current !== null ? gesture.moveY - lastMoveY.current : 0;
    lastMoveY.current = gesture.moveY;
    translateY.setValue(Math.max(FULL, current + delta));
  };

  // Shared snap-on-release handler.
  const onPanRelease = (_evt: unknown, gesture: { vy: number }) => {
    lastMoveY.current = null;
    const current = (translateY as unknown as { _value: number })._value;
    if (gesture.vy > 1.2 || current > windowHeight * 0.65) {
      isAtFull.current = false;
      setScrollEnabled(false);
      Animated.timing(translateY, { toValue: CLOSED, duration: 220, useNativeDriver: false })
        .start(() => onCloseRef.current());
    } else if (current < windowHeight * 0.25 || gesture.vy < -0.8) {
      isAtFull.current = true;
      setScrollEnabled(true);
      Animated.spring(translateY, { toValue: FULL, useNativeDriver: false, bounciness: 4 }).start();
    } else {
      isAtFull.current = false;
      setScrollEnabled(false);
      Animated.spring(translateY, { toValue: HALF, useNativeDriver: false, bounciness: 4 }).start();
    }
  };

  const onPanTerminate = () => {
    lastMoveY.current = null;
    isAtFull.current = false;
    setScrollEnabled(false);
    Animated.spring(translateY, { toValue: HALF, useNativeDriver: false, bounciness: 4 }).start();
  };

  // Handle-area pan — always claims the gesture. Applied only to the
  // drag-handle strip at the top so it never fights the ScrollView.
  const handlePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false, // don't surrender to contentPan mid-drag
    onPanResponderGrant: onPanGrant,
    onPanResponderMove: onPanMove,
    onPanResponderRelease: onPanRelease,
    onPanResponderTerminate: onPanTerminate,
  })).current;

  // Content-area pan — applied to the ScrollView wrapper.
  // Only engages at full height when the scroll is at the top and the user
  // swipes down, so they can collapse the sheet from the content area.
  // At half height the handle is the only drag target — content-area swipes
  // do not move the sheet (prevents accidental expansion while the user
  // intends to touch content).
  const contentPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_evt, gesture) => {
      if (!isAtFull.current) return false;
      const isDownward = gesture.dy > 10 && gesture.dy > Math.abs(gesture.dx) * 1.5;
      return isDownward && scrollAtTop.current;
    },
    onPanResponderGrant: onPanGrant,
    onPanResponderMove: onPanMove,
    onPanResponderRelease: onPanRelease,
    onPanResponderTerminate: onPanTerminate,
  })).current;

  const scrimOpacity = translateY.interpolate({
    inputRange: [FULL, HALF, CLOSED],
    outputRange: [0.5, 0.4, 0],
    extrapolate: 'clamp',
  });

  function handleClose() {
    isAtFull.current = false;
    setScrollEnabled(false);
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
    const scope = activeTab.toLowerCase() as 'overview' | 'posts' | 'comments' | 'upvoted' | 'downvoted';
    getProfileActivityForUser(apiUrl, forumId, userId, scope, 1, 20, 'new', 'all', token)
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
      {/* Tap-to-close only covers the exposed backdrop above the sheet, not the sheet itself.
          Driving height from translateY keeps it perfectly in sync with the sheet's visual top,
          so a touch on the sheet (or handle) never falls through to this Pressable. */}
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: translateY }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { backgroundColor: tokens.bg, transform: [{ translateY }] }]}>
        {/* Drag handle — the only area with panHandlers on the sheet.
            Full-width so there's a generous grab target at the top. */}
        <View style={styles.handleWrap} {...handlePan.panHandlers}>
          <View style={[styles.dragHandle, { backgroundColor: tokens['surface-2'] }]} />
        </View>

        {loading ? (
          <View style={styles.center}><Mascot size={36} /></View>
        ) : (
          // contentPan wrapper enables swipe-up from content to expand at half height,
          // and swipe-down from scroll-top to collapse/close at full height.
          <View style={{ flex: 1 }} {...contentPan.panHandlers}>
            <ScrollView
              contentContainerStyle={styles.content}
              scrollEnabled={scrollEnabled}
              scrollEventThrottle={16}
              onScroll={e => { scrollAtTop.current = e.nativeEvent.contentOffset.y <= 0; }}
            >
              {/* Banner — tappable for full-screen preview, no camera badge */}
              <Pressable
                onPress={() => profile?.bannerUrl && setPreviewUri(profile.bannerUrl)}
                disabled={!profile?.bannerUrl}
                style={[styles.banner, { backgroundColor: tokens['surface-2'] }]}
              >
                {profile?.bannerUrl != null && (
                  <Image source={{ uri: profile.bannerUrl }} style={StyleSheet.absoluteFill} />
                )}
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
          </View>
        )}
      </Animated.View>

      {previewUri && <ImageLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,1)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 10 },
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
