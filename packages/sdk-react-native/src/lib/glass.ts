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
// systemUltraThinMaterial is the most transparent one. Hardcoded to the Light
// variant always, NOT tied to the app's own dark/light theme toggle — an
// earlier version picked Dark whenever the app theme was dark, which is what
// rendered this as a dark bar (Apple's dark material is a genuinely darker,
// smokier glass, not a color we set directly). The reference screenshots
// stay light-glass even over dark content, so this doesn't follow the app
// theme, matching the same call already made for the real Liquid Glass path.
export function glassTint(): BlurTint {
  if (IS_IOS) return 'systemUltraThinMaterialLight';
  return 'light';
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
