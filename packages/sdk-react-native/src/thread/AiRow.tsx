import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { GradientBorderPill } from '../components/Pill';
import { SparkleIcon, CloseIcon } from '../components/icons';
import { checkAiAvailable, callSummarise, callSuggest } from './api-ai';

// RowState drives the outer sparkle toggle:
//   closed      → only the "Ask AI" pill is visible
//   checking    → availability check in flight (spinner on the pill)
//   open        → AI available; two action buttons + their result panel shown
//   unavailable → AI not configured; error panel shown
type RowState = 'closed' | 'checking' | 'open' | 'unavailable';
type PanelState = 'idle' | 'loading' | 'done' | 'error';

export type AiRowHandle = { openSummary: () => void };

type AiRowProps = {
  threadId: string;
  forumId: string;
  apiUrl: string;
  token: string | undefined;
};

const AiRow = forwardRef<AiRowHandle, AiRowProps>(function AiRow({ threadId, forumId, apiUrl, token }, ref) {
  const { tokens } = useTheme();

  const [rowState, setRowState] = useState<RowState>('closed');

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryState, setSummaryState] = useState<PanelState>('idle');
  const [summaryPoints, setSummaryPoints] = useState<string[]>([]);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestState, setSuggestState] = useState<PanelState>('idle');
  const [suggestText, setSuggestText] = useState<string>('');

  // Reset all state when the thread changes so no AI content from a previous
  // thread bleeds through (defensive — React Navigation remounts ThreadScreen
  // on navigate/replace, but this guards against any future reuse).
  useEffect(() => {
    setRowState('closed');
    setSummaryOpen(false);
    setSummaryState('idle');
    setSummaryPoints([]);
    setSuggestOpen(false);
    setSuggestState('idle');
    setSuggestText('');
  }, [threadId]);

  const openWithAvailability = async () => {
    setRowState('checking');
    const available = await checkAiAvailable(apiUrl, forumId, token);
    setRowState(available ? 'open' : 'unavailable');
  };

  const handleSparkle = () => {
    if (rowState === 'closed' || rowState === 'unavailable') {
      void openWithAvailability();
    } else {
      setRowState('closed');
      setSummaryOpen(false);
      setSuggestOpen(false);
    }
  };

  useImperativeHandle(ref, () => ({
    openSummary: () => {
      if (rowState === 'open') return;
      void openWithAvailability();
    },
  }), [rowState, apiUrl, forumId, token]);

  const fetchSummary = async () => {
    setSummaryState('loading');
    const points = await callSummarise(apiUrl, threadId, token);
    if (points) {
      setSummaryPoints(points);
      setSummaryState('done');
    } else {
      setSummaryState('error');
    }
  };

  const fetchSuggest = async () => {
    setSuggestState('loading');
    const text = await callSuggest(apiUrl, threadId, token);
    if (text) {
      setSuggestText(text);
      setSuggestState('done');
    } else {
      setSuggestState('error');
    }
  };

  const toggleSummary = () => {
    if (summaryOpen) { setSummaryOpen(false); return; }
    setSuggestOpen(false);
    setSummaryOpen(true);
    if (summaryState === 'idle') void fetchSummary();
  };

  const toggleSuggest = () => {
    if (suggestOpen) { setSuggestOpen(false); return; }
    setSummaryOpen(false);
    setSuggestOpen(true);
    if (suggestState === 'idle' || suggestState === 'done') void fetchSuggest();
  };

  const panelOpen = summaryOpen || suggestOpen;

  return (
    <View style={{ marginBottom: 16 }}>
      {/* Sparkle trigger pill */}
      <GradientBorderPill height={36} borderWidth={1.3} style={styles.sparklePill}>
        <Pressable
          onPress={handleSparkle}
          style={styles.sparkleBtn}
          disabled={rowState === 'checking'}
          hitSlop={4}
        >
          {rowState === 'checking'
            ? <ActivityIndicator size="small" color={tokens.accent} style={{ width: 16, height: 16 }} />
            : <SparkleIcon size={16} />}
          <Text style={[styles.sparkleLabel, { color: tokens.text }]}>Ask AI</Text>
        </Pressable>
      </GradientBorderPill>

      {/* AI unavailable panel */}
      {rowState === 'unavailable' && (
        <View style={[styles.panel, { borderColor: tokens['border-strong'], backgroundColor: tokens['surface-2'] }]}>
          <View style={styles.panelHead}>
            <SparkleIcon size={16} />
            <Text style={[styles.panelTitle, { color: tokens.text }]}>AI Features</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setRowState('closed')} hitSlop={8}>
              <CloseIcon size={16} color={tokens.muted} />
            </Pressable>
          </View>
          <Text style={[styles.panelBody, { color: tokens.muted }]}>
            AI features are not available for this deployment.
          </Text>
        </View>
      )}

      {/* AI open: action buttons + result panel */}
      {rowState === 'open' && (
        <>
          <View style={[styles.actionRow]}>
            <AiButton label="Summarise thread" onPress={toggleSummary} />
            <AiButton label="Suggest reply" onPress={toggleSuggest} />
          </View>

          {panelOpen && (
            <View style={[styles.panel, { borderColor: tokens['border-strong'], backgroundColor: tokens['surface-2'] }]}>
              <View style={styles.panelHead}>
                <SparkleIcon size={16} />
                <Text style={[styles.panelTitle, { color: tokens.text }]}>
                  {summaryOpen ? 'Thread summary' : 'Suggested reply'}
                </Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => { setSummaryOpen(false); setSuggestOpen(false); }} hitSlop={8}>
                  <CloseIcon size={16} color={tokens.muted} />
                </Pressable>
              </View>

              {summaryOpen && (
                summaryState === 'loading' ? (
                  <ActivityIndicator size="small" color={tokens.accent} style={{ marginTop: 4 }} />
                ) : summaryState === 'error' ? (
                  <Text style={[styles.panelBody, { color: tokens.muted }]}>AI service unavailable</Text>
                ) : (
                  <View style={{ gap: 6 }}>
                    {summaryPoints.map((pt, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={[styles.bullet, { color: tokens['text-2'] }]}>•</Text>
                        <Text style={[styles.panelBody, { color: tokens['text-2'], flex: 1 }]}>{pt}</Text>
                      </View>
                    ))}
                  </View>
                )
              )}

              {suggestOpen && (
                suggestState === 'loading' ? (
                  <ActivityIndicator size="small" color={tokens.accent} style={{ marginTop: 4 }} />
                ) : suggestState === 'error' ? (
                  <Text style={[styles.panelBody, { color: tokens.muted }]}>AI service unavailable</Text>
                ) : (
                  <Text style={[styles.panelBody, { color: tokens['text-2'] }]}>{suggestText}</Text>
                )
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
});

export default AiRow;

function AiButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <GradientBorderPill height={34} borderWidth={1.3} style={{ flex: 1 }}>
      <Pressable onPress={onPress} style={styles.aiBtn}>
        <SparkleIcon size={14} />
        <Text style={[styles.aiBtnLabel, { color: tokens.text }]}>{label}</Text>
      </Pressable>
    </GradientBorderPill>
  );
}

const styles = StyleSheet.create({
  sparklePill: { alignSelf: 'flex-start' },
  sparkleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  sparkleLabel: { fontSize: 13, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  aiBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  aiBtnLabel: { fontSize: 13, fontWeight: '600' },
  panel: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  panelTitle: { fontSize: 14, fontWeight: '700' },
  panelBody: { fontSize: 13.5, lineHeight: 19 },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bullet: { fontSize: 13.5, lineHeight: 19 },
});
