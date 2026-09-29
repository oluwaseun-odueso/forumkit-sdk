import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import RichComposer from '../composer/RichComposer';
import { buildGiphyMarkdown, type CommentNode } from '@forumkit/shared';
import type { AttachmentSummary, VoteDirection, GifResult } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import RenderedBody from '../components/RenderedBody';
import VotePill from '../components/VotePill';
import ConfirmDialog from '../components/ConfirmDialog';
import ImageLightbox from '../components/ImageLightbox';
import InlineVideoThumb from '../components/InlineVideoThumb';
import { DropdownMenu, DropdownMenuItem, useAnchor } from '../components/DropdownMenu';
import { EllipsisIcon, ReportIcon, TrashIcon, CheckIcon, PencilIcon, ShareIcon } from '../components/icons';
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
  onPressAuthor?: (userId: string) => void;
};

// A single comment (recursive) — mirrors sdk-web's comment.tsx: markdown body,
// vote pill, and the full action set (Reply nested, Edit inline, Save, Share,
// Report, and — for own comments/mods — Delete + Accept-Answer).
export default function CommentRow({ node, depth = 0, ctx }: { node: CommentNode; depth?: number; ctx: CommentCtx }) {
  const { tokens } = useTheme();
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(node.body);
  const [editGifs, setEditGifs] = useState<GifResult[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { ref: ellipsisRef, anchor, measure } = useAnchor();

  const canModify = ctx.currentUserId !== null && (node.authorId === ctx.currentUserId || ctx.isModerator);

  return (
    <View
      style={[
        styles.row,
        depth > 0 && { marginLeft: 16, borderLeftWidth: 1, borderLeftColor: tokens.border, paddingLeft: 10 },
        // Wins over the depth>0 border above when both apply (a reply that's
        // also the accepted answer) — the accepted-answer accent is the more
        // important signal. Mirrors web's .fk-comment--accepted.
        node.isAcceptedAnswer && {
          borderLeftWidth: 2, borderLeftColor: tokens.success,
          backgroundColor: tokens['success-soft'], borderRadius: 4, paddingLeft: 10,
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.65 }]}
        onPress={ctx.onPressAuthor && node.authorId ? () => ctx.onPressAuthor!(node.authorId!) : undefined}
        disabled={!ctx.onPressAuthor || !node.authorId}
      >
        <Avatar authorId={node.authorId} author={node.author} avatarUrl={node.authorAvatarUrl} size={24} />
        <Text style={[styles.author, { color: tokens.text }]}>{node.author}</Text>
        <Text style={[styles.time, { color: tokens.muted }]}>· {node.time}</Text>
        {node.isAcceptedAnswer && (
          <View style={[styles.answerBadge, { backgroundColor: tokens['success-soft-strong'] }]}>
            <CheckIcon size={11} color={tokens.success} />
            <Text style={{ color: tokens.success, fontSize: 11, fontWeight: '700' }}>Answer</Text>
          </View>
        )}
      </Pressable>

      {editOpen ? (
        <View style={{ marginTop: 8, marginLeft: 32 }}>
          <RichComposer
            apiUrl={ctx.apiUrl}
            forumId={ctx.forumId}
            token={ctx.token}
            value={editBody}
            onChangeText={setEditBody}
            attachments={[]}
            onAttachmentsChange={() => {}}
            gifs={editGifs}
            onGifsChange={setEditGifs}
            allowMedia={false}
          />
          <View style={styles.editActions}>
            <Pressable onPress={() => { setEditOpen(false); setEditBody(node.body); setEditGifs([]); }} style={({ pressed }) => [styles.smallBtn, { backgroundColor: tokens['surface-2'] }, pressed && { opacity: 0.65 }]}>
              <Text style={{ color: tokens['text-2'], fontWeight: '700', fontSize: 12 }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                const withGif = editGifs[0] ? `${editBody.trim()}\n${buildGiphyMarkdown(editGifs[0])}`.trim() : editBody.trim();
                await ctx.onEdit(node.id, withGif);
                setEditOpen(false);
                setEditGifs([]);
              }}
              style={({ pressed }) => [styles.smallBtn, { backgroundColor: tokens.accent }, pressed && { opacity: 0.65 }]}
            >
              <Text style={{ color: tokens['accent-fg'], fontWeight: '700', fontSize: 12 }}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.body}>
          <RenderedBody body={node.body} size={13.5} />
          {node.attachments.length > 0 && <CommentAttachments attachments={node.attachments} />}
        </View>
      )}

      <View style={styles.actions}>
        <VotePill voteCounts={node.voteCounts} dir={node.myVote ?? null} onVote={dir => ctx.onVote(node.id, dir)} />
        <Action label="Reply" onPress={() => setReplyOpen(o => !o)} />
        <Action label={node.isSaved ? 'Unsave' : 'Save'} onPress={() => ctx.onSave(node.id, !node.isSaved)} />
        <Pressable
          ref={ellipsisRef}
          onPress={() => measure(() => setMenuOpen(true))}
          hitSlop={6}
          style={({ pressed }) => [styles.ellipsisBtn, { backgroundColor: menuOpen || pressed ? tokens['hover-2'] : tokens['surface-2'] }]}
        >
          <EllipsisIcon size={17} color={tokens['text-2']} />
        </Pressable>
      </View>

      {/* Only the most frequent actions (vote, Reply, Save) stay inline —
          everything else lives here, matching the pattern already used for
          Report/Delete. */}
      <DropdownMenu visible={menuOpen} onClose={() => setMenuOpen(false)} anchor={anchor} width={170} align="right">
        {canModify && (
          <DropdownMenuItem
            icon={<PencilIcon size={16} color={tokens['text-2']} />}
            label="Edit"
            onPress={() => { setMenuOpen(false); setEditBody(node.body); setEditOpen(true); }}
          />
        )}
        {depth === 0 && ctx.canAcceptAnswer && (
          <DropdownMenuItem
            icon={<CheckIcon size={16} color={node.isAcceptedAnswer ? tokens.success : tokens['text-2']} />}
            label={node.isAcceptedAnswer ? 'Unaccept' : 'Accept'}
            labelColor={node.isAcceptedAnswer ? tokens.success : undefined}
            onPress={() => { setMenuOpen(false); ctx.onAccept(node.id, !node.isAcceptedAnswer); }}
          />
        )}
        {depth === 0 && (
          <DropdownMenuItem
            icon={<ShareIcon size={16} color={tokens['text-2']} />}
            label="Share"
            onPress={() => { setMenuOpen(false); ctx.onShare(node.id); }}
          />
        )}
        <DropdownMenuItem
          icon={<ReportIcon size={16} color={tokens['text-2']} />}
          label="Report"
          onPress={() => { setMenuOpen(false); ctx.onReport(node.id); }}
        />
        {canModify && (
          <DropdownMenuItem
            icon={<TrashIcon size={16} color={tokens['text-2']} />}
            label="Delete"
            onPress={() => { setMenuOpen(false); setDeleteOpen(true); }}
          />
        )}
      </DropdownMenu>

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

const ATTACHMENT_MAX_WIDTH = 220;
const ATTACHMENT_MAX_HEIGHT = 220;

// Compact, wrapping thumbnails — unlike ThreadScreen's full-bleed MediaGallery
// (sized to the whole screen width), a comment is already indented and narrow.
function CommentAttachments({ attachments }: { attachments: AttachmentSummary[] }) {
  const { tokens } = useTheme();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  return (
    <View style={styles.attachments}>
      {attachments.map(a => {
        const isVideo = a.mimeType.startsWith('video/');
        const scale = a.width && a.height ? Math.min(1, ATTACHMENT_MAX_WIDTH / a.width, ATTACHMENT_MAX_HEIGHT / a.height) : 1;
        const width = a.width ? Math.round(a.width * scale) : ATTACHMENT_MAX_WIDTH;
        const height = a.height ? Math.round(a.height * scale) : ATTACHMENT_MAX_HEIGHT;
        return (
          <Pressable key={a.id} disabled={isVideo} onPress={() => setPreviewUri(a.downloadUrl)}>
            {isVideo ? (
              <InlineVideoThumb uri={a.downloadUrl} style={[styles.attachment, { width, height, backgroundColor: tokens['surface-2'] }]} />
            ) : (
              <Image source={{ uri: a.downloadUrl }} style={[styles.attachment, { width, height, backgroundColor: tokens['surface-2'] }]} resizeMode="cover" />
            )}
          </Pressable>
        );
      })}
      {previewUri && <ImageLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => pressed && { opacity: 0.65 }}>
      <Text style={{ color: tokens.muted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  author: { fontSize: 13, fontWeight: '700' },
  time: { fontSize: 12 },
  answerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 4,
    paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999,
  },
  body: { marginTop: 6, marginLeft: 32 },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  attachment: { borderRadius: 10 },
  editInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 13.5, minHeight: 60, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  smallBtn: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14, rowGap: 8, marginTop: 8, marginLeft: 32 },
  ellipsisBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
});
