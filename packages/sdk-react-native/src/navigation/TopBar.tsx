import { useState } from 'react';
import { View, Pressable, TextInput, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { useTheme } from '../theme/ThemeContext';
import Mascot from '../components/Mascot';
import { HamburgerIcon, SearchIcon, CloseIcon, SunIcon, MoonIcon, SparkleIcon } from '../components/icons';
import { GradientBorderPill } from '../components/Pill';
import { glassTint, glassPillTint, glassBorderColor, glassFill, GLASS_INTENSITY, LIQUID_GLASS_AVAILABLE } from '../lib/glass';

// Top bar per design_handoff_forum_kit_mobile/README.md §4 — 52px,
// hamburger / mascot (no wordmark here) / collapsible search / theme
// toggle. Collapsing/expanding search removes the icon button from the
// tree entirely rather than hiding it, matching the spec's "removed from
// the DOM entirely" behavior.
export default function TopBar({ onOpenDrawer, onOpenSearch, onHome, onSearch, onAsk }: {
  onOpenDrawer: () => void;
  onOpenSearch?: (() => void) | undefined;
  onHome: () => void;
  onSearch?: ((query: string) => void) | undefined;
  // Mirrors web's TopNav "Ask" pill (sparkle icon + label, inside the search
  // bar) — mobile shows the icon only, given how little width the search
  // pill has to spare. Only ever provided while a thread (the only place
  // with anything to ask about) is on screen, via Shell's registerAskHandler
  // — undefined everywhere else, so the button just doesn't render there,
  // same as web disabling it outside the Thread route.
  onAsk?: (() => void) | undefined;
}) {
  const { tokens, mode, toggleTheme } = useTheme();
  // The expanded search pill (mascot + input) is the default look, matching
  // web's always-visible search bar — collapsing to the icon-only row is a
  // user action (the close button below), not the initial state.
  const [searchOpen, setSearchOpen] = useState(true);
  const [searchText, setSearchText] = useState('');
  // autoFocus only when the user explicitly taps to open search (below) —
  // NOT on the default-open initial mount, or the keyboard would pop open on
  // every screen just from navigating to it.
  const [focusOnOpen, setFocusOnOpen] = useState(false);

  function submitSearch() {
    const q = searchText.trim();
    if (q) onSearch?.(q);
    setSearchOpen(false);
    setSearchText('');
    setFocusOnOpen(false);
  }

  return (
    <View style={[styles.bar, { borderBottomColor: tokens.border, backgroundColor: tokens.bg }]}>
      <Pressable onPress={onOpenDrawer}>
        {/* Same glass treatment as the bottom bar's active tab (see
            BottomBar.tsx) — real Liquid Glass on iOS 26+, frosted blur
            fallback elsewhere. */}
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

      {!searchOpen && (
        <>
          <Pressable onPress={onHome} style={IOS ? { flexShrink: 0, flexGrow: 0, overflow: 'visible' } : undefined}>
            <Mascot size={24} />
          </Pressable>
          <View style={{ flex: 1 }} />
          {onAsk && (
            <Pressable onPress={onAsk} style={styles.searchIconBtn} hitSlop={6}>
              <SparkleIcon size={18} />
            </Pressable>
          )}
          <Pressable onPress={() => { setSearchOpen(true); setFocusOnOpen(true); onOpenSearch?.(); }} style={styles.searchIconBtn}>
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
              autoFocus={focusOnOpen}
              placeholder="Find anything"
              placeholderTextColor={tokens.faint}
              style={{ flex: 1, minWidth: 0, fontSize: 13, color: tokens.text, padding: 0 }}
            />
            {onAsk && (
              <>
                <View style={{ width: 1, height: 16, backgroundColor: tokens.border }} />
                <Pressable onPress={onAsk} hitSlop={6}>
                  <SparkleIcon size={16} />
                </Pressable>
              </>
            )}
            <Pressable onPress={() => { setSearchOpen(false); setSearchText(''); setFocusOnOpen(false); }}>
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
    // borderColor is set per-theme at the call site.
    overflow: 'hidden',
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
