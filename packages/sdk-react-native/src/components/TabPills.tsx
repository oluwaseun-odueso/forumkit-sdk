import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Horizontally-scrollable tab pills — active state matches
// composer/TabBar.tsx's underline treatment (text color + accent bar)
// rather than a filled pill, per feedback. Generic over the tab list so it
// can be reused (currently only ProfileScreen.tsx does).
export default function TabPills({ tabs, active, onSelect }: {
  tabs: readonly string[];
  active: string;
  onSelect: (tab: string) => void;
}) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.container, { borderBottomColor: tokens.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map(tab => {
          const isActive = tab === active;
          return (
            <Pressable key={tab} onPress={() => onSelect(tab)} style={styles.tab}>
              <Text style={{ color: isActive ? tokens.text : tokens.muted, fontSize: 15, fontWeight: isActive ? '700' : '500' }}>
                {tab}
              </Text>
              <View style={[styles.underline, { backgroundColor: isActive ? tokens.accent : 'transparent' }]} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // The hairline border is the full-width rail; the active tab's underline
  // sits flush at bottom: 0 on top of it.
  container: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { gap: 18, paddingHorizontal: 16 },
  tab: { alignItems: 'center', paddingTop: 8, paddingBottom: 0 },
  underline: { height: 3, borderRadius: 2, alignSelf: 'stretch', marginTop: 6 },
});
