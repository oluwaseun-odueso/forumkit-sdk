import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import TopBar from './TopBar';
import BottomBar from './BottomBar';
import Drawer, { type DrawerRoute } from './Drawer';
import ComposerOverlay from './ComposerOverlay';
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  function goTo(route: DrawerRoute) {
    setDrawerOpen(false);
    if (route === 'home') navigation.navigate('Feed');
    // Popular/News don't have real screens yet in this step — the drawer
    // row itself still needs to exist and be tappable per the spec, it
    // just has nowhere real to go until the feed's scope filtering ships.
  }

  const actions = useMemo<ShellActions>(() => ({
    openDrawer: () => setDrawerOpen(true),
    openComposer: () => setComposerOpen(true),
    openNotifications: () => setNotifOpen(true),
  }), []);

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg, paddingTop: insets.top + ANDROID_TOP_EXTRA }]}>
      <TopBar onOpenDrawer={() => setDrawerOpen(true)} onHome={() => navigation.navigate('Feed')} />
      <ShellContext.Provider value={actions}>
        <View style={{ flex: 1 }}>{children}</View>
      </ShellContext.Provider>
      <BottomBar
        onHome={() => navigation.navigate('Feed')}
        onCreate={() => setComposerOpen(true)}
        onNotifications={() => setNotifOpen(true)}
        onProfile={() => navigation.navigate('Profile')}
      />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} activeRoute="home" onSelectRoute={goTo} />
      {composerOpen && <ComposerOverlay onClose={() => setComposerOpen(false)} />}
      {notifOpen && <NotificationsOverlay onClose={() => setNotifOpen(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
