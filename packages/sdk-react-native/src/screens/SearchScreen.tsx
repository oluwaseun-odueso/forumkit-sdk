import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { searchThreads, fmtRelativeTime } from '@forumkit/shared';
import type { SearchResult } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Shell from '../navigation/Shell';
import BackRow from '../components/BackRow';
import Avatar from '../components/Avatar';
import Thumbnail from '../components/Thumbnail';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Search results — mirrors sdk-web's SearchResults (threads section). Fed by the
// top-bar search pill; tapping a result opens the thread.
export default function SearchScreen() {
  const { tokens } = useTheme();
  const session = useSession();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Search'>>();
  const query = route.params.query;
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    searchThreads(apiUrl, forumId, query, { limit: 25 }, token)
      .then(r => { if (!cancelled) setResults(r.results); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [apiUrl, forumId, query, token]);

  return (
    <Shell>
      <ScrollView contentContainerStyle={styles.content}>
        <BackRow onPress={() => navigation.goBack()} />
        <Text style={[styles.heading, { color: tokens.text }]}>Results for “{query}”</Text>

        {loading ? (
          <ActivityIndicator color={tokens.accent} style={{ marginTop: 40 }} />
        ) : results.length === 0 ? (
          <Text style={{ color: tokens['text-2'], marginTop: 20 }}>No results</Text>
        ) : (
          results.map(r => (
            <Pressable
              key={r.threadId}
              onPress={() => navigation.navigate('Thread', { threadId: r.threadId })}
              style={[styles.row, { borderBottomColor: tokens.border }]}
            >
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
          ))
        )}
      </ScrollView>
    </Shell>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 110 },
  heading: { fontSize: 17, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  row: { paddingVertical: 12, borderBottomWidth: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  author: { fontSize: 12.5, fontWeight: '700' },
  time: { fontSize: 12 },
  rowBody: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  snippet: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  meta: { fontSize: 12, marginTop: 6 },
});
