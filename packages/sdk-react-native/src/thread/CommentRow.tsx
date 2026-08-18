import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { CommentNode } from '@forumkit/shared';
import type { VoteDirection } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import VotePill from '../components/VotePill';

// A single comment (recursive for replies) — mirrors sdk-web's comment.tsx
// (README §8): 24px avatar + author + time, body indented, then an action row
// (VotePill + Reply/Edit/Save/Share). Vote + Save are wired; Reply focuses the
// composer with this comment as parent; Edit/Share are minimal stubs for now.
export default function CommentRow({ node, depth = 0, onVote, onSave, onReply }: {
  node: CommentNode;
  depth?: number;
  onVote: (commentId: string, dir: VoteDirection) => void;
  onSave: (commentId: string, save: boolean) => void;
  onReply: (node: CommentNode) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.row, depth > 0 && { marginLeft: 16, borderLeftWidth: 1, borderLeftColor: tokens.border, paddingLeft: 10 }]}>
      <View style={styles.head}>
        <Avatar authorId={node.authorId} author={node.author} avatarUrl={node.authorAvatarUrl} size={24} />
        <Text style={[styles.author, { color: tokens.text }]}>{node.author}</Text>
        <Text style={[styles.time, { color: tokens.muted }]}>· {node.time}</Text>
        {node.isAcceptedAnswer && (
          <Text style={[styles.answer, { color: tokens.success }]}>✓ Answer</Text>
        )}
      </View>

      <Text style={[styles.body, { color: tokens['text-2'] }]}>{node.body}</Text>

      <View style={styles.actions}>
        <VotePill voteCounts={node.voteCounts} dir={node.myVote ?? null} onVote={dir => onVote(node.id, dir)} />
        <ActionText label="Reply" onPress={() => onReply(node)} />
        <ActionText label="Edit" onPress={() => { /* edit — later step */ }} />
        <ActionText label={node.isSaved ? 'Unsave' : 'Save'} onPress={() => onSave(node.id, !node.isSaved)} />
        <ActionText label="Share" onPress={() => { /* share — later step */ }} />
      </View>

      {node.replies.map(child => (
        <CommentRow key={child.id} node={child} depth={depth + 1} onVote={onVote} onSave={onSave} onReply={onReply} />
      ))}
    </View>
  );
}

function ActionText({ label, onPress }: { label: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Text style={{ color: tokens.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  author: { fontSize: 13, fontWeight: '700' },
  time: { fontSize: 12 },
  answer: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
  body: { fontSize: 13.5, lineHeight: 21, marginTop: 6, marginLeft: 32 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    rowGap: 8,
    marginTop: 8,
    marginLeft: 32,
  },
});
