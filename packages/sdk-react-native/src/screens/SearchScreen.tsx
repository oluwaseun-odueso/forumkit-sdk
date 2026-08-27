import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { searchThreads, searchComments, searchUsers, fmtRelativeTime } from '@forumkit/shared';
import type { SearchResult, CommentSearchResult, UserSearchResult } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Shell from '../navigation/Shell';
import { useScrollCollapse } from '../lib/useScrollCollapse';
import Avatar from '../components/Avatar';
import Mascot from '../components/Mascot';
import Thumbnail from '../components/Thumbnail';
import TabPills from '../components/TabPills';
import { ChevronRightIcon } from '../components/icons';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Tab = 'All' | 'Threads' | 'Comments' | 'Profiles' | 'Media';
const TABS: readonly Tab[] = ['All', 'Threads', 'Comments', 'Profiles', 'Media'];
const PREVIEW_LIMIT = 5;
const FULL_LIMIT = 20;

function ThreadRow({ r, onPress }: { r: SearchResult; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: tokens.border }]}>
      <View style={styles.rowHead}>
        <Avatar authorId={r.authorId} author={r.authorDisplayName} avatarUrl={r.authorAvatarUrl} size={20} />
        <Text style={[styles.author, { color: tokens.text }]}>{r.authorDisplayName}</Text>
        <Text style={[styles.time, { color: tokens.muted }]}>· {fmtRelativeTime(r.createdAt)}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: tokens.text }]} numberOfLines={2}>{r.title}</Text>
          {r.bodySnippet ? <Text style={[styles.snippet, { color: tokens['text-2'] }]} numberOfLines={2}>{r.bodySnippet}</Text> : null}
          <Text style={[styles.meta, { color: tokens.muted }]}>
            {r.voteCounts.up - r.voteCounts.down} votes · {r.commentCount} comments
          </Text>
        </View>
        {r.imageUrl != null && <Thumbnail imageUrl={r.imageUrl} square={64} radius={10} />}
      </View>
    </Pressable>
  );
}

function CommentResultRow({ r, onPress }: { r: CommentSearchResult; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: tokens.border }]}>
      <View style={styles.rowHead}>
        <Avatar authorId={r.authorId} author={r.authorDisplayName} avatarUrl={r.authorAvatarUrl} size={20} />
        <Text style={[styles.author, { color: tokens.text }]}>{r.authorDisplayName}</Text>
        <Text style={[styles.time, { color: tokens.muted }]}>· {fmtRelativeTime(r.createdAt)}</Text>
      </View>
      <Text style={[styles.snippet, { color: tokens['text-2'] }]} numberOfLines={3}>{r.bodySnippet}</Text>
      <Text style={[styles.meta, { color: tokens.muted }]} numberOfLines={1}>in: {r.threadTitle}</Text>
    </Pressable>
  );
}

function ProfileRow({ r }: { r: UserSearchResult }) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: tokens.border }]}>
      <View style={styles.profileRow}>
        <Avatar authorId={r.id} author={r.displayName} avatarUrl={r.avatarUrl} size={36} />
        <View>
          <Text style={[styles.author, { color: tokens.text, fontSize: 14 }]}>{r.displayName}</Text>
          <Text style={[styles.meta, { color: tokens.muted, marginTop: 2 }]}>{r.karma} karma</Text>
        </View>
      </View>
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  const { tokens } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionTitle, { color: tokens.text }]}>{title}</Text>
      <Pressable onPress={onSeeAll} hitSlop={8}>
        <ChevronRightIcon size={16} color={tokens.accent} />
      </Pressable>
    </View>
  );
}

function SearchBody() {
  const { tokens } = useTheme();
  const onScroll = useScrollCollapse();
  const session = useSession();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Search'>>();
  const query = route.params.query;
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const [tab, setTab] = useState<Tab>('All');
  const [threads, setThreads] = useState<SearchResult[]>([]);
  const [comments, setComments] = useState<CommentSearchResult[]>([]);
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  // Load preview results for all tabs simultaneously on mount / query change
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setTab('All');
    Promise.all([
      searchThreads(apiUrl, forumId, query, { limit: PREVIEW_LIMIT }, token),
      searchComments(apiUrl, forumId, query, { limit: PREVIEW_LIMIT }, token),
      searchUsers(apiUrl, forumId, query, { limit: PREVIEW_LIMIT }, token),
    ]).then(([t, c, u]) => {
      if (cancelled) return;
      setThreads(t.results);
      setComments(c.results);
      setUsers(u.results);
    }).catch(() => {
      if (!cancelled) { setThreads([]); setComments([]); setUsers([]); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, query, token]);

  // Fetch the full list (limit 20) when the user switches to a specific tab
  const loadFull = (type: 'Threads' | 'Comments' | 'Profiles') => {
    if (!token) return;
    if (type === 'Threads') {
      searchThreads(apiUrl, forumId, query, { limit: FULL_LIMIT }, token)
        .then(r => setThreads(r.results)).catch(() => {});
    } else if (type === 'Comments') {
      searchComments(apiUrl, forumId, query, { limit: FULL_LIMIT }, token)
        .then(r => setComments(r.results)).catch(() => {});
    } else {
      searchUsers(apiUrl, forumId, query, { limit: FULL_LIMIT }, token)
        .then(r => setUsers(r.results)).catch(() => {});
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === 'Threads') loadFull('Threads');
    else if (t === 'Comments') loadFull('Comments');
    else if (t === 'Profiles') loadFull('Profiles');
  };

  // Media is a client-side filter — no extra fetch needed
  const mediaThreads = threads.filter(r => r.imageUrl != null);

  const showThreads = tab === 'All' || tab === 'Threads';
  const showComments = tab === 'All' || tab === 'Comments';
  const showProfiles = tab === 'All' || tab === 'Profiles';
  const showMedia = tab === 'All' || tab === 'Media';

  return (
    <ScrollView contentContainerStyle={styles.content} onScroll={onScroll} scrollEventThrottle={16}>
      <TabPills tabs={TABS} active={tab} onSelect={t => switchTab(t as Tab)} />
      <View style={[styles.divider, { backgroundColor: tokens.border }]} />

      {loading ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}><Mascot size={32} /></View>
      ) : (
        <>
          {showThreads && (
            <>
              {tab === 'All' && <SectionHeader title="Threads" onSeeAll={() => switchTab('Threads')} />}
              {threads.length === 0
                ? tab !== 'All' && <Text style={[styles.empty, { color: tokens['text-2'] }]}>No thread results</Text>
                : threads.map(r => (
                    <ThreadRow key={r.threadId} r={r} onPress={() => navigation.navigate('Thread', { threadId: r.threadId })} />
                  ))
              }
            </>
          )}

          {showComments && (
            <>
              {tab === 'All' && <SectionHeader title="Comments" onSeeAll={() => switchTab('Comments')} />}
              {comments.length === 0
                ? tab !== 'All' && <Text style={[styles.empty, { color: tokens['text-2'] }]}>No comment results</Text>
                : comments.map(r => (
                    <CommentResultRow key={r.commentId} r={r} onPress={() => navigation.navigate('Thread', { threadId: r.threadId })} />
                  ))
              }
            </>
          )}

          {showProfiles && (
            <>
              {tab === 'All' && <SectionHeader title="Profiles" onSeeAll={() => switchTab('Profiles')} />}
              {users.length === 0
                ? tab !== 'All' && <Text style={[styles.empty, { color: tokens['text-2'] }]}>No profile results</Text>
                : users.map(r => <ProfileRow key={r.id} r={r} />)
              }
            </>
          )}

          {showMedia && (
            <>
              {tab === 'All' && <SectionHeader title="Media" onSeeAll={() => switchTab('Media')} />}
              {mediaThreads.length === 0
                ? tab !== 'All' && <Text style={[styles.empty, { color: tokens['text-2'] }]}>No media results</Text>
                : (
                  <View style={styles.mediaGrid}>
                    {mediaThreads.map(r => (
                      <Pressable
                        key={r.threadId}
                        style={styles.mediaCell}
                        onPress={() => navigation.navigate('Thread', { threadId: r.threadId })}
                      >
                        <Thumbnail imageUrl={r.imageUrl!} radius={10} style={{ width: '100%', aspectRatio: 1 }} />
                      </Pressable>
                    ))}
                  </View>
                )
              }
            </>
          )}

          {tab === 'All' && !loading && threads.length === 0 && comments.length === 0 && users.length === 0 && (
            <Text style={[styles.empty, { color: tokens['text-2'] }]}>No results for "{query}"</Text>
          )}
        </>
      )}
    </ScrollView>
  );
}

export default function SearchScreen() {
  return <Shell><SearchBody /></Shell>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 110 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 8 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: 32, marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  empty: { marginTop: 16, paddingHorizontal: 16 },
  row: { paddingVertical: 12, borderBottomWidth: 1, paddingHorizontal: 16 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  author: { fontSize: 12.5, fontWeight: '700' },
  time: { fontSize: 12 },
  rowBody: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  snippet: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  meta: { fontSize: 12, marginTop: 6 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 16, marginTop: 8 },
  mediaCell: { width: '48.5%' },
});
