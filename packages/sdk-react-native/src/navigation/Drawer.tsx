import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { glassTint, glassPillTint, glassFill, GLASS_INTENSITY, LIQUID_GLASS_AVAILABLE } from '../lib/glass';
import Mascot from '../components/Mascot';
import { HomeIcon, PopularIcon, NewsIcon } from '../components/icons';

// See navigation/Shell.tsx — Android's statusBarTranslucent inset still
// lands tighter than iOS, so nudge it down a bit further.
const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

export type DrawerRoute = 'home' | 'popular' | 'news';

// Exported so Shell.tsx's push animation can't drift out of sync with the
// panel's own width.
export const DRAWER_WIDTH = 250;

// Hamburger drawer per README §5 — brand row (mascot + Michroma wordmark),
// Home/Popular/News. Real Apple Liquid Glass on iOS 26+ (matching the bottom
// bar), a frosted blur fallback everywhere else — see lib/glass.ts.
//
// This is just the panel's content now — no Modal, no scrim, no open/close
// state of its own. It's always mounted, absolutely positioned at the left
// edge of Shell's root view, and only becomes visible when Shell translates
// the main content out of the way (a "push" drawer, not an overlay one).
// Shell owns open/close state and the tap-outside-to-close affordance.
export default function Drawer({ activeRoute, onSelectRoute }: {
  // null when the current screen isn't the feed (Thread/Profile/Search) —
  // none of Home/Popular/News apply there, so no row shows active.
  activeRoute: DrawerRoute | null;
  onSelectRoute: (route: DrawerRoute) => void;
}) {
  const { tokens, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const panelContent = (
    <>
      <View style={styles.brandRow}>
        {Platform.OS === 'ios'
          ? <View style={{ flexShrink: 0, flexGrow: 0, overflow: 'visible' }}><Mascot size={24} /></View>
          : <Mascot size={24} />}
        <Text style={[styles.wordmark, { color: tokens.text }]}>FORUM KIT</Text>
      </View>

      <DrawerRow
        label="Home"
        active={activeRoute === 'home'}
        icon={<HomeIcon size={20} color={activeRoute === 'home' ? tokens.text : tokens['text-2']} />}
        onPress={() => onSelectRoute('home')}
      />
      <DrawerRow
        label="Popular"
        active={activeRoute === 'popular'}
        icon={<PopularIcon size={20} color={tokens['text-2']} />}
        onPress={() => onSelectRoute('popular')}
      />
      <DrawerRow
        label="News"
        active={activeRoute === 'news'}
        icon={<NewsIcon size={20} color={tokens['text-2']} />}
        onPress={() => onSelectRoute('news')}
      />
    </>
  );

  return LIQUID_GLASS_AVAILABLE ? (
    <GlassView
      style={[styles.panel, { paddingTop: 16 + insets.top + ANDROID_TOP_EXTRA }]}
      // 'clear' — more transparent, less blurry; see BottomBar.tsx.
      glassEffectStyle="clear"
      // Follows the app's own theme — see lib/glass.ts's glassTint doc
      // comment for why this used to be hardcoded light and no longer is (a
      // light drawer panel over a dark-mode app read as wrong on-device).
      // colorScheme alone doesn't force the render to match — the explicit
      // tintColor does.
      colorScheme={mode}
      tintColor={glassPillTint(mode)}
    >
      {panelContent}
    </GlassView>
  ) : (
    <BlurView
      intensity={GLASS_INTENSITY}
      tint={glassTint(mode)}
      // Android needs this opted in for real blur (see lib/glass.ts).
      blurMethod="dimezisBlurView"
      style={[styles.panel, glassFill(tokens.glass), { paddingTop: 16 + insets.top + ANDROID_TOP_EXTRA }]}
    >
      {panelContent}
    </BlurView>
  );
}

function DrawerRow({ label, icon, active, onPress }: { label: string; icon: React.ReactNode; active: boolean; onPress: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, active && { backgroundColor: tokens['hover-2'] }]}
    >
      {icon}
      <Text style={[styles.rowLabel, { color: active ? tokens.text : tokens['text-2'], fontWeight: active ? '600' : '400' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 16,
  },
  wordmark: {
    // Must match the key useFonts() was called with in ForumKit.tsx exactly
    // — iOS resolves fonts leniently by the name baked into the file's own
    // metadata (so 'Michroma' happened to work there), Android requires the
    // exact registered key and silently falls back to the system font
    // otherwise, which was the platform mismatch here.
    fontFamily: 'Michroma_400Regular',
    fontSize: 11,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  rowLabel: {
    fontSize: 15,
  },
});
