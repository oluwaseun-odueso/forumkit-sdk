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
// Height of the drag-handle strip that sits ABOVE the sheet body.
const HANDLE_H = 32;

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

  const { height: windowHeight } = Dimensions.get('window');
  const SNAP_HALF   = windowHeight * 0.52;
  const SNAP_FULL   = 0;
  const SNAP_CLOSED = windowHeight;

  // `top` style (layout-based) so hit-testing matches the visual position.
  const sheetTop = useRef(new Animated.Value(SNAP_CLOSED)).current;

  const lastMoveY   = useRef<number | null>(null);
  const isAtFullRef = useRef(false);   // ref so PanResponder callbacks read current value
  const onCloseRef  = useRef(onClose);
  onCloseRef.current = onClose;

  // ScrollView is enabled only when the sheet is fully expanded. At SNAP_HALF
  // upward content swipes drive the sheet up instead of scrolling the list.
  const [scrollEnabled, setScrollEnabled] = useState(false);

  useEffect(() => {
    Animated.spring(sheetTop, { toValue: SNAP_HALF, useNativeDriver: false, bounciness: 4 }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const snapTo = (target: number, done?: () => void) => {
    const goingFull = target === SNAP_FULL;
    isAtFullRef.current = goingFull;
    setScrollEnabled(goingFull);
    if (target === SNAP_CLOSED) {
      Animated.timing(sheetTop, { toValue: SNAP_CLOSED, duration: 220, useNativeDriver: false })
        .start(done);
    } else {
      Animated.spring(sheetTop, { toValue: target, useNativeDriver: false, bounciness: 4 })
        .start(done);
    }
  };

  // The pan responder lives on the handle overlay (a sibling of the sheet,
  // NOT a child). This avoids the sheet's overflow:hidden + borderTopRadius
  // clipping the touch area on iOS when the handle is inside the sheet.
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderTerminationRequest: () => false,

    onPanResponderGrant: (_e, g) => {
      sheetTop.stopAnimation();
      lastMoveY.current = g.moveY;
    },

    onPanResponderMove: (_e, g) => {
      const cur = (sheetTop as unknown as { _value: number })._value;
      const delta = lastMoveY.current !== null ? g.moveY - lastMoveY.current : 0;
      lastMoveY.current = g.moveY;
      sheetTop.setValue(Math.max(SNAP_FULL, cur + delta));
    },

    onPanResponderRelease: (_e, g) => {
      lastMoveY.current = null;
      const cur = (sheetTop as unknown as { _value: number })._value;
      if (g.vy > 1.2 || cur > windowHeight * 0.65) {
        snapTo(SNAP_CLOSED, () => onCloseRef.current());
      } else if (cur < windowHeight * 0.25 || g.vy < -0.8) {
        snapTo(SNAP_FULL);
      } else {
        snapTo(SNAP_HALF);
      }
    },

    onPanResponderTerminate: () => {
      lastMoveY.current = null;
      snapTo(SNAP_HALF);
    },
  })).current;

  // Content-area pan: claims upward swipes when the sheet is at SNAP_HALF so
  // swiping up on the list expands the sheet rather than scrolling (scroll is
  // disabled at SNAP_HALF). Uses onMoveShouldSetPanResponder so taps still
  // reach the PostRow / ProfileCommentCard children underneath.
  const contentPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => !isAtFullRef.current && g.dy < -5,
    onPanResponderTerminationRequest: () => false,

    onPanResponderGrant: (_e, g) => {
      sheetTop.stopAnimation();
      lastMoveY.current = g.moveY;
    },

    onPanResponderMove: (_e, g) => {
      const cur = (sheetTop as unknown as { _value: number })._value;
      const delta = lastMoveY.current !== null ? g.moveY - lastMoveY.current : 0;
      lastMoveY.current = g.moveY;
      sheetTop.setValue(Math.max(SNAP_FULL, cur + delta));
    },

    onPanResponderRelease: (_e, g) => {
      lastMoveY.current = null;
      const cur = (sheetTop as unknown as { _value: number })._value;
      if (g.vy > 1.2 || cur > windowHeight * 0.65) {
        snapTo(SNAP_CLOSED, () => onCloseRef.current());
      } else if (cur < windowHeight * 0.25 || g.vy < -0.8) {
        snapTo(SNAP_FULL);
      } else {
        snapTo(SNAP_HALF);
      }
    },

    onPanResponderTerminate: () => {
      lastMoveY.current = null;
      snapTo(SNAP_HALF);
    },
  })).current;

  const scrimOpacity = sheetTop.interpolate({
    inputRange:  [SNAP_FULL, SNAP_HALF, SNAP_CLOSED],
    outputRange: [0.5, 0.4, 0],
    extrapolate: 'clamp',
  });

  function handleClose() {
    snapTo(SNAP_CLOSED, onClose);
  }

  const [profile,        setProfile]        = useState<UserProfile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState<string>('Overview');
  const [activity,       setActivity]       = useState<ActivityRow[]>([]);
  const [activityLoading,setActivityLoading]= useState(false);
  const [previewUri,     setPreviewUri]     = useState<string | null>(null);

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
      {/* Scrim: visual only */}
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} pointerEvents="none" />

      {/* Full-screen backdrop — plain View (not Pressable) so it stays in the
          JS responder system only. Pressable creates a native UIGestureRecognizer
          on iOS that fires before the PanResponder on the handle even though the
          handle has higher z-order. onStartShouldSetResponder returns true only
          for touches above the sheet, so it can never compete with the handle. */}
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={e => {
          const sheetY = (sheetTop as unknown as { _value: number })._value;
          return e.nativeEvent.pageY < sheetY;
        }}
        onResponderRelease={() => handleClose()}
      />

      {/* Sheet body — rendered above the backdrop.
          paddingTop leaves room for the handle overlay above. */}
      <Animated.View style={[styles.sheet, { backgroundColor: tokens.bg, top: sheetTop }]}>
        {loading ? (
          <View style={styles.center}><Mascot size={36} /></View>
        ) : (
          <View style={styles.scrollWrap} {...contentPan.panHandlers}>
        <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.content} scrollEventThrottle={16}>
            {/* Banner: tappable for lightbox, no camera badge */}
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
                  <Text style={[styles.username, { color: tokens.muted }]}>/{name}</Text>
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

      {/* Handle overlay — sibling of the sheet, NOT inside it.
          Positioned at the same top as the sheet so it sits flush above the
          sheet body. Being outside the sheet means overflow:hidden and the
          borderTopRadius clipping mask cannot affect its touch area.
          Pan handlers go on an inner plain View, not on Animated.View itself —
          Animated.View intercepts event props differently on Fabric (RN 0.76+). */}
      <Animated.View
        style={[styles.handleBar, { backgroundColor: tokens.bg, top: sheetTop }]}
      >
        <View style={[styles.pill, { backgroundColor: tokens['surface-2'] }]} />
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
      </Animated.View>

      {previewUri && <ImageLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,1)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    // paddingTop reserves space so content starts below the handle overlay.
    paddingTop: HANDLE_H,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  // The drag-handle strip: lives outside the sheet so overflow:hidden cannot
  // clip its touch area. Matches the sheet's background and top border radius.
  handleBar: {
    position: 'absolute',
    left: 0, right: 0,
    height: HANDLE_H,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { width: 36, height: 4, borderRadius: 2 },
  scrollWrap: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  content: { paddingBottom: 110 },
  banner: { height: 120, marginBottom: 44, position: 'relative' },
  avatarWrap: { position: 'absolute', left: 16, bottom: -36 },
  avatarRing: { borderRadius: 40, borderWidth: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  displayName: { fontSize: 20, fontWeight: '800' },
  username: { fontSize: 13, marginTop: 2 },
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
