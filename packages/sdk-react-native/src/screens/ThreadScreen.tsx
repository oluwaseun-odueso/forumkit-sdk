import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Shell from '../navigation/Shell';

export default function ThreadScreen() {
  const { tokens } = useTheme();
  return (
    <Shell>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: tokens['text-2'], fontSize: 14 }}>Thread — coming soon</Text>
      </View>
    </Shell>
  );
}
