import { Platform } from 'react-native';
import type { BlurTint } from 'expo-blur';

// Shared frosted-glass config for the floating bottom bar + hamburger drawer,
// so the two stay identical. The blur "tint" is what makes background content
// bleed through slurry — iOS has true system materials (Control Center / native
// tab-bar glass); systemUltraThinMaterial is the most transparent one. Explicit
// Light/Dark variants are used (not the auto-adapting bare name) because the
// app's own theme toggle can differ from the device appearance. Android has no
// system materials, so it falls back to the plain dark/light experimental blur.
const IS_IOS = Platform.OS === 'ios';

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
