import { useState } from 'react';
import { View, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import Mascot from '../components/Mascot';
import { HamburgerIcon, SearchIcon, CloseIcon, SunIcon, MoonIcon } from '../components/icons';
import { GradientBorderPill } from '../components/Pill';

// Top bar per design_handoff_forum_kit_mobile/README.md §4 — 52px,
// hamburger / mascot (no wordmark here) / collapsible search / theme
// toggle. Collapsing/expanding search removes the icon button from the
// tree entirely rather than hiding it, matching the spec's "removed from
// the DOM entirely" behavior.
export default function TopBar({ onOpenDrawer, onOpenSearch, onHome, onSearch }: {
  onOpenDrawer: () => void;
  onOpenSearch?: (() => void) | undefined;
  onHome: () => void;
  onSearch?: ((query: string) => void) | undefined;
}) {
  const { tokens, mode, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  function submitSearch() {
    const q = searchText.trim();
    if (q) onSearch?.(q);
    setSearchOpen(false);
    setSearchText('');
  }

  return (
    <View style={[styles.bar, { borderBottomColor: tokens.border, backgroundColor: tokens.bg }]}>
      <Pressable
        onPress={onOpenDrawer}
        style={[styles.hamburgerBtn, { backgroundColor: tokens['surface-2'], borderColor: tokens['border-strong'] }]}
      >
        <HamburgerIcon size={18} color={tokens['text-2']} />
      </Pressable>

      {!searchOpen && (
        <>
          <Pressable onPress={onHome} style={IOS ? { flexShrink: 0, flexGrow: 0, overflow: 'visible' } : undefined}>
            <Mascot size={24} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => { setSearchOpen(true); onOpenSearch?.(); }} style={styles.searchIconBtn}>
            <SearchIcon size={18} color={tokens['text-2']} />
          </Pressable>
        </>
      )}

      {searchOpen && (
        <GradientBorderPill height={36}>
          <View style={{ paddingLeft: 8, paddingRight: 10, flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8, overflow: 'visible' }}>
            {/* Explicit 20×20 square box, both platforms — the mascot is the
                only icon in a row also containing a flex:1 TextInput, so
                without a pinned square its wrapper's size was left to flex
                resolution and the icon picked up a slightly off aspect ratio
                ("oblong") that the top-bar/drawer mascots (no flex sibling
                pressure) never showed. width===height + center guarantees
                square; overflow:'visible' keeps the badge overhang. */}
            <View style={{ width: 20, height: 20, flexShrink: 0, flexGrow: 0, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
              <Mascot size={20} />
            </View>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
              autoFocus
              placeholder="Find anything"
              placeholderTextColor={tokens.faint}
              style={{ flex: 1, minWidth: 0, fontSize: 13, color: tokens.text, padding: 0 }}
            />
            <Pressable onPress={() => { setSearchOpen(false); setSearchText(''); }}>
              <CloseIcon size={16} color={tokens.muted} />
            </Pressable>
          </View>
        </GradientBorderPill>
      )}

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
