import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import Mascot from '../components/Mascot';
import { HomeIcon, PopularIcon, NewsIcon, ShieldIcon } from '../components/icons';

// See navigation/Shell.tsx — Android's statusBarTranslucent inset still
// lands tighter than iOS, so nudge it down a bit further.
const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

export type DrawerRoute = 'home' | 'popular' | 'news';

// Exported so Shell.tsx's push animation can't drift out of sync with the
// panel's own width.
export const DRAWER_WIDTH = 300;

// Hamburger drawer per README §5 — brand row (mascot + Michroma wordmark),
// Home/Popular/News.
//
// This used to render as real Apple Liquid Glass / a frosted blur — Apple's
// Liquid Glass material is inherently translucent/refractive by design, so
// even a fully opaque tintColor is only a "tint hint" for a see-through
// effect, not a guaranteed solid render; how dark it actually reads still
// depends on what's visually behind it. That's an inherent platform trait,
// not something further tint-tuning can reliably fix. A navigation panel
// benefits from guaranteed-correct contrast more than it benefits from
// glassiness, so this now uses the same plain, reliable per-theme surface
// color every other screen in the app already uses — glass stays on the
// hamburger button and bottom bar, where translucent-over-content still
// makes sense for a small floating element.
//
// This is just the panel's content now — no Modal, no scrim, no open/close
// state of its own. It's always mounted, absolutely positioned at the left
// edge of Shell's root view, and only becomes visible when Shell translates
// the main content out of the way (a "push" drawer, not an overlay one).
// Shell owns open/close state and the tap-outside-to-close affordance.
export default function Drawer({ activeRoute, onSelectRoute, onOpenModeration }: {
  // null when the current screen isn't the feed (Thread/Profile/Search) —
  // none of Home/Popular/News apply there, so no row shows active.
  activeRoute: DrawerRoute | null;
  onSelectRoute: (route: DrawerRoute) => void;
  // Deliberately a separate prop rather than widening DrawerRoute/
  // onSelectRoute, which are scoped specifically to feed-scope selection —
  // Moderation is a real navigation target, not a feed scope. Only passed
  // by Shell.tsx for moderator/admin sessions; the row itself is omitted
  // (not just disabled) for everyone else.
  onOpenModeration?: (() => void) | undefined;
}) {
  const { tokens, mode } = useTheme();
  const insets = useSafeAreaInsets();
  // Dark mode specifically wants this close to the feed's own background
  // (tokens.bg) rather than the lighter surface-2 shade used everywhere
  // else — tokens.nav is the next step up from bg in the dark palette,
  // close enough to read as "the same background" while still being a
  // distinct, defined panel. Light mode is unaffected.
  const panelBg = mode === 'dark' ? tokens.nav : tokens['surface-2'];

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: panelBg, paddingTop: 16 + insets.top + ANDROID_TOP_EXTRA },
      ]}
    >
      <View style={styles.brandRow}>
        {Platform.OS === 'ios'
          ? <View style={{ flexShrink: 0, flexGrow: 0, overflow: 'visible' }}><Mascot size={24} /></View>
          : <Mascot size={24} />}
        <Text style={[styles.wordmark, { color: tokens.text }]}>FORUM KIT</Text>
      </View>

      <DrawerRow
        label="Home"
        active={activeRoute === 'home'}
        icon={<HomeIcon size={20} color={activeRoute === 'home' ? tokens.text : tokens['text-2']} active={activeRoute === 'home'} />}
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
      {onOpenModeration && (
        <DrawerRow
          label="Moderation"
          active={false}
          icon={<ShieldIcon size={20} color={tokens['text-2']} />}
          onPress={onOpenModeration}
        />
      )}
    </View>
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
    // iOS shadow — cast to the right to mimic the drawer lifting off the content
    shadowColor: '#000',
    shadowOffset: { width: 16, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    // Android elevation
    elevation: 24,
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
