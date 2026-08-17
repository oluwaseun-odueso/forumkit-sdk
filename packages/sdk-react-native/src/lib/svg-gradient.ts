// Small SVG-gradient helpers shared by the vector components (Mascot, Avatar,
// community/AI gradient borders). React Native has no CSS gradients, so every
// gradient is a react-native-svg <LinearGradient>; these translate a CSS-style
// angle into the x1/y1/x2/y2 endpoints it expects, and hand out unique gradient
// ids (duplicate <linearGradient> ids across a document break the fills).

// CSS `linear-gradient(<angle>deg, …)` -> SVG endpoints. CSS 0deg points "to
// top"; SVG uses a start/end point pair. Same conversion previously inlined in
// Mascot.tsx.
export function linearGradientEndpoints(angleDeg: number): { x1: string; y1: string; x2: string; y2: string } {
  const rad = (angleDeg * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  return {
    x1: `${50 - 50 * sin}%`,
    y1: `${50 + 50 * cos}%`,
    x2: `${50 + 50 * sin}%`,
    y2: `${50 - 50 * cos}%`,
  };
}

let gradientIdCounter = 0;
export function nextGradientId(prefix: string): string {
  gradientIdCounter += 1;
  return `${prefix}${gradientIdCounter}`;
}
