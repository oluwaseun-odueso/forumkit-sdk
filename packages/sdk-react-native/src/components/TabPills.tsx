import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Horizontally-scrollable tab pills — mirrors sdk-web's profile-tabs.tsx
// (selected = hover-2). Generic over the tab list so it can be reused.
export default function TabPills({ tabs, active, onSelect }: {
  tabs: readonly string[];
  active: string;
  onSelect: (tab: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {tabs.map(tab => {
        const isActive = tab === active;
        return (
          <Pressable
            key={tab}
            onPress={() => onSelect(tab)}
            style={[styles.pill, isActive && { backgroundColor: tokens['hover-2'] }]}
          >
            <Text style={{ color: isActive ? tokens.text : tokens['text-2'], fontSize: 13, fontWeight: isActive ? '600' : '400' }}>
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16 },
  pill: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 },
});
