import { useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import TopBar from './TopBar';
import BottomBar from './BottomBar';
import Drawer, { type DrawerRoute } from './Drawer';
import ComposerOverlay from './ComposerOverlay';
import NotificationsOverlay from './NotificationsOverlay';
import type { RootStackParamList } from './RootNavigator';

// Persistent chrome around Feed/Thread/Profile — mirrors sdk-web's Shell
// component (top bar + content + the app's other persistent nav), adapted
// to the mobile design's floating bottom bar + drawer instead of a sidebar.
// Composer/Notifications render here as overlays (not navigation routes) —
// see the comment in RootNavigator.tsx for why.
export default function Shell({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
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

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      <TopBar onOpenDrawer={() => setDrawerOpen(true)} onHome={() => navigation.navigate('Feed')} />
      <View style={{ flex: 1 }}>{children}</View>
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
