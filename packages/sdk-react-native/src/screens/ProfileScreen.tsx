import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Shell from '../navigation/Shell';
import Mascot from '../components/Mascot';

// The 88px static mascot variant gets its first real usage here once the
// empty-state content (README §9) is built in a later step — for now just
// confirms the static prop renders correctly at the right size.
export default function ProfileScreen() {
  const { tokens } = useTheme();
  return (
    <Shell>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Mascot size={88} static />
        <Text style={{ color: tokens['text-2'], fontSize: 14 }}>Profile — coming soon</Text>
      </View>
    </Shell>
  );
}
