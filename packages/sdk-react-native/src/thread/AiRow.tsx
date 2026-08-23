import { forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { GradientBorderPill } from '../components/Pill';
import { SparkleIcon, CloseIcon } from '../components/icons';

// The Thread AI row — mirrors sdk-web thread-view.tsx's AI buttons + panel
// (README §8) VISUALLY only. Per the standing decision (AI moving to its own
// service), these are NOT wired to api/ai.ts: the panels show placeholder text.
// One panel open at a time; re-tapping the same pill closes it.
type Panel = 'summary' | 'reply' | null;

// Exposes an imperative "open the summary panel" escape hatch — ThreadScreen
// registers this with Shell (see registerAskHandler in Shell.tsx) so the top
// bar's Ask button (next to search, matching web's TopNav) can reach into
// this row's own local panel state without lifting it out entirely.
export type AiRowHandle = { openSummary: () => void };

const AiRow = forwardRef<AiRowHandle>(function AiRow(_props, ref) {
  const { tokens } = useTheme();
  const [panel, setPanel] = useState<Panel>(null);
  const toggle = (p: 'summary' | 'reply') => setPanel(cur => (cur === p ? null : p));

  useImperativeHandle(ref, () => ({
    openSummary: () => setPanel('summary'),
  }), []);

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.row}>
        <AiButton label="Summarise thread" onPress={() => toggle('summary')} />
        <AiButton label="Suggest reply" onPress={() => toggle('reply')} />
      </View>

      {panel && (
        <View style={[styles.panel, { borderColor: tokens['border-strong'], backgroundColor: tokens['surface-2'] }]}>
          <View style={styles.panelHead}>
            <SparkleIcon size={16} />
            <Text style={[styles.panelTitle, { color: tokens.text }]}>
              {panel === 'summary' ? 'Thread summary' : 'Suggested reply'}
            </Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setPanel(null)} hitSlop={8}>
              <CloseIcon size={16} color={tokens.muted} />
            </Pressable>
          </View>
          <Text style={[styles.panelBody, { color: tokens['text-2'] }]}>
            {panel === 'summary'
              ? 'Thread summaries will appear here once the AI service is connected.'
              : 'Suggested replies will appear here once the AI service is connected.'}
          </Text>
        </View>
      )}
    </View>
  );
});

export default AiRow;

function AiButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <GradientBorderPill height={36} borderWidth={1.3} style={{ flex: 1 }}>
      <Pressable onPress={onPress} style={styles.aiBtn}>
        <SparkleIcon size={16} />
        <Text style={[styles.aiBtnLabel, { color: tokens.text }]}>{label}</Text>
      </Pressable>
    </GradientBorderPill>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
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
});
