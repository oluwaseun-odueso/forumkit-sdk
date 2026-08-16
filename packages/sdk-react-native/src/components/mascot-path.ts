// Builds an SVG path for a box with CSS-style independent per-corner
// elliptical border-radius (the `border-radius: h1 h2 h3 h4 / v1 v2 v3 v4`
// shorthand) — used for the mascot's tail and bubble, whose exact silhouette
// comes from asymmetric corner radii in the design spec, not a plain rounded
// rect. Computed geometrically (SVG elliptical arcs) rather than traced by
// eye, so it's faithful to the CSS shape, not just a visual approximation.
//
// hRadii/vRadii are each [topLeft, topRight, bottomRight, bottomLeft] as
// fractions (0–1) of width/height respectively — pass the same value twice
// for a circular (non-elliptical) corner.
export function roundedBlobPath(
  width: number,
  height: number,
  hRadii: [number, number, number, number],
  vRadii: [number, number, number, number],
): string {
  const tlH = hRadii[0] * width, trH = hRadii[1] * width, brH = hRadii[2] * width, blH = hRadii[3] * width;
  const tlV = vRadii[0] * height, trV = vRadii[1] * height, brV = vRadii[2] * height, blV = vRadii[3] * height;

  return [
    `M ${tlH} 0`,
    `L ${width - trH} 0`,
    `A ${trH} ${trV} 0 0 1 ${width} ${trV}`,
    `L ${width} ${height - brV}`,
    `A ${brH} ${brV} 0 0 1 ${width - brH} ${height}`,
    `L ${blH} ${height}`,
    `A ${blH} ${blV} 0 0 1 0 ${height - blV}`,
    `L 0 ${tlV}`,
    `A ${tlH} ${tlV} 0 0 1 ${tlH} 0`,
    'Z',
  ].join(' ');
}
