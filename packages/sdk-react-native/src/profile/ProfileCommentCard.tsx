import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Comment } from '@forumkit/types';
import { fmtRelativeTime } from '@forumkit/shared';
import { useTheme } from '../theme/ThemeContext';
import RenderedBody from '../components/RenderedBody';
import { UpvoteIcon, DownvoteIcon } from '../components/icons';

// Read-only activity-feed entry for a comment — mirrors sdk-web's
// profile-comment-card.tsx. Tapping opens the full thread.
export default function ProfileCommentCard({ comment, threadTitle, replyingTo, onOpen }: {
  comment: Comment;
  threadTitle: string;
  replyingTo?: { author: string; snippet: string } | undefined;
  onOpen: () => void;
}) {
  const { tokens } = useTheme();
  const voteCounts = comment.voteCounts ?? { up: 0, down: 0 };
  return (
    <Pressable onPress={onOpen} style={[styles.card, { borderBottomColor: tokens.border }]}>
      <View style={styles.head}>
        <Text style={[styles.author, { color: tokens.text }]}>{comment.authorDisplayName ?? 'Member'}</Text>
        <Text style={[styles.time, { color: tokens.muted }]}>· {fmtRelativeTime(comment.createdAt)}</Text>
      </View>
      <Text style={[styles.context, { color: tokens.muted }]}>
        Commented on <Text style={{ color: tokens['text-2'], fontWeight: '600' }}>{threadTitle}</Text>
      </Text>
      {replyingTo && (
        <Text style={[styles.replying, { color: tokens.muted }]} numberOfLines={1}>
          Replying to <Text style={{ fontWeight: '700' }}>{replyingTo.author}</Text>: “{replyingTo.snippet}”
        </Text>
      )}
      <View style={{ marginTop: 4 }}><RenderedBody body={comment.body} size={13.5} /></View>
      <View style={styles.stats}>
        <View style={styles.stat}><UpvoteIcon size={13} color={tokens.muted} /><Text style={[styles.statN, { color: tokens.muted }]}>{voteCounts.up}</Text></View>
        <View style={styles.stat}><DownvoteIcon size={13} color={tokens.muted} /><Text style={[styles.statN, { color: tokens.muted }]}>{voteCounts.down}</Text></View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 12, borderBottomWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  author: { fontSize: 13, fontWeight: '700' },
  time: { fontSize: 12 },
  context: { fontSize: 12.5, marginTop: 3 },
  replying: { fontSize: 12, marginTop: 3 },
  stats: { flexDirection: 'row', gap: 14, marginTop: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statN: { fontSize: 12, fontWeight: '600' },
});
