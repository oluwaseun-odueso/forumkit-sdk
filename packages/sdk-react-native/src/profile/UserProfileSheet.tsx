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

  // Drive the sheet's TOP (not transform) so layout position === visual position.
  // transform-only moves the view visually while keeping layout bounds at y=0,
  // which breaks hit-testing: touches on the handle and ScrollView land in the
  // wrong layout region and don't reach the right views.
  const sheetTop = useRef(new Animated.Value(CLOSED)).current;

  const isAtFull = useRef(false);
  const scrollAtTop = useRef(true);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const lastMoveY = useRef<number | null>(null);

  const [scrollEnabled, setScrollEnabled] = useState(false);

  useEffect(() => {
    Animated.spring(sheetTop, { toValue: HALF, useNativeDriver: false, bounciness: 4 }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const snapTo = (target: number, cb?: () => void) => {
    const toFull = target === FULL;
    const toClosed = target === CLOSED;
    isAtFull.current = toFull;
    setScrollEnabled(toFull);
    if (toClosed) {
      Animated.timing(sheetTop, { toValue: CLOSED, duration: 220, useNativeDriver: false })
        .start(cb);
    } else {
      Animated.spring(sheetTop, { toValue: target, useNativeDriver: false, bounciness: 4 })
        .start(cb);
    }
  };

  const onPanGrant = (_evt: unknown, gesture: { moveY: number }) => {
    sheetTop.stopAnimation();
    lastMoveY.current = gesture.moveY;
  };

  const onPanMove = (_evt: unknown, gesture: { moveY: number }) => {
    const current = (sheetTop as unknown as { _value: number })._value;
    const delta = lastMoveY.current !== null ? gesture.moveY - lastMoveY.current : 0;
    lastMoveY.current = gesture.moveY;
    sheetTop.setValue(Math.max(FULL, current + delta));
  };

  const onPanRelease = (_evt: unknown, gesture: { vy: number }) => {
    lastMoveY.current = null;
    const current = (sheetTop as unknown as { _value: number })._value;
    if (gesture.vy > 1.2 || current > windowHeight * 0.65) {
      snapTo(CLOSED, () => onCloseRef.current());
    } else if (current < windowHeight * 0.25 || gesture.vy < -0.8) {
      snapTo(FULL);
    } else {
      snapTo(HALF);
    }
  };

  const onPanTerminate = () => {
    lastMoveY.current = null;
    snapTo(HALF);
  };

  const handlePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: onPanGrant,
    onPanResponderMove: onPanMove,
    onPanResponderRelease: onPanRelease,
    onPanResponderTerminate: onPanTerminate,
  })).current;

  // Collapse gesture from within the content: only when at full height,
  // scrolled to top, and dragging downward. The ScrollView keeps all other
  // gestures (upward scroll, taps on items, etc.).
  const scrollPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_evt, gesture) =>
      isAtFull.current &&
      scrollAtTop.current &&
      gesture.dy > 12 &&
      gesture.dy > Math.abs(gesture.dx) * 1.5,
    onPanResponderGrant: onPanGrant,
    onPanResponderMove: onPanMove,
    onPanResponderRelease: onPanRelease,
    onPanResponderTerminate: onPanTerminate,
  })).current;

  const scrimOpacity = sheetTop.interpolate({
    inputRange: [FULL, HALF, CLOSED],
    outputRange: [0.5, 0.4, 0],
    extrapolate: 'clamp',
  });

  function handleClose() {
    snapTo(CLOSED, onClose);
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
      {/* Scrim */}
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} pointerEvents="none" />

      {/* Tap backdrop above the sheet to close. Height tracks the sheet top so
          this Pressable never overlaps with the sheet itself. */}
      <Animated.View style={[styles.backdrop, { height: sheetTop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet: positioned via `top` (layout), not `transform`.
          This keeps hit-testing in sync with the visual position. */}
      <Animated.View style={[styles.sheet, { backgroundColor: tokens.bg, top: sheetTop }]}>
        {/* Drag handle — full-width grab zone at the top of the sheet */}
        <View style={styles.handleWrap} {...handlePan.panHandlers}>
          <View style={[styles.dragHandle, { backgroundColor: tokens['surface-2'] }]} />
        </View>

        {loading ? (
          <View style={styles.center}><Mascot size={36} /></View>
        ) : (
          <View style={styles.body} {...scrollPan.panHandlers}>
            <ScrollView
              contentContainerStyle={styles.content}
              scrollEnabled={scrollEnabled}
              scrollEventThrottle={16}
              onScroll={e => { scrollAtTop.current = e.nativeEvent.contentOffset.y <= 0; }}
            >
              {/* Banner — tappable for lightbox, no camera badge */}
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
                    <Text style={[styles.displayName, { color: tokens.text }]}>{name}</Text>
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
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0 },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  handleWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 10 },
  dragHandle: { width: 36, height: 4, borderRadius: 2 },
  body: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  content: { paddingBottom: 110 },
  banner: { height: 120, marginBottom: 44, position: 'relative' },
  avatarWrap: { position: 'absolute', left: 16, bottom: -36 },
  avatarRing: { borderRadius: 40, borderWidth: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  displayName: { fontSize: 20, fontWeight: '800' },
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
