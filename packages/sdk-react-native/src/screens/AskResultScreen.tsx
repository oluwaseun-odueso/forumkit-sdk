import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Modal,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { askQuestion, fmtRelativeTime } from '@forumkit/shared';
import type { AskAnswer, AskQuestionResult } from '@forumkit/shared';
import type { SearchResult } from '@forumkit/types';
import { useSession } from '../session/SessionContext';
import { useTheme } from '../theme/ThemeContext';
import Avatar from '../components/Avatar';
import { ArrowRightIcon, ChevronRightIcon } from '../components/icons';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Turn = {
  query: string;
  answer: AskAnswer | null;
  sources: SearchResult[];
  loading: boolean;
  error: string | null;
};

export default function AskResultScreen() {
  const { tokens, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AskResult'>>();
  const session = useSession();
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [followUp, setFollowUp] = useState('');
  const [sheetTurn, setSheetTurn] = useState<Turn | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const ask = useCallback(async (q: string) => {
    if (!token) return;
    const idx = turns.length;
    setTurns(prev => [...prev, { query: q, answer: null, sources: [], loading: true, error: null }]);
    try {
      const result: AskQuestionResult = await askQuestion(apiUrl, forumId, q, token);
      setTurns(prev => prev.map((t, i) =>
        i === idx ? { ...t, answer: result.answer, sources: result.sources, loading: false } : t,
      ));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setTurns(prev => prev.map((t, i) =>
        i === idx ? { ...t, loading: false, error: msg } : t,
      ));
    }
  }, [apiUrl, forumId, token, turns.length]);

  // Fire the initial query on mount
  useEffect(() => {
    void ask(route.params.query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Scroll to bottom after each turn update
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [turns]);

  function submitFollowUp() {
    const q = followUp.trim();
    if (!q) return;
    setFollowUp('');
    void ask(q);
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      <View style={{ height: insets.top + (Platform.OS === 'android' ? 12 : 0) }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <View style={{ transform: [{ scaleX: -1 }] }}>
            <ArrowRightIcon size={20} color={tokens.text} />
          </View>
        </Pressable>
        <Text style={[styles.headerTitle, { color: tokens.text }]}>Ask AI</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.body, { paddingBottom: 20 }]}
        >
          {turns.map((turn, i) => (
            <TurnView
              key={i}
              turn={turn}
              tokens={tokens}
              mode={mode}
              onSourcesPress={() => setSheetTurn(turn)}
              onThreadPress={threadId => navigation.navigate('Thread', { threadId })}
            />
          ))}
        </ScrollView>

        {/* Follow-up input */}
        <View style={[styles.inputBar, {
          backgroundColor: mode === 'dark' ? tokens.surface : '#dde1e6',
          marginHorizontal: 14,
          marginBottom: insets.bottom + 12,
        }]}>
          <TextInput
            value={followUp}
            onChangeText={setFollowUp}
            onSubmitEditing={submitFollowUp}
            returnKeyType="send"
            placeholder="Ask a follow-up…"
            placeholderTextColor={tokens.faint}
            style={[styles.followInput, { color: tokens.text }]}
          />
          <Pressable
            style={[styles.followBtn, {
              backgroundColor: tokens.accent,
              opacity: followUp.trim() ? 1 : 0.35,
            }]}
            onPress={submitFollowUp}
            hitSlop={6}
          >
            <ChevronRightIcon size={16} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Sources bottom sheet */}
      <Modal
        visible={sheetTurn !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetTurn(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetTurn(null)} />
        <View style={[styles.sheet, {
          backgroundColor: tokens.bg,
          paddingBottom: insets.bottom + 16,
        }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: tokens.text }]}>Sources</Text>
            <Pressable onPress={() => setSheetTurn(null)} hitSlop={8}>
              <Text style={[styles.sheetClose, { color: tokens.muted }]}>✕</Text>
            </Pressable>
          </View>
          <ScrollView>
            {(sheetTurn?.sources ?? []).map((src, i) => (
              <SourceCard
                key={src.threadId + i}
                src={src}
                tokens={tokens}
                onPress={() => {
                  setSheetTurn(null);
                  navigation.navigate('Thread', { threadId: src.threadId });
                }}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Tokens = ReturnType<typeof useTheme>['tokens'];

function TurnView({
  turn, tokens, mode, onSourcesPress, onThreadPress,
}: {
  turn: Turn;
  tokens: Tokens;
  mode: string;
  onSourcesPress: () => void;
  onThreadPress: (id: string) => void;
}) {
  return (
    <View style={styles.turn}>
      {/* User query — right-aligned pill */}
      <View style={styles.queryRow}>
        <View style={[styles.queryPill, { backgroundColor: tokens['surface-2'] }]}>
          <Text style={[styles.queryText, { color: tokens.text }]}>{turn.query}</Text>
        </View>
      </View>

      {/* AI response */}
      <View style={styles.responseWrap}>
        {turn.loading && (
          <ActivityIndicator color={tokens.accent} style={{ marginTop: 12 }} />
        )}
        {turn.error && !turn.loading && (
          <Text style={[styles.errorText, { color: tokens.up }]}>{turn.error}</Text>
        )}
        {turn.answer && !turn.loading && (
          <View style={styles.answerWrap}>
            {/* Source pill */}
            {turn.sources.length > 0 && (
              <Pressable
                style={[styles.sourcePill, { borderColor: tokens.border, backgroundColor: tokens['surface-2'] }]}
                onPress={onSourcesPress}
              >
                <AvatarStack sources={turn.sources} />
                <Text style={[styles.sourcePillText, { color: tokens['text-2'] }]} numberOfLines={1}>
                  {'From ' + truncate(turn.sources[0]?.title ?? '', 28) +
                    (turn.sources.length > 1 ? ` +${turn.sources.length - 1} more` : '')}
                </Text>
                <ChevronRightIcon size={12} color={tokens.muted} />
              </Pressable>
            )}

            {/* Intro */}
            <Text style={[styles.intro, { color: tokens.text }]}>{turn.answer.intro}</Text>

            {/* Categories */}
            {turn.answer.categories.map((cat, ci) => (
              <View key={ci} style={styles.category}>
                <Text style={[styles.catTitle, { color: tokens['text-2'] }]}>{cat.title}</Text>
                {cat.bullets.map((b, bi) => {
                  const src = turn.sources[b.sourceIndex];
                  return (
                    <View key={bi} style={styles.bullet}>
                      <Text style={[styles.bulletFact, { color: tokens.text }]}>{b.fact}</Text>
                      <Text style={[styles.bulletQuote, { color: tokens.accent }]}>"{b.quote}"</Text>
                      {src && (
                        <Pressable
                          style={[styles.attrChip, { backgroundColor: tokens['surface-2'] }]}
                          onPress={() => onThreadPress(src.threadId)}
                        >
                          <Text style={[styles.attrText, { color: tokens['text-2'] }]} numberOfLines={1}>
                            {truncate(src.title, 40)}
                          </Text>
                          <ChevronRightIcon size={10} color={tokens.muted} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function AvatarStack({ sources }: { sources: SearchResult[] }) {
  const shown = sources.slice(0, 3);
  return (
    <View style={styles.avatarStack}>
      {shown.map((s, i) => (
        <View key={s.threadId} style={[styles.avatarWrap, { zIndex: 3 - i, marginLeft: i === 0 ? 0 : -8 }]}>
          <Avatar
            authorId={s.authorId}
            author={s.authorDisplayName}
            avatarUrl={s.authorAvatarUrl}
            size={18}
          />
        </View>
      ))}
    </View>
  );
}

function SourceCard({
  src, tokens, onPress,
}: {
  src: SearchResult;
  tokens: Tokens;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.sourceCard, { borderBottomColor: tokens.border }]} onPress={onPress}>
      <Avatar
        authorId={src.authorId}
        author={src.authorDisplayName}
        avatarUrl={src.authorAvatarUrl}
        size={36}
      />
      <View style={styles.sourceCardBody}>
        <Text style={[styles.sourceCardTitle, { color: tokens.text }]} numberOfLines={2}>{src.title}</Text>
        <Text style={[styles.sourceCardMeta, { color: tokens.muted }]}>
          {src.authorDisplayName} · {fmtRelativeTime(src.createdAt)} · {src.commentCount} comments
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  body: {
    paddingTop: 8,
    paddingHorizontal: 14,
  },

  turn: {
    marginBottom: 24,
  },
  queryRow: {
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  queryPill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: '80%',
  },
  queryText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },

  responseWrap: {
    alignItems: 'flex-start',
  },
  answerWrap: {
    width: '100%',
  },

  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
    maxWidth: '90%',
  },
  sourcePillText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderRadius: 9,
    overflow: 'hidden',
  },

  intro: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },

  category: {
    marginBottom: 16,
  },
  catTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bullet: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#88888833',
  },
  bulletFact: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 3,
  },
  bulletQuote: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  attrChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  attrText: {
    fontSize: 11,
    fontWeight: '500',
  },

  errorText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  followInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  followBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sources bottom sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sheetClose: {
    fontSize: 16,
    paddingLeft: 12,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sourceCardBody: {
    flex: 1,
  },
  sourceCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 3,
  },
  sourceCardMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
});
