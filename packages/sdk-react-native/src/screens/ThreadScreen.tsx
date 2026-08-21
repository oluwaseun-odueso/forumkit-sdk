import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import {
  getThread, createReply, updateReply, deleteComment, acceptAnswer, unacceptAnswer,
  updateThread, deleteThread, reportThread, reportComment, shareThreadWithUsers,
  voteOnThread, removeVoteFromThread, voteOnComment, removeVoteFromComment,
  saveComment, unsaveComment, commentsToCommentTree, filterComments, fmtRelativeTime,
  type CommentNode,
} from '@forumkit/shared';
import type { Thread, Comment, VoteDirection } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import { applyVote, nextVoteDir } from '../lib/vote';
import Shell from '../navigation/Shell';
import Avatar from '../components/Avatar';
import Mascot from '../components/Mascot';
import MediaGallery from '../components/MediaGallery';
import VotePill from '../components/VotePill';
import CommentPill from '../components/CommentPill';
import BackRow from '../components/BackRow';
import RenderedBody from '../components/RenderedBody';
import ConfirmDialog from '../components/ConfirmDialog';
import ReportSheet from '../components/ReportSheet';
import ShareSheet from '../components/ShareSheet';
import { SelectPill } from '../components/SelectPill';
import { SearchIcon, RocketIcon, TopIcon, ControversialIcon, OldIcon } from '../components/icons';
import AiRow from '../thread/AiRow';
import CommentComposer from '../thread/CommentComposer';
import CommentRow, { type CommentCtx } from '../thread/CommentRow';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Thread detail — mirrors sdk-web thread-view.tsx (README §8), wired to the live
// API. Post/comment vote + comment save are optimistic; the composer posts real
// replies (with media). Full interactions: nested replies, comment + post edit/
// delete, accept-answer, report, and in-app member share. AI row stays UI-only.

type CommentSortOption = 'Best' | 'Top' | 'Controversial' | 'Old';
const COMMENT_SORTS = ['Best', 'Top', 'Controversial', 'Old'] as const;
const COMMENT_SORT_ICON: Record<CommentSortOption, React.ComponentType<{ size?: number; color?: string }>> = {
  Best: RocketIcon, Top: TopIcon, Controversial: ControversialIcon, Old: OldIcon,
};
type ReportTarget = { kind: 'post' | 'comment'; id: string } | null;
type ShareTarget = { kind: 'post' | 'comment'; id: string } | null;

function sortRoots(nodes: CommentNode[], sort: CommentSortOption): CommentNode[] {
  const copy = [...nodes];
  switch (sort) {
    case 'Best':
    case 'Top': return copy.sort((a, b) => b.votes - a.votes);
    case 'Controversial': return copy.sort((a, b) => (b.voteCounts.up + b.voteCounts.down) - (a.voteCounts.up + a.voteCounts.down));
    case 'Old': default: return copy;
  }
}

export default function ThreadScreen() {
  const { tokens } = useTheme();
  const session = useSession();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Thread'>>();
  const threadId = route.params.threadId;
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;
  const currentUserId = session.status === 'ready' ? session.userId : null;
  const isModerator = session.status === 'ready' && (session.role === 'moderator' || session.role === 'admin');

  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<CommentSortOption>('Best');
  const [search, setSearch] = useState('');
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget>(null);
  const [postEditOpen, setPostEditOpen] = useState(false);
  const [postEditTitle, setPostEditTitle] = useState('');
  const [postEditBody, setPostEditBody] = useState('');
  const [postDeleteOpen, setPostDeleteOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getThread(apiUrl, forumId, threadId, token)
      .then(res => { if (!cancelled) { setThread(res.thread); setComments(res.comments); } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load thread'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, threadId, token]);

  const tree = useMemo(() => {
    const built = commentsToCommentTree(comments);
    const filtered = search.trim() ? filterComments(built, search.trim()) : built;
    return sortRoots(filtered, commentSort);
  }, [comments, search, commentSort]);

  const canModifyPost = currentUserId !== null && thread !== null && (thread.authorId === currentUserId || isModerator);
  const canAcceptAnswer = canModifyPost; // thread author or moderator

  function votePost(dir: VoteDirection) {
    if (!token || !thread) return;
    const oldDir = thread.myVote ?? null;
    const newDir = nextVoteDir(oldDir, dir);
    const prev = thread.voteCounts ?? { up: 0, down: 0 };
    setThread(t => (t ? { ...t, myVote: newDir, voteCounts: applyVote(t.voteCounts ?? { up: 0, down: 0 }, oldDir, newDir) } : t));
    const req = newDir === null ? removeVoteFromThread(apiUrl, forumId, threadId, token) : voteOnThread(apiUrl, forumId, threadId, newDir, token);
    req.then(r => setThread(t => (t ? { ...t, myVote: r.myVote, voteCounts: r.voteCounts } : t)))
      .catch(() => setThread(t => (t ? { ...t, myVote: oldDir, voteCounts: prev } : t)));
  }

  const ctx: CommentCtx = {
    apiUrl, forumId, token, currentUserId, isModerator, canAcceptAnswer,
    onVote(commentId, dir) {
      if (!token) return;
      const c = comments.find(x => x.id === commentId);
      if (!c) return;
      const oldDir = c.myVote ?? null;
      const newDir = nextVoteDir(oldDir, dir);
      const prev = c.voteCounts ?? { up: 0, down: 0 };
      setComments(cs => cs.map(x => (x.id === commentId ? { ...x, myVote: newDir, voteCounts: applyVote(x.voteCounts ?? { up: 0, down: 0 }, oldDir, newDir) } : x)));
      const req = newDir === null ? removeVoteFromComment(apiUrl, threadId, commentId, token) : voteOnComment(apiUrl, threadId, commentId, newDir, token);
      req.then(r => setComments(cs => cs.map(x => (x.id === commentId ? { ...x, myVote: r.myVote, voteCounts: r.voteCounts } : x))))
        .catch(() => setComments(cs => cs.map(x => (x.id === commentId ? { ...x, myVote: oldDir, voteCounts: prev } : x))));
    },
    onSave(commentId, save) {
      if (!token) return;
      setComments(cs => cs.map(x => (x.id === commentId ? { ...x, isSaved: save } : x)));
      const req = save ? saveComment(apiUrl, threadId, commentId, token) : unsaveComment(apiUrl, threadId, commentId, token);
      req.catch(() => setComments(cs => cs.map(x => (x.id === commentId ? { ...x, isSaved: !save } : x))));
    },
    async onReplySubmit(parentId, body, attachmentIds) {
      if (!token) return;
      const created = await createReply(apiUrl, threadId, { body, parentCommentId: parentId, attachmentIds }, token);
      setComments(cs => [...cs, created]);
    },
    async onEdit(commentId, body) {
      if (!token) return;
      const updated = await updateReply(apiUrl, threadId, commentId, body, token);
      setComments(cs => cs.map(x => (x.id === commentId ? updated : x)));
    },
    onDelete(commentId) {
      if (!token) return;
      setComments(cs => cs.filter(x => x.id !== commentId));
      void deleteComment(apiUrl, threadId, commentId, token).catch(() => { /* best effort */ });
    },
    onAccept(commentId, accepted) {
      if (!token) return;
      setComments(cs => cs.map(x => ({ ...x, isAcceptedAnswer: x.id === commentId ? accepted : false })));
      const req = accepted ? acceptAnswer(apiUrl, threadId, commentId, token) : unacceptAnswer(apiUrl, threadId, commentId, token);
      void req.catch(() => { /* best effort; refetch would reconcile */ });
    },
    onReport(commentId) { setReportTarget({ kind: 'comment', id: commentId }); },
    onShare(commentId) { setShareTarget({ kind: 'comment', id: commentId }); },
  };

  async function submitTopLevel(body: string, attachmentIds: string[]) {
    if (!token) return;
    const created = await createReply(apiUrl, threadId, { body, attachmentIds }, token);
    setComments(cs => [...cs, created]);
  }

  async function savePostEdit() {
    if (!token || !thread) return;
    const updated = await updateThread(apiUrl, forumId, threadId, { title: postEditTitle.trim(), body: postEditBody.trim() }, token);
    setThread(updated);
    setPostEditOpen(false);
  }

  function submitReport(reason: string) {
    if (!token || !reportTarget) return;
    const req = reportTarget.kind === 'post'
      ? reportThread(apiUrl, forumId, reportTarget.id, reason, token)
      : reportComment(apiUrl, threadId, reportTarget.id, reason, token);
    void req.catch(() => { /* best effort */ });
  }

  function submitShare(recipientIds: string[]) {
    if (!token || !shareTarget || recipientIds.length === 0) return;
    // Comments share their thread (there's no per-comment share endpoint).
    void shareThreadWithUsers(apiUrl, forumId, threadId, recipientIds, undefined, token).catch(() => { /* best effort */ });
  }

  const media = thread?.attachments ?? [];

  return (
    <Shell>
      {loading ? (
        <View style={styles.center}><Mascot size={36} /></View>
      ) : error && !thread ? (
        <View style={styles.center}><Text style={{ color: tokens['text-2'] }}>{error}</Text></View>
      ) : thread ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BackRow onPress={() => navigation.goBack()} />

          <View style={styles.head}>
            <Avatar authorId={thread.authorId} author={thread.authorDisplayName ?? 'Member'} avatarUrl={thread.authorAvatarUrl} size={26} />
            <Text style={[styles.author, { color: tokens.text }]}>{thread.authorDisplayName ?? 'Member'}</Text>
            <Text style={[styles.time, { color: tokens.muted }]}>· {fmtRelativeTime(thread.createdAt)}</Text>
          </View>

          {postEditOpen ? (
            <View style={{ marginBottom: 12 }}>
              <TextInput value={postEditTitle} onChangeText={setPostEditTitle} style={[styles.editInput, { color: tokens.text, borderColor: tokens['border-strong'], fontWeight: '700' }]} />
              <TextInput value={postEditBody} onChangeText={setPostEditBody} multiline style={[styles.editInput, { color: tokens.text, borderColor: tokens['border-strong'], minHeight: 100, marginTop: 8 }]} />
              <View style={styles.editActions}>
                <Pressable onPress={() => setPostEditOpen(false)} style={[styles.smallBtn, { backgroundColor: tokens['surface-2'] }]}><Text style={{ color: tokens['text-2'], fontWeight: '700', fontSize: 13 }}>Cancel</Text></Pressable>
                <Pressable onPress={savePostEdit} style={[styles.smallBtn, { backgroundColor: tokens.accent }]}><Text style={{ color: tokens['accent-fg'], fontWeight: '700', fontSize: 13 }}>Save</Text></Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: tokens.text }]}>{thread.title}</Text>
              {thread.body.trim().length > 0 && (
                <View style={{ marginBottom: 16 }}><RenderedBody body={thread.body} size={14.5} /></View>
              )}
              <MediaGallery attachments={media} aspectRatio={4 / 5} radius={14} />
            </>
          )}

          <View style={styles.actions}>
            <VotePill voteCounts={thread.voteCounts ?? { up: 0, down: 0 }} dir={thread.myVote ?? null} onVote={votePost} />
            <CommentPill count={thread.commentCount ?? comments.length} />
            <View style={{ flex: 1 }} />
            <PostAction label="Share" onPress={() => setShareTarget({ kind: 'post', id: threadId })} />
            {canModifyPost && !postEditOpen && (
              <PostAction label="Edit" onPress={() => { setPostEditTitle(thread.title); setPostEditBody(thread.body); setPostEditOpen(true); }} />
            )}
            {canModifyPost && <PostAction label="Delete" danger onPress={() => setPostDeleteOpen(true)} />}
          </View>

          <AiRow />

          <CommentComposer apiUrl={apiUrl} forumId={forumId} token={token} onSubmit={submitTopLevel} />

          <View style={styles.sortRow}>
            <SelectPill<CommentSortOption>
              value={commentSort}
              options={COMMENT_SORTS}
              onChange={setCommentSort}
              label={commentSort}
              menuWidth={160}
              optionIcon={s => { const Icon = COMMENT_SORT_ICON[s]; return <Icon size={16} color={tokens['text-2']} />; }}
            />
            <View style={[styles.searchPill, { borderColor: tokens['border-strong'] }]}>
              <SearchIcon size={15} color={tokens.muted} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search Comments" placeholderTextColor={tokens.muted} style={{ flex: 1, color: tokens.text, fontSize: 13, padding: 0 }} />
            </View>
          </View>

          {tree.map(node => <CommentRow key={node.id} node={node} ctx={ctx} />)}
        </ScrollView>
      ) : null}

      {reportTarget && (
        <ReportSheet target={reportTarget.kind} onClose={() => setReportTarget(null)} onSubmit={submitReport} />
      )}
      {shareTarget && (
        <ShareSheet apiUrl={apiUrl} forumId={forumId} token={token} onClose={() => setShareTarget(null)} onShare={submitShare} />
      )}
      {postDeleteOpen && (
        <ConfirmDialog
          title="Delete post?"
          message="This can't be undone. The post and its comments will be permanently removed."
          onCancel={() => setPostDeleteOpen(false)}
          onConfirm={() => {
            setPostDeleteOpen(false);
            if (token) void deleteThread(apiUrl, forumId, threadId, token).then(() => navigation.goBack()).catch(() => { /* best effort */ });
          }}
        />
      )}
    </Shell>
  );
}

function PostAction({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6} style={{ marginLeft: 14 }}>
      <Text style={{ color: danger ? tokens.danger : tokens['text-2'], fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 110 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, marginBottom: 8 },
  author: { fontSize: 13, fontWeight: '700' },
  time: { fontSize: 13 },
  title: { fontSize: 20, fontWeight: '800', lineHeight: 26, marginBottom: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 4 },
  searchPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  editInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14.5, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  smallBtn: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
});
