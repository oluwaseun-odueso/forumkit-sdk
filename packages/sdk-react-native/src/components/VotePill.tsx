import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { VoteCounts, VoteDirection } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { UpvoteIcon, DownvoteIcon } from './icons';

// Compact vote pill per design_handoff README §6: a surface-2 rounded pill with
// [up triangle] [single net count] [down triangle] (the mobile design shows one
// net number, unlike sdk-web's separate up/down counts). Colors follow web's
// vote-pill.css: triangles default to `muted`; the up triangle + count turn
// `up` (#ff6a3d) when upvoted and the down triangle + count turn `down`
// (#8b6dff) when downvoted.
export default function VotePill({ voteCounts, dir, onVote }: {
  voteCounts: VoteCounts;
  dir: VoteDirection | null;
  onVote: (dir: VoteDirection) => void;
}) {
  const { tokens } = useTheme();
  const net = voteCounts.up - voteCounts.down;
  const countColor = dir === 1 ? tokens.up : dir === -1 ? tokens.down : tokens.text;

  return (
    <View style={[styles.pill, { backgroundColor: tokens['surface-2'] }]}>
      <Pressable onPress={() => onVote(1)} hitSlop={8}>
        <UpvoteIcon size={15} color={dir === 1 ? tokens.up : tokens.muted} />
      </Pressable>
      <Text style={[styles.count, { color: countColor }]}>{net}</Text>
      <Pressable onPress={() => onVote(-1)} hitSlop={8}>
        <DownvoteIcon size={15} color={dir === -1 ? tokens.down : tokens.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 6,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 14,
    textAlign: 'center',
  },
});
