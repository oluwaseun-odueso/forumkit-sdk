import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { SimilarThread } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { CloseIcon } from '../components/icons';

type Props = {
  duplicates: SimilarThread[];
  onOpenThread: (id: string) => void;
  onDismiss: () => void;
};

export default function DuplicateThreadsPanel({ duplicates, onOpenThread, onDismiss }: Props) {
  const { tokens } = useTheme();
  if (duplicates.length === 0) return null;

  return (
    <View style={[styles.panel, { backgroundColor: tokens['surface-2'], borderColor: tokens['border-strong'], borderLeftColor: tokens.accent }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: tokens.text }]}>Similar threads already exist</Text>
        <Pressable onPress={onDismiss} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.65 }}>
          <CloseIcon size={14} color={tokens.muted} />
        </Pressable>
      </View>
      <Text style={[styles.hint, { color: tokens['text-2'] }]}>You may want to check these before posting.</Text>
      {duplicates.slice(0, 3).map(t => (
        <Pressable
          key={t.id}
          onPress={() => onOpenThread(t.id)}
          style={({ pressed }) => [styles.row, { borderColor: tokens.border }, pressed && { backgroundColor: tokens['hover-2'] }]}
        >
          <Text style={[styles.rowTitle, { color: tokens.text }]} numberOfLines={1}>{t.title}</Text>
          <Text style={[styles.rowScore, { color: tokens.accent }]}>{Math.round(t.similarity * 100)}% match</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 12, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 4,
  },
  rowTitle: { fontSize: 13, flex: 1 },
  rowScore: { fontSize: 11, fontWeight: '600', flexShrink: 0 },
});
