// Deterministic hash-to-color fallback avatar for authors with no uploaded
// profile picture — same author always gets the same color/initial, computed
// purely client-side from data already present (no backend dependency).
//
// Relocated here from sdk-web's lib/author-avatar.ts so both SDKs share ONE
// palette + hash (identical hex values and 135° angle). The palette is stored
// as color PAIRS: sdk-web formats them into a CSS `linear-gradient(...)` string;
// the mobile SDK feeds the pair into a react-native-svg <LinearGradient>
// (React Native has no CSS gradients).

export const AVATAR_GRADIENT_ANGLE = 135;

export const AVATAR_GRADIENT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['#3f7ee2', '#5ee6d0'],
  ['#ff6a3d', '#ff5b7f'],
  ['#8b5cf6', '#3f7ee2'],
  ['#5ee6d0', '#3f7ee2'],
  ['#f0521f', '#ff8a5b'],
  ['#8360c3', '#2ebf91'],
];

const DEFAULT_PAIR: readonly [string, string] = ['#3f7ee2', '#5ee6d0'];

export type AuthorAvatar = { colors: readonly [string, string]; letter: string };

export function authorAvatar(authorId: string | undefined, authorName: string): AuthorAvatar {
  const key = authorId ?? authorName;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return {
    colors: AVATAR_GRADIENT_PAIRS[hash % AVATAR_GRADIENT_PAIRS.length] ?? DEFAULT_PAIR,
    letter: (authorName.trim()[0] ?? '?').toUpperCase(),
  };
}
