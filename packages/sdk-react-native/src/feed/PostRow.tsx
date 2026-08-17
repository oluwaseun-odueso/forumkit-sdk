import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { FeedRow } from '@forumkit/shared';
import type { VoteDirection } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import Thumbnail from '../components/Thumbnail';
import VotePill from '../components/VotePill';
import CommentPill from '../components/CommentPill';
import { DropdownMenu, DropdownMenuItem, useAnchor } from '../components/DropdownMenu';
import { ShareIcon, EllipsisIcon, SaveIcon, ReportIcon } from '../components/icons';

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
          {imageUrl != null && (
            <Thumbnail imageUrl={imageUrl} aspectRatio={16 / 10} radius={14} style={{ marginBottom: 10 }} />
          )}
        </>
      ) : (
        <View style={styles.compactBody}>
          <Text style={[styles.title, styles.titleCompact, { color: tokens.text }]} numberOfLines={3}>{row.title}</Text>
          {imageUrl != null && <Thumbnail imageUrl={imageUrl} square={78} radius={12} />}
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
    borderBottomWidth: 1,
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
});
