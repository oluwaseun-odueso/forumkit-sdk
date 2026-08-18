import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import {
  getThread, createReply, voteOnThread, removeVoteFromThread, voteOnComment, removeVoteFromComment,
  saveComment, unsaveComment, commentsToCommentTree, filterComments, fmtRelativeTime,
  type CommentNode,
} from '@forumkit/shared';
import type { Thread, Comment, VoteDirection } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import { applyVote, nextVoteDir } from '../lib/vote';
import Shell from '../navigation/Shell';
import Avatar from '../components/Avatar';
import Thumbnail from '../components/Thumbnail';
import VotePill from '../components/VotePill';
import CommentPill from '../components/CommentPill';
import BackRow from '../components/BackRow';
import { SelectPill } from '../components/SelectPill';
import { SearchIcon } from '../components/icons';
import AiRow from '../thread/AiRow';
import CommentComposer from '../thread/CommentComposer';
import CommentRow from '../thread/CommentRow';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Thread detail — mirrors sdk-web thread-view.tsx (README §8), wired to the live
// API via getThread. Post + comment vote and comment save are optimistic; the
// composer posts a real reply. AI row is UI-only (see AiRow). Markdown body
// rendering, edit/delete/accept/share, and image posting are deferred.

type CommentSortOption = 'Best' | 'Top' | 'Controversial' | 'Old';
const COMMENT_SORTS = ['Best', 'Top', 'Controversial', 'Old'] as const;

function sortRoots(nodes: CommentNode[], sort: CommentSortOption): CommentNode[] {
  const copy = [...nodes];
  switch (sort) {
    case 'Best':
    case 'Top':
      return copy.sort((a, b) => b.votes - a.votes);
    case 'Controversial':
      return copy.sort((a, b) => (b.voteCounts.up + b.voteCounts.down) - (a.voteCounts.up + a.voteCounts.down));
    case 'Old':
    default:
      return copy; // fetch order is created_at ASC
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

  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<CommentSortOption>('Best');
  const [search, setSearch] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);

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

  function votePost(dir: VoteDirection) {
    if (!token || !thread) return;
    const oldDir = thread.myVote ?? null;
    const newDir = nextVoteDir(oldDir, dir);
    const prev = thread.voteCounts ?? { up: 0, down: 0 };
    setThread(t => (t ? { ...t, myVote: newDir, voteCounts: applyVote(t.voteCounts ?? { up: 0, down: 0 }, oldDir, newDir) } : t));
    const req = newDir === null
      ? removeVoteFromThread(apiUrl, forumId, threadId, token)
      : voteOnThread(apiUrl, forumId, threadId, newDir, token);
    req
      .then(r => setThread(t => (t ? { ...t, myVote: r.myVote, voteCounts: r.voteCounts } : t)))
      .catch(() => setThread(t => (t ? { ...t, myVote: oldDir, voteCounts: prev } : t)));
  }

  function voteCommentFn(commentId: string, dir: VoteDirection) {
    if (!token) return;
    const c = comments.find(x => x.id === commentId);
    if (!c) return;
    const oldDir = c.myVote ?? null;
    const newDir = nextVoteDir(oldDir, dir);
    const prev = c.voteCounts ?? { up: 0, down: 0 };
    setComments(cs => cs.map(x => (x.id === commentId ? { ...x, myVote: newDir, voteCounts: applyVote(x.voteCounts ?? { up: 0, down: 0 }, oldDir, newDir) } : x)));
    const req = newDir === null
      ? removeVoteFromComment(apiUrl, threadId, commentId, token)
      : voteOnComment(apiUrl, threadId, commentId, newDir, token);
    req
      .then(r => setComments(cs => cs.map(x => (x.id === commentId ? { ...x, myVote: r.myVote, voteCounts: r.voteCounts } : x))))
      .catch(() => setComments(cs => cs.map(x => (x.id === commentId ? { ...x, myVote: oldDir, voteCounts: prev } : x))));
  }

  function saveCommentFn(commentId: string, save: boolean) {
    if (!token) return;
    setComments(cs => cs.map(x => (x.id === commentId ? { ...x, isSaved: save } : x)));
    const req = save ? saveComment(apiUrl, threadId, commentId, token) : unsaveComment(apiUrl, threadId, commentId, token);
    req.catch(() => setComments(cs => cs.map(x => (x.id === commentId ? { ...x, isSaved: !save } : x))));
  }

  async function submitComment() {
    if (!token || !commentInput.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created = await createReply(apiUrl, threadId, { body: commentInput.trim(), parentCommentId: replyTo?.id }, token);
      setComments(cs => [...cs, created]);
      setCommentInput('');
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  const heroImage = (thread?.attachments ?? []).find(a => a.mimeType.startsWith('image/'))?.downloadUrl ?? null;

  return (
    <Shell>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={tokens.accent} /></View>
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

          <Text style={[styles.title, { color: tokens.text }]}>{thread.title}</Text>
          {thread.body.trim().length > 0 && (
            <Text style={[styles.body, { color: tokens['text-2'] }]}>{thread.body}</Text>
          )}
          {heroImage != null && <Thumbnail imageUrl={heroImage} aspectRatio={16 / 10} radius={14} style={{ marginBottom: 16 }} />}

          <View style={styles.actions}>
            <VotePill voteCounts={thread.voteCounts ?? { up: 0, down: 0 }} dir={thread.myVote ?? null} onVote={votePost} />
            <CommentPill count={thread.commentCount ?? comments.length} />
          </View>

          <AiRow />

          {replyTo && (
            <View style={styles.replyingTo}>
              <Text style={{ color: tokens.muted, fontSize: 12 }}>Replying to {replyTo.author}</Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={6}>
                <Text style={{ color: tokens.accent, fontSize: 12, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>
          )}
          <CommentComposer
            value={commentInput}
            onChangeText={setCommentInput}
            onSubmit={submitComment}
            submitting={submitting}
            placeholder={replyTo ? `Reply to ${replyTo.author}` : 'Add a comment'}
          />

          <View style={styles.sortRow}>
            <SelectPill<CommentSortOption> value={commentSort} options={COMMENT_SORTS} onChange={setCommentSort} label={commentSort} menuWidth={160} />
            <View style={[styles.searchPill, { borderColor: tokens['border-strong'] }]}>
              <SearchIcon size={15} color={tokens.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search Comments"
                placeholderTextColor={tokens.muted}
                style={{ flex: 1, color: tokens.text, fontSize: 13, padding: 0 }}
              />
            </View>
          </View>

          {tree.map(node => (
            <CommentRow key={node.id} node={node} onVote={voteCommentFn} onSave={saveCommentFn} onReply={setReplyTo} />
          ))}
        </ScrollView>
      ) : null}
    </Shell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 110 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, marginBottom: 8 },
  author: { fontSize: 13, fontWeight: '700' },
  time: { fontSize: 13 },
  title: { fontSize: 20, fontWeight: '800', lineHeight: 26, marginBottom: 10 },
  body: { fontSize: 14.5, lineHeight: 23, marginBottom: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  replyingTo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: -8 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 4 },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
});
