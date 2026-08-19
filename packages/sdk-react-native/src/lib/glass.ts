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
// systemUltraThinMaterial is the most transparent one. Explicit Light/Dark
// variants are used (not the auto-adapting bare name) because the app's own
// theme toggle can differ from the device appearance. Android has no system
// materials, so it falls back to the plain dark/light experimental blur.

export function glassTint(mode: 'dark' | 'light'): BlurTint {
  if (IS_IOS) return mode === 'dark' ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';
  return mode === 'dark' ? 'dark' : 'light';
}

// iOS system materials define their own transparency, so intensity runs full;
// Android's experimental blur is cruder and reads less muddy a bit lower.
export const GLASS_INTENSITY = IS_IOS ? 100 : 70;

// iOS: no color fill — the material IS the glass, a tint would only make it
// more opaque. Android: a faint tint keeps it visible against busy content.
export function glassFill(glassToken: string): { backgroundColor: string } | null {
  return IS_IOS ? null : { backgroundColor: glassToken };
}
