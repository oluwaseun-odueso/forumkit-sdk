import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import {
  listThreads, saveThread, unsaveThread, voteOnThread, removeVoteFromThread, reportThread,
  shareThreadWithUsers, threadToFeedRow, type FeedRow, type ListThreadsParams,
} from '@forumkit/shared';
import type { VoteDirection } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import { applyVote, nextVoteDir } from '../lib/vote';
import Shell from '../navigation/Shell';
import PostRow from '../feed/PostRow';
import { SelectPill } from '../components/SelectPill';
import { RocketIcon, FlameIcon, FreshIcon, TopIcon, RisingIcon } from '../components/icons';
import Mascot from '../components/Mascot';
import ReportSheet from '../components/ReportSheet';
import ShareSheet from '../components/ShareSheet';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Feed screen (README §6) wired to the live API: fetches the thread list with
// the session token, maps each Thread to the shared FeedRow, and renders the
// sort/view controls + a list of PostRows. Save/vote are optimistic and revert
// on failure. Thread/composer/etc. are still placeholders reached via nav.

type SortOption = 'Best' | 'Hot' | 'New' | 'Top' | 'Rising';

const SORT_OPTIONS = ['Best', 'Hot', 'New', 'Top', 'Rising'] as const;
const SORT_QUERY: Record<SortOption, NonNullable<ListThreadsParams['sort']>> = {
  Best: 'best', Hot: 'hot', New: 'new', Top: 'top', Rising: 'rising',
};
const SORT_ICON: Record<SortOption, React.ComponentType<{ size?: number; color?: string }>> = {
  Best: RocketIcon, Hot: FlameIcon, New: FreshIcon, Top: TopIcon, Rising: RisingIcon,
};

export default function FeedScreen() {
  const { tokens } = useTheme();
  const session = useSession();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [sort, setSort] = useState<SortOption>('Best');
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);

  const route = useRoute<RouteProp<RootStackParamList, 'Feed'>>();
  const scope = route.params?.scope ?? 'home';

  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  // Popular seeds the sort to Hot; the sort selector then controls it freely on
  // every scope. News additionally filters to the "news" tag.
  useEffect(() => { if (scope === 'popular') setSort('Hot'); }, [scope]);

  const load = useCallback(async (s: SortOption) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listThreads(apiUrl, forumId, token, {
        sort: SORT_QUERY[s],
        tagName: scope === 'news' ? 'news' : undefined,
        limit: 25,
      });
      setRows(res.threads.map(threadToFeedRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, forumId, token, scope]);

  useEffect(() => { void load(sort); }, [load, sort]);

  const updateRow = useCallback((id: string, fn: (r: FeedRow) => FeedRow) => {
    setRows(prev => prev.map(r => (r.id === id ? fn(r) : r)));
  }, []);

  const onVote = useCallback((row: FeedRow, dir: VoteDirection) => {
    if (!token) return;
    const oldDir = row.myVote;
    const newDir = nextVoteDir(oldDir, dir);
    const prevCounts = row.voteCounts;
    updateRow(row.id, r => ({ ...r, myVote: newDir, voteCounts: applyVote(r.voteCounts, oldDir, newDir) }));
    const req = newDir === null
      ? removeVoteFromThread(apiUrl, forumId, row.id, token)
      : voteOnThread(apiUrl, forumId, row.id, newDir, token);
    req
      .then(res => updateRow(row.id, r => ({ ...r, myVote: res.myVote, voteCounts: res.voteCounts })))
      .catch(() => updateRow(row.id, r => ({ ...r, myVote: oldDir, voteCounts: prevCounts })));
  }, [apiUrl, forumId, token, updateRow]);

  const onSave = useCallback((row: FeedRow) => {
    if (!token) return;
    const newSaved = !row.saved;
    updateRow(row.id, r => ({ ...r, saved: newSaved }));
    const req = newSaved
      ? saveThread(apiUrl, forumId, row.id, token)
      : unsaveThread(apiUrl, forumId, row.id, token);
    req.catch(() => updateRow(row.id, r => ({ ...r, saved: !newSaved })));
  }, [apiUrl, forumId, token, updateRow]);

  const submitReport = useCallback((reason: string) => {
    if (!token || !reportId) return;
    void reportThread(apiUrl, forumId, reportId, reason, token).catch(() => { /* best effort */ });
  }, [apiUrl, forumId, token, reportId]);

  const submitShare = useCallback((recipientIds: string[]) => {
    if (!token || !shareId || recipientIds.length === 0) return;
    void shareThreadWithUsers(apiUrl, forumId, shareId, recipientIds, undefined, token).catch(() => { /* best effort */ });
  }, [apiUrl, forumId, token, shareId]);

  const controls = (
    <View style={styles.controls}>
      <SelectPill<SortOption>
        value={sort}
        options={SORT_OPTIONS}
        onChange={setSort}
        label={sort}
        optionIcon={s => { const Icon = SORT_ICON[s]; return <Icon size={16} color={tokens['text-2']} />; }}
      />
    </View>
  );

  return (
    <Shell>
      {loading && rows.length === 0 ? (
        <View style={styles.center}><Mascot size={36} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: tokens['text-2'], fontSize: 14 }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={r => r.id}
          ListHeaderComponent={controls}
          renderItem={({ item }) => (
            <PostRow
              row={item}
              view="card"
              onOpen={() => navigation.navigate('Thread', { threadId: item.id })}
              onVote={dir => onVote(item, dir)}
              onSave={() => onSave(item)}
              onReport={() => setReportId(item.id)}
              onShare={() => setShareId(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: tokens['text-2'], fontSize: 14 }}>No posts yet</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {reportId && (
        <ReportSheet target="post" onClose={() => setReportId(null)} onSubmit={submitReport} />
      )}
      {shareId && (
        <ShareSheet apiUrl={apiUrl} forumId={forumId} token={token} onClose={() => setShareId(null)} onShare={submitShare} />
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
});
