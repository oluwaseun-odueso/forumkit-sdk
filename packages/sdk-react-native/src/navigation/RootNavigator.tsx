import { NavigationContainer, DefaultTheme, DarkTheme, type Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import FeedScreen from '../screens/FeedScreen';
import ThreadScreen from '../screens/ThreadScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';

export type FeedScope = 'home' | 'popular' | 'news';

// Composer and Notifications are deliberately NOT routes here — per
// design_handoff_forum_kit_mobile/README.md §12, composerOpen/notifOpen are
// overlay booleans (like the drawer's menuOpen), not `view` values, and the
// composer sheet specifically must leave the floating bottom bar visible
// and tappable underneath it (§10) — a full-screen modal route would cover
// it entirely. Both are rendered as overlays from within Shell instead.
export type RootStackParamList = {
  Feed: { scope?: FeedScope } | undefined;
  // threadIds: the ordered list of thread ids the user was scrolling when
  // they opened this one (e.g. the feed's current sort order) — lets
  // ThreadScreen support swipe-to-next/previous. Absent when a thread is
  // opened outside that context (Search, Profile, a notification, a deep
  // link), in which case swipe is simply a no-op.
  Thread: { threadId: string; threadIds?: string[] | undefined };
  Profile: { userId?: string } | undefined;
  Search: { query: string };
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
        {/* Custom swipe-to-next/previous-thread (ThreadScreen.tsx) uses a
            rightward drag for "previous" — the same gesture as iOS's native
            edge-swipe-back, which otherwise wins the race against our JS
            PanResponder. ThreadScreen has its own BackRow back button, so
            losing the native edge-swipe here is the right trade.
            animation: 'none' stops native-stack from playing its own
            push/pop transition on top of the swipe's own JS slide-out
            when it calls navigation.replace() into a neighbouring thread —
            that stacked, direction-mismatched native transition was part
            of what made swiping feel bumpy. */}
        <Stack.Screen name="Thread" component={ThreadScreen} options={{ gestureEnabled: false, animation: 'none' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
