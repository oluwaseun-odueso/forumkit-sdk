import { useMemo, type ComponentProps } from 'react';
import { NavigationContainer, NavigationIndependentTree, DefaultTheme, DarkTheme, type Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import FeedScreen from '../screens/FeedScreen';
import ThreadScreen from '../screens/ThreadScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import SearchInputScreen from '../screens/SearchInputScreen';
import AskResultScreen from '../screens/AskResultScreen';
import ModerationScreen from '../screens/ModerationScreen';

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
  // Full-screen search entry modal — shown when the user taps the search pill.
  // Handles text input, history, and live preview before submitting to Search.
  SearchInput: undefined;
  AskResult: { query: string };
  Moderation: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { tokens, mode } = useTheme();

  // Memoized so NavigationContainer receives a stable object reference on
  // re-renders unrelated to the theme, avoiding a second context propagation
  // wave through the navigation tree on every unrelated parent update.
  const navTheme = useMemo<NavTheme>(() => ({
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: tokens.accent,
      background: tokens.bg,
      card: tokens.nav,
      text: tokens.text,
      border: tokens.border,
    },
  }), [mode, tokens]);

  // ForumKit is embedded inside a host app's own component tree, which in
  // virtually every real RN app already has its own NavigationContainer at
  // its root — without marking this one independent, react-navigation's own
  // nested-container guard throws the moment <ForumKit> mounts. How you mark
  // it independent differs by major version, and since @react-navigation/
  // native/core are peer deps (peerDependencies accepts v6 || v7 — see
  // package.json), whichever one actually resolves at runtime is up to the
  // host, not this package's own devDependency pin:
  //   - v7 replaced the old `independent` prop with the NavigationIndependentTree
  //     wrapper below, and dropped `independent` from NavigationContainer's own
  //     type surface entirely (though it's still a silently-ignored extra prop
  //     there at runtime, since v7's BaseNavigationContainer never reads it).
  //   - v6 has no NavigationIndependentTree export at all — destructuring it
  //     from a v6 host's @react-navigation/native resolves to undefined, and
  //     rendering that unconditionally as a component type is exactly what
  //     crashed on a v6 host ("Element type is invalid... got: undefined").
  //     v6's BaseNavigationContainer checks the `independent` prop directly.
  // Passing `independent` unconditionally (typed via the cast below, since
  // it's not part of v7's NavigationContainerProps) and feature-detecting
  // NavigationIndependentTree at runtime before rendering it covers both.
  const containerProps = { theme: navTheme, independent: true } as Omit<ComponentProps<typeof NavigationContainer>, 'children'>;

  const container = (
    <NavigationContainer {...containerProps}>
      {/* statusBarTranslucent: Android-only, defaults to false in react-native-
          screens — that mismatches our edge-to-edge theme (transparent status
          bar in styles.xml, enforced by Android 15/SDK 35 regardless), so
          each Screen's own window-insets handling wasn't forwarding a
          correct top inset to useSafeAreaInsets() on Android. */}
      <Stack.Navigator screenOptions={{ headerShown: false, statusBarTranslucent: true }}>
        <Stack.Screen name="Feed" component={FeedScreen} />
        {/* animation: 'none' stops native-stack from playing its own push/pop
            transition on top of the swipe's own JS slide-out when it calls
            navigation.replace() into a neighbouring thread — that stacked,
            direction-mismatched native transition was part of what made
            swiping feel bumpy.
            gestureEnabled is left at the default (true) so the iOS native
            edge-swipe-back works. ThreadScreen's PanResponder ignores touches
            that start within the left-edge zone (first 30px), leaving those
            for the native recogniser. */}
        <Stack.Screen name="Thread" component={ThreadScreen} options={{ animation: 'none' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="SearchInput" component={SearchInputScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AskResult" component={AskResultScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Moderation" component={ModerationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );

  return NavigationIndependentTree ? (
    <NavigationIndependentTree>{container}</NavigationIndependentTree>
  ) : (
    container
  );
}
