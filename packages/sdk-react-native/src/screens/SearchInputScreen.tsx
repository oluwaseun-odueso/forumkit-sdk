import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listThreads, searchThreads, searchComments, fmtRelativeTime } from '@forumkit/shared';
import type { Thread, SearchResult, CommentSearchResult } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import Mascot from '../components/Mascot';
import { ChevronLeftIcon, MaterialBackIcon, ChubbyArrowIcon, ClockIcon, SparkleIcon } from '../components/icons';
import { callGlobalAskHandler } from '../navigation/Shell';
import type { RootStackParamList } from '../navigation/RootNavigator';

const HISTORY_KEY = 'fk_search_history';
const MAX_HISTORY = 10;
const DEBOUNCE_MS = 300;
const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

async function loadHistory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

async function saveHistory(query: string): Promise<void> {
  try {
    const current = await loadHistory();
    const deduped = [query, ...current.filter(q => q !== query)].slice(0, MAX_HISTORY);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(deduped));
  } catch { /* best-effort */ }
}

async function removeFromHistory(query: string): Promise<string[]> {
  try {
    const current = await loadHistory();
    const next = current.filter(q => q !== query);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch { return []; }
}

export default function SearchInputScreen() {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const session = useSession();
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const BackIcon = Platform.OS === 'ios' ? ChevronLeftIcon : MaterialBackIcon;

  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [latestPosts, setLatestPosts] = useState<Thread[]>([]);
  const [liveThreads, setLiveThreads] = useState<SearchResult[]>([]);
  const [liveComments, setLiveComments] = useState<CommentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadHistory().then(setHistory);
    if (!token) return;
    void listThreads(apiUrl, forumId, token, { sort: 'new', limit: 8 }).then(r => setLatestPosts(r.threads)).catch(() => {});
  }, [apiUrl, forumId, token]);

  const runLiveSearch = useCallback((q: string) => {
    if (!token || !q.trim()) { setLiveThreads([]); setLiveComments([]); return; }
    setSearching(true);
    Promise.all([
      searchThreads(apiUrl, forumId, q, { limit: 5 }, token),
      searchComments(apiUrl, forumId, q, { limit: 5 }, token),
    ]).then(([t, c]) => {
      setLiveThreads(t.results);
      setLiveComments(c.results);
    }).catch(() => { setLiveThreads([]); setLiveComments([]); })
      .finally(() => setSearching(false));
  }, [apiUrl, forumId, token]);

  function handleQueryChange(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setLiveThreads([]); setLiveComments([]); return; }
    debounceRef.current = setTimeout(() => runLiveSearch(text), DEBOUNCE_MS);
  }

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    void saveHistory(trimmed);
    navigation.navigate('Search', { query: trimmed });
  }

  function handleHistoryTap(q: string) {
    setQuery(q);
    submit(q);
  }

  async function handleRemoveHistory(q: string) {
    const next = await removeFromHistory(q);
    setHistory(next);
  }

  function handleResultTap(threadId: string, q: string) {
    void saveHistory(q.trim());
    navigation.navigate('Thread', { threadId });
  }

  const isEmpty = !query.trim();
  const canSubmit = !!query.trim();

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      {/* Safe area spacer */}
      <View style={{ height: insets.top + ANDROID_TOP_EXTRA }} />

      {/* Tall multi-row search box */}
      <View style={[styles.searchBox, { backgroundColor: tokens['surface-2'], borderColor: tokens.border }]}>
        {/* Top row: back arrow + text input */}
        <View style={styles.searchTop}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <BackIcon size={20} color={tokens.text} />
          </Pressable>
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => submit(query)}
            returnKeyType="search"
            autoFocus
            placeholder="Search"
            placeholderTextColor={tokens.faint}
            style={[styles.searchInput, { color: tokens.text }]}
          />
        </View>

        {/* Bottom row: Ask pill (left) + submit button (right) */}
        <View style={styles.searchBottom}>
          <Pressable
            style={[styles.askPill, { borderColor: tokens.border }]}
            onPress={() => callGlobalAskHandler()}
            hitSlop={6}
          >
            <SparkleIcon size={14} />
            <Text style={[styles.askLabel, { color: tokens['text-2'] }]}>Ask</Text>
          </Pressable>
          <Pressable
            style={[styles.submitBtn, { backgroundColor: tokens.accent, opacity: canSubmit ? 1 : 0.35 }]}
            onPress={() => submit(query)}
            hitSlop={6}
          >
            <ChubbyArrowIcon size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          {isEmpty ? (
            <>
              {/* Search history */}
              {history.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: tokens['text-2'] }]}>Recent</Text>
                  {history.map(q => (
                    <View key={q} style={styles.historyRow}>
                      <Pressable style={styles.historyMain} onPress={() => handleHistoryTap(q)}>
                        <ClockIcon size={15} color={tokens.muted} />
                        <Text style={[styles.historyText, { color: tokens['text-2'] }]} numberOfLines={1}>{q}</Text>
                      </Pressable>
                      <Pressable onPress={() => void handleRemoveHistory(q)} hitSlop={8}>
                        <Text style={[styles.historyClear, { color: tokens.muted }]}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </>
              )}

              {/* Latest posts */}
              {latestPosts.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: tokens['text-2'], marginTop: history.length > 0 ? 28 : 0 }]}>Latest</Text>
                  {latestPosts.map(t => (
                    <LatestRow key={t.id} thread={t} onPress={() => navigation.navigate('Thread', { threadId: t.id })} />
                  ))}
                </>
              )}

              {history.length === 0 && latestPosts.length === 0 && (
                <View style={styles.empty}>
                  <Mascot size={32} />
                  <Text style={[styles.emptyText, { color: tokens['text-2'] }]}>Search posts, comments, and people</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {!(searching && liveThreads.length === 0 && liveComments.length === 0) && (
                <>
                  {liveThreads.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: tokens['text-2'] }]}>Threads</Text>
                      {liveThreads.map(r => (
                        <LiveThreadRow key={r.threadId} r={r} onPress={() => handleResultTap(r.threadId, query)} />
                      ))}
                    </>
                  )}
                  {liveComments.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: tokens['text-2'], marginTop: liveThreads.length > 0 ? 24 : 0 }]}>Comments</Text>
                      {liveComments.map(r => (
                        <LiveCommentRow key={r.commentId} r={r} onPress={() => handleResultTap(r.threadId, query)} />
                      ))}
                    </>
                  )}
                  {!searching && liveThreads.length === 0 && liveComments.length === 0 && (
                    <Text style={[styles.noResults, { color: tokens['text-2'] }]}>No results for "{query}"</Text>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function LatestRow({ thread, onPress }: { thread: Thread; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.latestRow}>
      <View style={styles.rowHead}>
        <Avatar authorId={thread.authorId} author={thread.authorDisplayName ?? 'Unknown'} avatarUrl={thread.authorAvatarUrl ?? null} size={18} />
        <Text style={[styles.rowAuthor, { color: tokens['text-2'] }]}>{thread.authorDisplayName ?? 'Unknown'}</Text>
        <Text style={[styles.rowTime, { color: tokens.muted }]}>· {fmtRelativeTime(thread.createdAt)}</Text>
      </View>
      <Text style={[styles.rowTitle, { color: tokens.text }]} numberOfLines={2}>{thread.title}</Text>
    </Pressable>
  );
}

function LiveThreadRow({ r, onPress }: { r: SearchResult; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: tokens.border }]}>
      <View style={styles.rowHead}>
        <Avatar authorId={r.authorId} author={r.authorDisplayName} avatarUrl={r.authorAvatarUrl} size={18} />
        <Text style={[styles.rowAuthor, { color: tokens['text-2'] }]}>{r.authorDisplayName}</Text>
        <Text style={[styles.rowTime, { color: tokens.muted }]}>· {fmtRelativeTime(r.createdAt)}</Text>
      </View>
      <Text style={[styles.rowTitle, { color: tokens.text }]} numberOfLines={2}>{r.title}</Text>
    </Pressable>
  );
}

function LiveCommentRow({ r, onPress }: { r: CommentSearchResult; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: tokens.border }]}>
      <View style={styles.rowHead}>
        <Avatar authorId={r.authorId} author={r.authorDisplayName} avatarUrl={r.authorAvatarUrl} size={18} />
        <Text style={[styles.rowAuthor, { color: tokens['text-2'] }]}>{r.authorDisplayName}</Text>
        <Text style={[styles.rowTime, { color: tokens.muted }]}>· {fmtRelativeTime(r.createdAt)}</Text>
      </View>
      <Text style={[styles.rowSnippet, { color: tokens['text-2'] }]} numberOfLines={2}>{r.bodySnippet}</Text>
      <Text style={[styles.rowMeta, { color: tokens.muted }]} numberOfLines={1}>in: {r.threadTitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  searchBox: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 16,
  },
  searchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    padding: 0,
  },
  searchBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  askPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  askLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    paddingTop: 20,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  historyMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
  },
  historyClear: {
    fontSize: 14,
    paddingLeft: 12,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  latestRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rowAuthor: {
    fontSize: 12,
    fontWeight: '700',
  },
  rowTime: {
    fontSize: 12,
  },
  rowTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 20,
  },
  rowSnippet: {
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  noResults: {
    paddingHorizontal: 16,
    paddingTop: 24,
    fontSize: 14,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
