import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import type { CommentNode } from '@forumkit/shared';
import type { VoteDirection } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import RenderedBody from '../components/RenderedBody';
import VotePill from '../components/VotePill';
import ConfirmDialog from '../components/ConfirmDialog';
import CommentComposer from './CommentComposer';

// Context passed down the recursion so every level shares the same handlers +
// permission info without re-plumbing each prop.
export type CommentCtx = {
  apiUrl: string;
  forumId: string;
  token: string | undefined;
  currentUserId: string | null;
  isModerator: boolean;
  canAcceptAnswer: boolean; // thread author or moderator
  onVote: (commentId: string, dir: VoteDirection) => void;
  onSave: (commentId: string, save: boolean) => void;
  onReplySubmit: (parentId: string, body: string, attachmentIds: string[]) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => void;
  onAccept: (commentId: string, accepted: boolean) => void;
  onReport: (commentId: string) => void;
  onShare: (commentId: string) => void;
};

// A single comment (recursive) — mirrors sdk-web's comment.tsx: markdown body,
// vote pill, and the full action set (Reply nested, Edit inline, Save, Share,
// Report, and — for own comments/mods — Delete + Accept-Answer).
export default function CommentRow({ node, depth = 0, ctx }: { node: CommentNode; depth?: number; ctx: CommentCtx }) {
  const { tokens } = useTheme();
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(node.body);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canModify = ctx.currentUserId !== null && (node.authorId === ctx.currentUserId || ctx.isModerator);

  return (
    <View style={[styles.row, depth > 0 && { marginLeft: 16, borderLeftWidth: 1, borderLeftColor: tokens.border, paddingLeft: 10 }]}>
      <View style={styles.head}>
        <Avatar authorId={node.authorId} author={node.author} avatarUrl={node.authorAvatarUrl} size={24} />
        <Text style={[styles.author, { color: tokens.text }]}>{node.author}</Text>
        <Text style={[styles.time, { color: tokens.muted }]}>· {node.time}</Text>
        {node.isAcceptedAnswer && <Text style={[styles.answer, { color: tokens.success }]}>✓ Answer</Text>}
      </View>

      {editOpen ? (
        <View style={{ marginTop: 8, marginLeft: 32 }}>
          <TextInput
            value={editBody}
            onChangeText={setEditBody}
            multiline
            style={[styles.editInput, { color: tokens.text, borderColor: tokens['border-strong'] }]}
          />
          <View style={styles.editActions}>
            <Pressable onPress={() => { setEditOpen(false); setEditBody(node.body); }} style={[styles.smallBtn, { backgroundColor: tokens['surface-2'] }]}>
              <Text style={{ color: tokens['text-2'], fontWeight: '700', fontSize: 12 }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={async () => { await ctx.onEdit(node.id, editBody.trim()); setEditOpen(false); }}
              style={[styles.smallBtn, { backgroundColor: tokens.accent }]}
            >
              <Text style={{ color: tokens['accent-fg'], fontWeight: '700', fontSize: 12 }}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <RenderedBody body={node.body} size={13.5} />
        </View>
      )}

      <View style={styles.actions}>
        <VotePill voteCounts={node.voteCounts} dir={node.myVote ?? null} onVote={dir => ctx.onVote(node.id, dir)} />
        <Action label="Reply" onPress={() => setReplyOpen(o => !o)} />
        {canModify && <Action label="Edit" onPress={() => { setEditBody(node.body); setEditOpen(true); }} />}
        <Action label={node.isSaved ? 'Unsave' : 'Save'} onPress={() => ctx.onSave(node.id, !node.isSaved)} />
        <Action label="Share" onPress={() => ctx.onShare(node.id)} />
        <Action label="Report" onPress={() => ctx.onReport(node.id)} />
        {ctx.canAcceptAnswer && (
          <Action label={node.isAcceptedAnswer ? 'Unaccept' : 'Accept'} onPress={() => ctx.onAccept(node.id, !node.isAcceptedAnswer)} />
        )}
        {canModify && <Action label="Delete" danger onPress={() => setDeleteOpen(true)} />}
      </View>

      {replyOpen && (
        <View style={{ marginLeft: 32 }}>
          <CommentComposer
            apiUrl={ctx.apiUrl}
            forumId={ctx.forumId}
            token={ctx.token}
            placeholder={`Reply to ${node.author}`}
            submitLabel="Reply"
            onSubmit={async (b, ids) => { await ctx.onReplySubmit(node.id, b, ids); setReplyOpen(false); }}
            onCancel={() => setReplyOpen(false)}
          />
        </View>
      )}

      {node.replies.map(child => (
        <CommentRow key={child.id} node={child} depth={depth + 1} ctx={ctx} />
      ))}

      {deleteOpen && (
        <ConfirmDialog
          title="Delete comment?"
          message="This can't be undone."
          onCancel={() => setDeleteOpen(false)}
          onConfirm={() => { setDeleteOpen(false); ctx.onDelete(node.id); }}
        />
      )}
    </View>
  );
}

function Action({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Text style={{ color: danger ? tokens.danger : tokens.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  author: { fontSize: 13, fontWeight: '700' },
  time: { fontSize: 12 },
  answer: { fontSize: 11, fontWeight: '700', marginLeft: 4 },
  body: { marginTop: 6, marginLeft: 32 },
  editInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13.5, minHeight: 60, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  smallBtn: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, rowGap: 8, marginTop: 8, marginLeft: 32 },
});
