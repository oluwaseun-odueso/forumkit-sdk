import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { View, StyleSheet, Platform, BackHandler, PanResponder } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type NavigationProp } from '@react-navigation/native';
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
// registerAskHandler runs the other direction — a screen (currently only
// ThreadScreen, via its AiRow) hands Shell a callback for the top bar's Ask
// button to invoke, and unregisters it on unmount. Whether that handler is
// currently registered is also what makes the Ask button enabled/disabled,
// so it's only ever tappable while a thread (the only place with anything
// to ask about) is on screen — mirroring web's TopNav, whose own `onAsk`
// prop is likewise only ever supplied on the Thread route.
type ShellActions = {
  openDrawer: () => void;
  openComposer: () => void;
  openNotifications: () => void;
  registerAskHandler: (fn: (() => void) | null) => void;
  setBottomBarCollapsed: (collapsed: boolean) => void;
};
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
  // Same inline two-role-OR check ThreadScreen.tsx already uses — no shared
  // helper exists for this in either app yet.
  const isModerator = session.status === 'ready' && (session.role === 'moderator' || session.role === 'admin');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<Draft | null>(null);
  const [askHandler, setAskHandler] = useState<(() => void) | null>(null);
  // Reset to false on every mount for free — Shell is mounted fresh inside
  // whichever screen is current (see the useRoute() comment above), so
  // navigating away and back always starts expanded.
  const [bottomBarCollapsed, setBottomBarCollapsed] = useState(false);

  // Drives the "push" drawer — the main content translates right to reveal
  // the drawer panel sitting behind it (see Drawer.tsx), rather than the
  // drawer overlaying on top as a Modal. Same reanimated pattern already
  // used by components/Mascot.tsx.
  const drawerX = useSharedValue(0);
  useEffect(() => {
    drawerX.value = withTiming(drawerOpen ? DRAWER_WIDTH : 0, { duration: 250, easing: Easing.out(Easing.cubic) });
  }, [drawerOpen, drawerX]);
  const drawerPushStyle = useAnimatedStyle(() => ({ transform: [{ translateX: drawerX.value }] }));

  // Drag-to-close for the open drawer — bridges a plain PanResponder into
  // the reanimated `drawerX` shared value (a direct `.value =` assignment
  // from a JS callback is a supported, standard way to drive a shared value
  // without adopting react-native-gesture-handler, matching ThreadScreen.tsx's
  // existing PanResponder-based swipe for the same "avoid a new native
  // dependency" reason). Also subsumes the old tap-to-close behavior — a
  // near-zero-movement release still closes, so replacing the old Pressable
  // with this doesn't lose that.
  const closeDrawerResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        // Dragging left (dx < 0) pushes the content back toward closed;
        // clamped so it can't overshoot past fully open/closed.
        drawerX.value = Math.min(DRAWER_WIDTH, Math.max(0, DRAWER_WIDTH + gesture.dx));
      },
      onPanResponderRelease: (_evt, gesture) => {
        const isTap = Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10;
        const shouldClose = isTap || gesture.dx < -DRAWER_WIDTH / 3 || gesture.vx < -0.5;
        if (shouldClose) {
          setDrawerOpen(false); // the effect above animates drawerX -> 0
        } else {
          drawerX.value = withTiming(DRAWER_WIDTH, { duration: 200, easing: Easing.out(Easing.cubic) });
        }
      },
      onPanResponderTerminate: () => {
        drawerX.value = withTiming(DRAWER_WIDTH, { duration: 200, easing: Easing.out(Easing.cubic) });
      },
    })
  ).current;

  // Edge-swipe-to-open — attached to the pushed Animated.View itself rather
  // than a separate overlay strip, so iOS native swipe-back and child
  // PanResponders (e.g. ThreadScreen's swipe-between-threads) still get first
  // refusal. The trick: onStartShouldSetPanResponder returns false (never
  // eagerly claims the touch), while onMoveShouldSetPanResponder only claims
  // when the touch started within 25px of the left edge and is moving right.
  const touchStartX = useRef(0);
  const openDrawerResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        touchStartX.current = evt.nativeEvent.pageX;
        return false; // don't claim — let children and native gestures go first
      },
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        touchStartX.current < 25 && gesture.dx > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_evt, gesture) => {
        drawerX.value = Math.min(DRAWER_WIDTH, Math.max(0, gesture.dx));
      },
      onPanResponderRelease: (_evt, gesture) => {
        const shouldOpen = gesture.dx > DRAWER_WIDTH / 3 || gesture.vx > 0.5;
        if (shouldOpen) {
          setDrawerOpen(true);
          drawerX.value = withTiming(DRAWER_WIDTH, { duration: 200, easing: Easing.out(Easing.cubic) });
        } else {
          drawerX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
        }
      },
      onPanResponderTerminate: () => {
        drawerX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
      },
    })
  ).current;

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
    // Home is a same-route no-op when already on Feed (see comment above),
    // so Shell doesn't remount and bottomBarCollapsed wouldn't otherwise
    // reset — force it back open here too.
    setBottomBarCollapsed(false);
    navigation.navigate('Feed');
  }

  const actions = useMemo<ShellActions>(() => ({
    openDrawer: () => setDrawerOpen(true),
    openComposer: () => setComposerOpen(true),
    openNotifications: () => setNotifOpen(true),
    // fn is a plain callback, not a state updater — wrap it so useState
    // stores it as a value instead of calling it immediately.
    registerAskHandler: fn => setAskHandler(() => fn),
    setBottomBarCollapsed,
  }), []);

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      {/* Always mounted, sitting behind the pushed content below — only
          becomes visible once that content translates right. Rendered
          outside the padded/animated layer so its own top padding (see
          Drawer.tsx) doesn't double up with the padding below. */}
      <Drawer
        activeRoute={feedScope}
        onSelectRoute={goTo}
        onOpenModeration={isModerator ? () => { setDrawerOpen(false); navigation.navigate('Moderation'); } : undefined}
      />

      <Animated.View style={[styles.pushed, drawerPushStyle, { backgroundColor: tokens.bg, paddingTop: insets.top + ANDROID_TOP_EXTRA }]} {...(!drawerOpen ? openDrawerResponder.panHandlers : {})}>
        <TopBar
          onOpenDrawer={() => setDrawerOpen(true)}
          onHome={goHome}
          onSearch={q => navigation.navigate('Search', { query: q })}
          onAsk={askHandler ?? undefined}
        />
        <ShellContext.Provider value={actions}>
          <View style={{ flex: 1 }}>{children}</View>
        </ShellContext.Provider>
        <BottomBar
          collapsed={bottomBarCollapsed}
          homeActive={isFeed}
          notificationsActive={notifOpen}
          profileActive={route.name === 'Profile'}
          authorId={session.status === 'ready' ? session.userId : undefined}
          displayName={session.profile?.displayName}
          avatarUrl={session.profile?.avatarUrl}
          onHome={goHome}
          onCreate={() => setComposerOpen(true)}
          onNotifications={() => setNotifOpen(true)}
          onProfile={() => navigation.navigate('Profile')}
        />
        {/* Tap-outside-to-close and drag-to-close — conditionally mounted
            (not just visually hidden) so it never intercepts touches while
            the drawer is closed, matching how the overlay group below is
            gated. */}
        {drawerOpen && <View style={StyleSheet.absoluteFill} {...closeDrawerResponder.panHandlers} />}
      </Animated.View>

      {composerOpen && (
        <ComposerOverlay
          key={loadedDraft?.id ?? 'new'}
          onClose={closeComposer}
          onOpenDrafts={() => setDraftsOpen(true)}
          onPosted={threadId => { closeComposer(); navigation.navigate('Thread', { threadId }); }}
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
