import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, StyleSheet, Platform, BackHandler, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type NavigationProp } from '@react-navigation/native';
import { getMyProfile } from '@forumkit/shared';
import type { Draft } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { useSession } from '../session/SessionContext';
import TopBar from './TopBar';
import BottomBar from './BottomBar';
import Drawer, { DRAWER_WIDTH, type DrawerRoute } from './Drawer';
import ComposerOverlay from './ComposerOverlay';
import DraftsSheet from '../composer/DraftsSheet';
import NotificationsOverlay from './NotificationsOverlay';
import type { RootStackParamList } from './RootNavigator';

// react-native-screens' statusBarTranslucent inset on Android still lands
// visually tighter against the status bar than iOS's equivalent — nudge it
// down a bit further rather than relying on the raw inset alone.
const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

// Lets any screen inside a Shell open the persistent overlays (e.g. the
// profile's "Create Post" button opening the composer the FAB also opens).
type ShellActions = { openDrawer: () => void; openComposer: () => void; openNotifications: () => void };
const ShellContext = createContext<ShellActions | null>(null);

export function useShell(): ShellActions {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used within a Shell');
  return ctx;
}

// Persistent chrome around Feed/Thread/Profile — mirrors sdk-web's Shell
// component (top bar + content + the app's other persistent nav), adapted
// to the mobile design's floating bottom bar + drawer instead of a sidebar.
// Composer/Notifications render here as overlays (not navigation routes) —
// see the comment in RootNavigator.tsx for why.
export default function Shell({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  // Shell is mounted fresh inside whichever screen is currently on top (each
  // screen renders its own <Shell>), so useRoute() here always reflects the
  // real current route — not a prop threaded down from RootNavigator. Used to
  // highlight the matching bottom-bar icon / drawer row, the same "active"
  // treatment Reddit's own bottom bar uses.
  const route = useRoute();
  const isFeed = route.name === 'Feed';
  const feedScope = isFeed ? ((route.params as RootStackParamList['Feed'])?.scope ?? 'home') : null;
  const session = useSession();
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<Draft | null>(null);
  const [me, setMe] = useState<{ displayName: string; avatarUrl: string | null } | null>(null);

  // Drives the "push" drawer — the main content translates right to reveal
  // the drawer panel sitting behind it (see Drawer.tsx), rather than the
  // drawer overlaying on top as a Modal. Same reanimated pattern already
  // used by components/Mascot.tsx.
  const drawerX = useSharedValue(0);
  useEffect(() => {
    drawerX.value = withTiming(drawerOpen ? DRAWER_WIDTH : 0, { duration: 250, easing: Easing.out(Easing.cubic) });
  }, [drawerOpen, drawerX]);
  const drawerPushStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drawerX.value }] }));

  // Modal's onRequestClose used to handle the Android hardware back button
  // for free; now that the drawer isn't a Modal, it needs its own listener —
  // only active while open, so back-navigation behaves normally otherwise.
  useEffect(() => {
    if (!drawerOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setDrawerOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [drawerOpen]);

  // Just enough of the current user's profile for the bottom bar's Profile
  // tab avatar — Shell remounts fresh on every screen navigation (see the
  // useRoute comment above), so this naturally refetches and picks up a
  // just-changed avatar the next time the user leaves the Profile screen,
  // no cross-component sync needed.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getMyProfile(apiUrl, forumId, token).then(profile => {
      if (!cancelled && profile) setMe({ displayName: profile.displayName, avatarUrl: profile.avatarUrl });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [apiUrl, forumId, token]);

  function closeComposer() {
    setComposerOpen(false);
    setLoadedDraft(null);
  }

  function goTo(route: DrawerRoute) {
    setDrawerOpen(false);
    // Home / Popular / News all land on the feed with a scope (Popular = hot,
    // News = the "news" tag) — see FeedScreen.
    navigation.navigate('Feed', { scope: route });
  }

  // Home is reachable while the composer/notifications overlay is open (they
  // float above the bottom bar, not a separate route — see RootNavigator), so
  // navigating alone doesn't dismiss them: if you're already on Feed, `navigate`
  // is a same-route no-op and the overlay silently stays on top, making Home
  // look broken. Close every overlay first, then navigate.
  function goHome() {
    setDrawerOpen(false);
    closeComposer();
    setNotifOpen(false);
    navigation.navigate('Feed');
  }

  const actions = useMemo<ShellActions>(() => ({
    openDrawer: () => setDrawerOpen(true),
    openComposer: () => setComposerOpen(true),
    openNotifications: () => setNotifOpen(true),
  }), []);

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      {/* Always mounted, sitting behind the pushed content below — only
          becomes visible once that content translates right. Rendered
          outside the padded/animated layer so its own top padding (see
          Drawer.tsx) doesn't double up with the padding below. */}
      <Drawer activeRoute={feedScope} onSelectRoute={goTo} />

      <Animated.View style={[styles.pushed, drawerPushStyle, { backgroundColor: tokens.bg, paddingTop: insets.top + ANDROID_TOP_EXTRA }]}>
        <TopBar
          onOpenDrawer={() => setDrawerOpen(true)}
          onHome={goHome}
          onSearch={q => navigation.navigate('Search', { query: q })}
        />
        <ShellContext.Provider value={actions}>
          <View style={{ flex: 1 }}>{children}</View>
        </ShellContext.Provider>
        <BottomBar
          homeActive={isFeed}
          notificationsActive={notifOpen}
          profileActive={route.name === 'Profile'}
          authorId={session.status === 'ready' ? session.userId : undefined}
          displayName={me?.displayName}
          avatarUrl={me?.avatarUrl}
          onHome={goHome}
          onCreate={() => setComposerOpen(true)}
          onNotifications={() => setNotifOpen(true)}
          onProfile={() => navigation.navigate('Profile')}
        />
        {/* Tap-outside-to-close — conditionally mounted (not just visually
            hidden) so it never intercepts touches while the drawer is
            closed, matching how the overlay group below is gated. */}
        {drawerOpen && <Pressable style={StyleSheet.absoluteFill} onPress={() => setDrawerOpen(false)} />}
      </Animated.View>

      {composerOpen && (
        <ComposerOverlay
          key={loadedDraft?.id ?? 'new'}
          onClose={closeComposer}
          onOpenDrafts={() => setDraftsOpen(true)}
          initialDraft={loadedDraft ? { title: loadedDraft.title, content: loadedDraft.content } : undefined}
        />
      )}
      {draftsOpen && (
        <DraftsSheet
          apiUrl={apiUrl}
          forumId={forumId}
          token={token}
          onClose={() => setDraftsOpen(false)}
          onOpen={draft => { setLoadedDraft(draft); setDraftsOpen(false); }}
        />
      )}
      {notifOpen && <NotificationsOverlay onClose={() => setNotifOpen(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pushed: {
    flex: 1,
  },
});
