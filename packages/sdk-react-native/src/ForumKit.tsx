import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { Michroma_400Regular } from '@expo-google-fonts/michroma';
import type { ForumKitConfig } from '@forumkit/types';
import { ThemeProvider } from './theme/ThemeContext';
import RootNavigator from './navigation/RootNavigator';

// The mountable SDK root — a host app drops in <ForumKit forumId token
// theme? apiUrl? onLogout? /> and never touches ForumKit's internal
// navigation, matching sdk-web's <ForumKit> React wrapper around the
// <forum-kit> web component (same ForumKitConfig contract from
// @forumkit/types, platform: 'native' implied since this only exists on
// mobile).
export function ForumKit(config: ForumKitConfig) {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Michroma_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider theme={config.theme}>
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
