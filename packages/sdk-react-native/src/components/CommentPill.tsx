import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { CommentIcon } from './icons';

// Comment count pill per design_handoff README §6 — "same shell" as the vote
// pill (surface-2 rounded) with the speech-bubble icon + count. Non-interactive
// on the feed row (tapping the row opens the thread).
export default function CommentPill({ count }: { count: number }) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: tokens['surface-2'] }]}>
      <CommentIcon size={17} color={tokens['text-2']} />
      <Text style={[styles.count, { color: tokens['text-2'] }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  count: {
    fontSize: 14,
    fontWeight: '700',
  },
});
