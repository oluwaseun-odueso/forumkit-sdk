import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ChevronLeftIcon, MaterialBackIcon } from './icons';

// Back affordance shared by Thread + Profile — a surface-2 pill with the
// platform back glyph (iOS chevron / Android Material arrow, per README §3) +
// label. Mirrors sdk-web's `<PillButton icon={<ChevronLeftIcon/>}>Back`.
export default function BackRow({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  const { tokens } = useTheme();
  const BackIcon = Platform.OS === 'ios' ? ChevronLeftIcon : MaterialBackIcon;
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onPress} hitSlop={6} style={[styles.pill, { backgroundColor: tokens['surface-2'] }]}>
        <BackIcon size={16} color={tokens['text-2']} />
        <Text style={[styles.label, { color: tokens['text-2'] }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  label: { fontSize: 13.5, fontWeight: '600' },
});
