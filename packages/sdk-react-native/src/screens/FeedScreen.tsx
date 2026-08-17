import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  listThreads, saveThread, unsaveThread, voteOnThread, removeVoteFromThread, reportThread,
  threadToFeedRow, type FeedRow, type ListThreadsParams,
} from '@forumkit/shared';
import type { VoteCounts, VoteDirection } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Shell from '../navigation/Shell';
import PostRow from '../feed/PostRow';
import { SelectPill } from '../components/SelectPill';
import { CardViewIcon, CompactViewIcon } from '../components/icons';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Feed screen (README §6) wired to the live API: fetches the thread list with
// the session token, maps each Thread to the shared FeedRow, and renders the
// sort/view controls + a list of PostRows. Save/vote are optimistic and revert
// on failure. Thread/composer/etc. are still placeholders reached via nav.

type SortOption = 'Best' | 'Hot' | 'New' | 'Top' | 'Rising';
type ViewOption = 'card' | 'compact';

const SORT_OPTIONS = ['Best', 'Hot', 'New', 'Top', 'Rising'] as const;
const VIEW_OPTIONS = ['card', 'compact'] as const;
const SORT_QUERY: Record<SortOption, NonNullable<ListThreadsParams['sort']>> = {
  Best: 'best', Hot: 'hot', New: 'new', Top: 'top', Rising: 'rising',
};

// Adjust the up/down counts for a vote transition (old direction -> new).
function applyVote(vc: VoteCounts, oldDir: VoteDirection | null, newDir: VoteDirection | null): VoteCounts {
  return {
    up: vc.up - (oldDir === 1 ? 1 : 0) + (newDir === 1 ? 1 : 0),
    down: vc.down - (oldDir === -1 ? 1 : 0) + (newDir === -1 ? 1 : 0),
  };
}

export default function FeedScreen() {
  const { tokens } = useTheme();
  const session = useSession();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [sort, setSort] = useState<SortOption>('Best');
  const [view, setView] = useState<ViewOption>('card');
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const load = useCallback(async (s: SortOption) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listThreads(apiUrl, forumId, token, { sort: SORT_QUERY[s], limit: 25 });
      setRows(res.threads.map(threadToFeedRow));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, forumId, token]);

  useEffect(() => { void load(sort); }, [load, sort]);

  const updateRow = useCallback((id: string, fn: (r: FeedRow) => FeedRow) => {
    setRows(prev => prev.map(r => (r.id === id ? fn(r) : r)));
  }, []);

  const onVote = useCallback((row: FeedRow, dir: VoteDirection) => {
    if (!token) return;
    const oldDir = row.myVote;
    const newDir: VoteDirection | null = oldDir === dir ? null : dir;
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

  const onReport = useCallback((row: FeedRow) => {
    if (!token) return;
    // Placeholder reason — the full report UI (reason picker) is a later shared step.
    reportThread(apiUrl, forumId, row.id, 'Reported from mobile', token).catch(() => { /* best effort */ });
  }, [apiUrl, forumId, token]);

  const controls = (
    <View style={styles.controls}>
      <SelectPill<SortOption> value={sort} options={SORT_OPTIONS} onChange={setSort} label={sort} />
      <SelectPill<ViewOption>
        value={view}
        options={VIEW_OPTIONS}
        onChange={setView}
        optionLabel={v => (v === 'card' ? 'Card' : 'Compact')}
        leadingIcon={view === 'card'
          ? <CardViewIcon size={16} color={tokens['text-2']} />
          : <CompactViewIcon size={16} color={tokens['text-2']} />}
        menuWidth={140}
      />
    </View>
  );

  return (
    <Shell>
      {loading && rows.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={tokens.accent} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: tokens['text-2'], fontSize: 14 }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          extraData={view}
          keyExtractor={r => r.id}
          ListHeaderComponent={controls}
          renderItem={({ item }) => (
            <PostRow
              row={item}
              view={view}
              onOpen={() => navigation.navigate('Thread', { threadId: item.id })}
              onVote={dir => onVote(item, dir)}
              onSave={() => onSave(item)}
              onReport={() => onReport(item)}
              onShare={() => { /* share sheet — later step */ }}
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
