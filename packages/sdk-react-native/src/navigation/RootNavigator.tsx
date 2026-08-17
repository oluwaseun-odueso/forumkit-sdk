import { NavigationContainer, DefaultTheme, DarkTheme, type Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import FeedScreen from '../screens/FeedScreen';
import ThreadScreen from '../screens/ThreadScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Composer and Notifications are deliberately NOT routes here — per
// design_handoff_forum_kit_mobile/README.md §12, composerOpen/notifOpen are
// overlay booleans (like the drawer's menuOpen), not `view` values, and the
// composer sheet specifically must leave the floating bottom bar visible
// and tappable underneath it (§10) — a full-screen modal route would cover
// it entirely. Both are rendered as overlays from within Shell instead.
export type RootStackParamList = {
  Feed: undefined;
  Thread: { threadId: string };
  Profile: { userId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { tokens, mode } = useTheme();

  const navTheme: NavTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: tokens.accent,
      background: tokens.bg,
      card: tokens.nav,
      text: tokens.text,
      border: tokens.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {/* statusBarTranslucent: Android-only, defaults to false in react-native-
          screens — that mismatches our edge-to-edge theme (transparent status
          bar in styles.xml, enforced by Android 15/SDK 35 regardless), so
          each Screen's own window-insets handling wasn't forwarding a
          correct top inset to useSafeAreaInsets() on Android. */}
      <Stack.Navigator screenOptions={{ headerShown: false, statusBarTranslucent: true }}>
        <Stack.Screen name="Feed" component={FeedScreen} />
        <Stack.Screen name="Thread" component={ThreadScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
