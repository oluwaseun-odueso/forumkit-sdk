import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { Michroma_400Regular } from '@expo-google-fonts/michroma';
import type { ForumKitConfig } from '@forumkit/types';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { SessionProvider, useSession } from './session/SessionContext';
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
        <SessionProvider config={config}>
          <SessionGate />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Gates the app on the session handshake — a themed spinner while the host JWT
// is exchanged for a session token, a themed message if it fails, and the real
// navigation once ready. Kept inside the providers so it can read theme tokens.
function SessionGate() {
  const { tokens } = useTheme();
  const session = useSession();

  if (session.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.bg }}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  if (session.status === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.bg, padding: 24 }}>
        <Text style={{ color: tokens.text, fontSize: 15, fontWeight: '600', marginBottom: 6 }}>
          Couldn't connect
        </Text>
        <Text style={{ color: tokens['text-2'], fontSize: 13, textAlign: 'center' }}>
          {session.error}
        </Text>
      </View>
    );
  }

  return <RootNavigator />;
}
