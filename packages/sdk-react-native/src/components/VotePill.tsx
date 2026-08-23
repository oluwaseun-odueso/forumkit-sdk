import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { VoteCounts, VoteDirection } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { UpvoteIcon, DownvoteIcon } from './icons';

// Vote pill — a surface-2 rounded pill showing the up and down counts
// SEPARATELY (up triangle + up count, down triangle + down count), matching
// sdk-web's vote-pill. Colors follow web's vote-pill.css: arrows/counts default
// to muted/text-2; the up side turns `up` (#ff6a3d) when upvoted and the down
// side turns `down` (#8b6dff) when downvoted.
export default function VotePill({ voteCounts, dir, onVote }: {
  voteCounts: VoteCounts;
  dir: VoteDirection | null;
  onVote: (dir: VoteDirection) => void;
}) {
  const { tokens } = useTheme();

  return (
    <View style={[styles.pill, { backgroundColor: tokens['surface-2'] }]}>
      <Pressable onPress={() => onVote(1)} hitSlop={8} style={styles.unit}>
        <UpvoteIcon size={17} color={dir === 1 ? tokens.up : tokens.muted} filled={dir === 1} />
        <Text style={[styles.count, { color: dir === 1 ? tokens.up : tokens['text-2'] }]}>{voteCounts.up}</Text>
      </Pressable>
      <Pressable onPress={() => onVote(-1)} hitSlop={8} style={styles.unit}>
        <DownvoteIcon size={17} color={dir === -1 ? tokens.down : tokens.muted} filled={dir === -1} />
        <Text style={[styles.count, { color: dir === -1 ? tokens.down : tokens['text-2'] }]}>{voteCounts.down}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 12,
  },
  unit: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  count: { fontSize: 14, fontWeight: '700', minWidth: 14, textAlign: 'center' },
});
