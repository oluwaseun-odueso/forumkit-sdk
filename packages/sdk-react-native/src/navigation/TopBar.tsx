import { View, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { HamburgerIcon, SparkleIcon, SunIcon, MoonIcon } from '../components/icons';
import { GradientBorderPill } from '../components/Pill';
import { glassTint, glassPillTint, glassBorderColor, glassFill, GLASS_INTENSITY, LIQUID_GLASS_AVAILABLE } from '../lib/glass';

// Top bar per design_handoff_forum_kit_mobile/README.md §4 — 52px,
// hamburger / mascot (no wordmark here) / collapsible search / theme
// toggle. Tapping the search pill opens SearchInputScreen (a full-screen
// modal) rather than expanding an inline TextInput here, which keeps the
// top bar simple and gives the search entry page full-screen real estate.
export default function TopBar({ onOpenDrawer, onOpenSearch, onHome, query }: {
  onOpenDrawer: () => void;
  onOpenSearch?: (() => void) | undefined;
  onHome: () => void;
  // When the current route is Search, the active query is shown in the pill
  // so the user can see what they searched for.
  query?: string | undefined;
}) {
  const { tokens, mode, toggleTheme } = useTheme();
  const route = useRoute();
  const isSearch = route.name === 'Search';

  return (
    <View style={[styles.bar, { borderBottomColor: tokens.border, backgroundColor: tokens.bg, borderBottomWidth: isSearch ? 0 : 1 }]}>
      <Pressable onPress={onOpenDrawer}>
        {LIQUID_GLASS_AVAILABLE ? (
          <GlassView
            style={[styles.hamburgerBtn, { borderColor: glassBorderColor(mode) }]}
            glassEffectStyle="clear"
            colorScheme={mode}
            tintColor={glassPillTint(mode)}
            isInteractive
          >
            <HamburgerIcon size={18} color={tokens['text-2']} />
          </GlassView>
        ) : (
          <BlurView
            intensity={GLASS_INTENSITY}
            tint={glassTint(mode)}
            blurMethod="dimezisBlurView"
            style={[styles.hamburgerBtn, glassFill(tokens.glass), { borderColor: glassBorderColor(mode) }]}
          >
            <HamburgerIcon size={18} color={tokens['text-2']} />
          </BlurView>
        )}
      </Pressable>

      <Pressable style={styles.pillWrap} onPress={onOpenSearch}>
        <GradientBorderPill height={40}>
          <View style={styles.pillRow}>
            <TextInput
              editable={false}
              value={query ?? ''}
              placeholder="Find anything"
              placeholderTextColor={tokens.faint}
              style={[styles.pillInput, { color: tokens.text }]}
              pointerEvents="none"
            />
            <View style={[styles.pillDivider, { backgroundColor: tokens.border }]} />
            <SparkleIcon size={18} />
          </View>
        </GradientBorderPill>
      </Pressable>

      <Pressable onPress={toggleTheme} style={styles.themeToggle}>
        {mode === 'dark'
          ? <SunIcon size={18} color={tokens['text-2']} />
          : <MoonIcon size={18} color={tokens['text-2']} />}
      </Pressable>
    </View>
  );
}

const IOS = Platform.OS === 'ios';

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  hamburgerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillWrap: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 6,
  },
  pillRow: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 8,
    overflow: 'visible',
  },
  pillInput: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 15,
    padding: 0,
  },
  pillDivider: {
    width: 1,
    height: 17,
    marginHorizontal: 2,
    marginTop: 4,
  },
  themeToggle: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
