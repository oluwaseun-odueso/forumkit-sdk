import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, View, Text, TextInput, Pressable, ScrollView, StyleSheet, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { listThreads, searchThreads, searchComments, fmtRelativeTime } from '@forumkit/shared';
import type { Thread, SearchResult, CommentSearchResult } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import Mascot from '../components/Mascot';
import { ArrowRightIcon, ChevronRightIcon, ClockIcon, SparkleIcon } from '../components/icons';
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
  const { tokens, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const session = useSession();
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const [query, setQuery] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [askPillSize, setAskPillSize] = useState({ w: 0, h: 0 });
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

  function handleAskPress() {
    setAiMode(prev => !prev);
  }

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
    if (!text.trim()) { setLiveThreads([]); setLiveComments([]); setAiMode(false); return; }
    debounceRef.current = setTimeout(() => runLiveSearch(text), DEBOUNCE_MS);
  }

  function clearQuery() {
    setQuery('');
    setAiMode(false);
    setLiveThreads([]);
    setLiveComments([]);
  }

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (aiMode) {
      navigation.navigate('AskResult', { query: trimmed });
      return;
    }
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
      <View style={[styles.searchBox, { backgroundColor: mode === 'dark' ? tokens.surface : '#dde1e6' }]}>
        {aiMode && <SearchBoxGlowBorder />}
        {/* Top row: back arrow + text input + clear button */}
        <View style={styles.searchTop}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <View style={{ transform: [{ scaleX: -1 }] }}>
              <ArrowRightIcon size={20} color={tokens.text} />
            </View>
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
          {query.length > 0 && (
            <Pressable onPress={clearQuery} hitSlop={8}>
              <Text style={[styles.clearBtn, { color: tokens.muted }]}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Bottom row: Ask pill + optional hint + submit button */}
        <View style={styles.searchBottom}>
          <Pressable
            style={[styles.askPill, { backgroundColor: aiMode ? '#7b5cff11' : tokens['surface-2'] }]}
            onPress={handleAskPress}
            hitSlop={6}
            onLayout={e => setAskPillSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
          >
            {aiMode && askPillSize.w > 0 && (
              <Svg width={askPillSize.w} height={askPillSize.h} style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="fkAskPillGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0" stopColor="#3f7ee2" />
                    <Stop offset="0.55" stopColor="#7b5cff" />
                    <Stop offset="1" stopColor="#37e0e6" />
                  </LinearGradient>
                </Defs>
                <Rect
                  x={0.75} y={0.75}
                  width={askPillSize.w - 1.5} height={askPillSize.h - 1.5}
                  rx={askPillSize.h / 2 - 0.75} ry={askPillSize.h / 2 - 0.75}
                  fill="none" stroke="url(#fkAskPillGrad)" strokeWidth={1.5}
                />
              </Svg>
            )}
            <SparkleIcon size={14} />
            <Text style={[styles.askLabel, { color: aiMode ? '#7b5cff' : tokens['text-2'] }]}>Ask</Text>
          </Pressable>
          {aiMode && (
            <Text style={[styles.askHint, { color: tokens.muted }]} numberOfLines={1}>
              summarise the top conversations
            </Text>
          )}
          <Pressable
            style={[styles.submitBtn, { backgroundColor: tokens.accent, opacity: canSubmit ? 1 : 0.35 }]}
            onPress={() => submit(query)}
            hitSlop={6}
          >
            <ChevronRightIcon size={18} color="#fff" />
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

let _glowBorderCtr = 0;
const BOX_H = 110;
const BOX_RX = 25.25; // borderRadius 26 - strokeWidth 1.5/2

function SearchBoxGlowBorder() {
  const [w, setW] = useState(0);
  const dashOffset = useRef(new Animated.Value(0)).current;
  const gradId = useRef(`fkSiGlow${++_glowBorderCtr}`).current;

  useEffect(() => {
    if (w === 0) return;
    const perim = 2 * (w - 2 * BOX_RX) + 2 * (BOX_H - 2 * BOX_RX) + 2 * Math.PI * BOX_RX;
    dashOffset.setValue(0);
    const loop = Animated.loop(
      Animated.timing(dashOffset, { toValue: -perim, duration: 1600, easing: Easing.linear, useNativeDriver: false }),
    );
    loop.start();
    return () => loop.stop();
  }, [w, dashOffset]);

  const perim = w > 0 ? 2 * (w - 2 * BOX_RX) + 2 * (BOX_H - 2 * BOX_RX) + 2 * Math.PI * BOX_RX : 0;
  const segLen = perim * 0.16;

  return (
    <View
      style={[StyleSheet.absoluteFill, { borderRadius: 26 }]}
      pointerEvents="none"
      onLayout={e => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && (
        <Svg width={w} height={BOX_H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0" stopColor="#3f7ee2" />
              <Stop offset="0.55" stopColor="#7b5cff" />
              <Stop offset="1" stopColor="#37e0e6" />
            </LinearGradient>
          </Defs>
          {/* Dim base — shows the full border path while the light sweeps */}
          <Rect
            x={0.75} y={0.75}
            width={w - 1.5} height={BOX_H - 1.5}
            rx={BOX_RX} ry={BOX_RX}
            fill="none" stroke={`url(#${gradId})`} strokeWidth={1.5}
            opacity={1}
          />
          {/* White highlight sweep */}
          <AnimatedRect
            x={0.75} y={0.75}
            width={w - 1.5} height={BOX_H - 1.5}
            rx={BOX_RX} ry={BOX_RX}
            fill="none" stroke="#ffffff" strokeWidth={2.5} opacity={0.55}
            strokeDasharray={`${segLen} ${perim - segLen}`}
            strokeDashoffset={dashOffset}
          />
        </Svg>
      )}
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
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 16,
    height: 110,
    justifyContent: 'space-between',
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
  },
  askLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  askHint: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  clearBtn: {
    fontSize: 14,
    paddingHorizontal: 2,
  },
  submitBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
