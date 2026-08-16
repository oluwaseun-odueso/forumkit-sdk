import { useState } from 'react';
import { View, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Mascot from '../components/Mascot';
import { HamburgerIcon, SearchIcon, CloseIcon, SunIcon, MoonIcon } from '../components/icons';
import { GradientBorderPill } from '../components/Pill';

const SEARCH_PILL_WIDTH = 300;

// Top bar per design_handoff_forum_kit_mobile/README.md §4 — 52px,
// hamburger / mascot (no wordmark here) / collapsible search / theme
// toggle. Collapsing/expanding search removes the icon button from the
// tree entirely rather than hiding it, matching the spec's "removed from
// the DOM entirely" behavior.
export default function TopBar({ onOpenDrawer, onOpenSearch, onHome }: {
  onOpenDrawer: () => void;
  onOpenSearch?: (() => void) | undefined;
  onHome: () => void;
}) {
  const { tokens, mode, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <View style={[styles.bar, { borderBottomColor: tokens.border, backgroundColor: tokens.nav }]}>
      <Pressable
        onPress={onOpenDrawer}
        style={[styles.hamburgerBtn, { backgroundColor: tokens['surface-2'], borderColor: tokens['border-strong'] }]}
      >
        <HamburgerIcon size={18} color={tokens['text-2']} />
      </Pressable>

      {!searchOpen && (
        <>
          <Pressable onPress={onHome}>
            <Mascot size={24} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => { setSearchOpen(true); onOpenSearch?.(); }} style={styles.searchIconBtn}>
            <SearchIcon size={18} color={tokens['text-2']} />
          </Pressable>
        </>
      )}

      {searchOpen && (
        <>
          <View style={{ flex: 1 }} />
          <GradientBorderPill width={SEARCH_PILL_WIDTH} height={36}>
            <View style={{ paddingLeft: 8, paddingRight: 10, flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
              <Mascot size={20} />
              <TextInput
                placeholder="Find anything"
                placeholderTextColor={tokens.faint}
                style={{ flex: 1, fontSize: 13, color: tokens.text, padding: 0 }}
              />
              <Pressable onPress={() => setSearchOpen(false)}>
                <CloseIcon size={16} color={tokens.muted} />
              </Pressable>
            </View>
          </GradientBorderPill>
          <View style={{ flex: 1 }} />
        </>
      )}

      <Pressable onPress={toggleTheme} style={styles.themeToggle}>
        {mode === 'dark'
          ? <SunIcon size={18} color={tokens['text-2']} />
          : <MoonIcon size={18} color={tokens['text-2']} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  hamburgerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIconBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeToggle: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
