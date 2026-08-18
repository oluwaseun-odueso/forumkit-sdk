import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Underline tab bar — mirrors sdk-web composer-modal.tsx's tabs (README §10):
// active tab = text color + 3px accent underline, inactive = muted.
export default function TabBar<T extends string>({ tabs, active, onSelect }: {
  tabs: ReadonlyArray<{ id: T; label: string }>;
  active: T;
  onSelect: (id: T) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={styles.row}>
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <Pressable key={t.id} onPress={() => onSelect(t.id)} style={styles.tab}>
            <Text style={{ color: isActive ? tokens.text : tokens.muted, fontSize: 14, fontWeight: isActive ? '600' : '400' }}>
              {t.label}
            </Text>
            <View style={[styles.underline, { backgroundColor: isActive ? tokens.accent : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 18 },
  tab: { alignItems: 'center', paddingVertical: 8 },
  underline: { height: 3, borderRadius: 2, alignSelf: 'stretch', marginTop: 6 },
});
