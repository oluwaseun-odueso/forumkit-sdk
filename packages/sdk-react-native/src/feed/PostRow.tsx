import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { FeedRow } from '@forumkit/shared';
import type { VoteDirection } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import Thumbnail from '../components/Thumbnail';
import VotePill from '../components/VotePill';
import CommentPill from '../components/CommentPill';
import { DropdownMenu, DropdownMenuItem, useAnchor } from '../components/DropdownMenu';
import { ShareIcon, EllipsisIcon, SaveIcon, ReportIcon } from '../components/icons';

// A post's video thumbnail — an actual inline player with native controls
// (play/pause, scrubber, duration, and on iOS, playback speed), matching
// web's post-card which renders a real <video controls> element rather than
// a static poster frame. FlatList (see FeedScreen) only mounts rows near the
// viewport, so this doesn't create a player per off-screen post.
function FeedVideoThumb({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, p => { p.loop = false; });
  return <VideoView player={player} style={style} nativeControls contentFit="cover" />;
}

// Feed post row per design_handoff README §6. Mirrors sdk-web's post-card:
// author header (communities are deferred, so the header shows the author, not
// a community), a compact (title + 78×78 thumb) or card (full-width title +
// 16:10 thumb) body, then the actions row on ITS OWN line (vote / comment /
// spacer / share / ellipsis). Tapping the row opens the thread; the action
// controls are nested Pressables, so RN's responder system stops those taps
// from also triggering the row press (no explicit stopPropagation needed).
export default function PostRow({ row, view, onOpen, onVote, onSave, onReport, onShare }: {
  row: FeedRow;
  view: 'card' | 'compact';
  onOpen: () => void;
  onVote: (dir: VoteDirection) => void;
  onSave: () => void;
  onReport: () => void;
  onShare: () => void;
}) {
  const { tokens } = useTheme();
  const { ref: ellipsisRef, anchor, measure } = useAnchor();
  const [menuOpen, setMenuOpen] = useState(false);
  const imageUrl = row.imageUrl;
  const videoUrl = row.videoUrl;
  // row.mediaCount is every attachment; imageUrl/videoUrl only ever surfaces
  // one of them as the thumbnail (image takes priority — see threadToFeedRow),
  // so anything beyond that first one is "extra" for the badge.
  const extraMediaCount = Math.max(0, row.mediaCount - 1);

  return (
    <Pressable onPress={onOpen} style={[styles.row, { borderBottomColor: tokens.border }]}>
      <View style={styles.head}>
        <Avatar authorId={row.authorId} author={row.author} avatarUrl={row.authorAvatarUrl} size={22} />
        <Text style={[styles.author, { color: tokens.text }]}>{row.author}</Text>
        <Text style={[styles.time, { color: tokens.muted }]}>· {row.time}</Text>
      </View>

      {view === 'card' ? (
        <>
          <Text style={[styles.title, { color: tokens.text }]} numberOfLines={3}>{row.title}</Text>
          {imageUrl != null ? (
            <View style={{ marginBottom: 10 }}>
              <Thumbnail imageUrl={imageUrl} aspectRatio={4 / 5} radius={14} />
              {extraMediaCount > 0 && (
                <View style={[styles.moreBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                  <Text style={styles.moreBadgeText}>+{extraMediaCount}</Text>
                </View>
              )}
            </View>
          ) : videoUrl != null ? (
            <View style={{ marginBottom: 10 }}>
              <FeedVideoThumb uri={videoUrl} style={[styles.cardVideo, { backgroundColor: tokens['surface-2'] }]} />
              {extraMediaCount > 0 && (
                <View style={[styles.moreBadge, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                  <Text style={styles.moreBadgeText}>+{extraMediaCount}</Text>
                </View>
              )}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.compactBody}>
          <Text style={[styles.title, styles.titleCompact, { color: tokens.text }]} numberOfLines={3}>{row.title}</Text>
          {imageUrl != null ? (
            <View>
              <Thumbnail imageUrl={imageUrl} square={78} radius={12} />
              {extraMediaCount > 0 && (
                <View style={[styles.moreBadge, styles.moreBadgeCompact, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                  <Text style={styles.moreBadgeText}>+{extraMediaCount}</Text>
                </View>
              )}
            </View>
          ) : videoUrl != null ? (
            <View>
              <FeedVideoThumb uri={videoUrl} style={[styles.compactVideo, { backgroundColor: tokens['surface-2'] }]} />
              {extraMediaCount > 0 && (
                <View style={[styles.moreBadge, styles.moreBadgeCompact, { backgroundColor: 'rgba(0,0,0,0.65)' }]}>
                  <Text style={styles.moreBadgeText}>+{extraMediaCount}</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      )}

      <View style={styles.actions}>
        <VotePill voteCounts={row.voteCounts} dir={row.myVote} onVote={onVote} />
        <CommentPill count={row.commentCount} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={onShare} style={[styles.circle, { backgroundColor: tokens['surface-2'] }]}>
          <ShareIcon size={15} color={tokens['text-2']} />
        </Pressable>
        <Pressable
          ref={ellipsisRef}
          onPress={() => measure(() => setMenuOpen(true))}
          style={[styles.circle, { backgroundColor: menuOpen ? tokens['hover-2'] : tokens['surface-2'] }]}
        >
          <EllipsisIcon size={16} color={tokens['text-2']} />
        </Pressable>
      </View>

      <DropdownMenu visible={menuOpen} onClose={() => setMenuOpen(false)} anchor={anchor} width={150} align="right">
        <DropdownMenuItem
          icon={<SaveIcon size={16} color={tokens['text-2']} filled={row.saved} />}
          label={row.saved ? 'Unsave' : 'Save'}
          onPress={() => { setMenuOpen(false); onSave(); }}
        />
        <DropdownMenuItem
          icon={<ReportIcon size={16} color={tokens['text-2']} />}
          label="Report"
          onPress={() => { setMenuOpen(false); onReport(); }}
        />
      </DropdownMenu>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 8,
  },
  author: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  time: {
    fontSize: 12.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 10,
  },
  titleCompact: {
    flex: 1,
    marginBottom: 0,
  },
  compactBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardVideo: { width: '100%', aspectRatio: 4 / 5, borderRadius: 14 },
  compactVideo: { width: 78, height: 78, borderRadius: 12 },
  // Matches sdk-web's fk-post-card-more-badge — a small pill in the
  // thumbnail's bottom-right corner counting attachments beyond the one
  // shown as the thumbnail itself.
  moreBadge: {
    position: 'absolute', right: 8, bottom: 8, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  moreBadgeCompact: { right: 4, bottom: 4 },
  moreBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
