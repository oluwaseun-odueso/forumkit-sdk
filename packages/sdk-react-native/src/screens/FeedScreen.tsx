import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Shell from '../navigation/Shell';

// Placeholder body — the feed's real content (sort/view pills, post rows)
// comes in a later step. This step verifies the shell (top bar, bottom bar,
// drawer, navigation) works end to end.
export default function FeedScreen() {
  const { tokens } = useTheme();
  return (
    <Shell>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: tokens['text-2'], fontSize: 14 }}>Feed — coming soon</Text>
      </View>
    </Shell>
  );
}
