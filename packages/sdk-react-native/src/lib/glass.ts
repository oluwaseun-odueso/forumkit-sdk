import { Platform } from 'react-native';
import type { BlurTint } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';

const IS_IOS = Platform.OS === 'ios';

// True Apple Liquid Glass (iOS 26+, expo-glass-effect's GlassView/
// GlassContainer) — the actual "iOS buttons" material with real specular
// highlights and lensing, not a blur-plus-tint approximation. Everywhere else
// (older iOS, Android — the package is iOS-only) falls back to expo-blur's
// frosted system material below, which is real optical blur but not Liquid
// Glass's rendering. Computed once: this can't change during a session.
export const LIQUID_GLASS_AVAILABLE = isLiquidGlassAvailable();

// ── expo-blur fallback config (older iOS + Android) ────────────────────────
// Shared so the floating bottom bar and hamburger drawer stay identical. The
// blur "tint" is what makes background content bleed through slurry — iOS has
// true system materials (Control Center / native tab-bar glass);
// systemUltraThinMaterial is the most transparent one.
//
// This used to be hardcoded to the Light variant always, regardless of the
// app's own dark/light theme — reasoned from reference screenshots that
// stayed light-glass even over dark content. On an actual device in dark
// mode that reads as wrong (a bright light panel sitting on top of an
// otherwise dark UI), so this now follows the app theme after all. An
// earlier attempt at that (before the light-always hardcoding) rendered
// Apple's plain `...MaterialDark` as an overly dark/smokey blob — paired
// here with an explicit, moderate tintColor (glassPillTint/glassBarTint
// below) rather than leaving the system material to carry the whole look,
// which is what made that first attempt murky.
export function glassTint(mode: 'light' | 'dark' = 'light'): BlurTint {
  if (IS_IOS) return mode === 'dark' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';
  return mode;
}

// Solid tintColor for the real Liquid Glass path (GlassView's `tintColor` +
// `colorScheme` props) — same light/dark split as glassTint above, for the
// small pill-shaped surfaces (hamburger button, active bottom-bar tab,
// drawer panel isn't a pill but uses the same tone).
export function glassPillTint(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? '#2c2c2e' : '#ffffff';
}

// Same idea as glassPillTint, for the bottom bar's own translucent base
// layer, which uses a warmer, more opaque tint than the plain white pill.
export function glassBarTint(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? '#1c1c1e7d' : '#d5d2d27d';
}

// The faint hairline border every glass surface (hamburger button, bottom
// bar) draws around itself to separate it from whatever's behind it — was a
// flat light-only rgba(255,255,255,...), which read as a bright ring around
// a dark-mode surface. Dark mode gets a dimmer white line instead of a
// brighter one, matching how these surfaces already invert their fill.
export function glassBorderColor(mode: 'light' | 'dark'): string {
  return mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.55)';
}

// Intensity is how much of the blur effect is "applied" (expo-blur drives it
// as an animation-progress value) — lower means more transparent and less
// blurry. iOS ran full (100) on the assumption the system material's own
// transparency was enough; per feedback (more transparent, less blurry) it's
// dialed back, matching the same call made for the real Liquid Glass path's
// 'clear' style.
export const GLASS_INTENSITY = IS_IOS ? 65 : 70;

// iOS: no color fill — the material IS the glass, a tint would only make it
// more opaque. Android: a faint tint keeps it visible against busy content.
export function glassFill(glassToken: string): { backgroundColor: string } | null {
  return IS_IOS ? null : { backgroundColor: glassToken };
}
