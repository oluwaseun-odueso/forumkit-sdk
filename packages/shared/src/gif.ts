import type { GifResult } from '@forumkit/types';

// Composers insert this placeholder instead of GIPHY's own long CDN url, so
// the raw link is never visible while composing. Carries width/height too,
// so renderers can size the GIF to its real aspect ratio instead of always
// stretching to a fixed box. Renderers expand the id back to a real url via
// GIPHY's documented id-only CDN convention.
const GIPHY_PLACEHOLDER_PREFIX = 'giphy:';

export function buildGiphyPlaceholder(gif: Pick<GifResult, 'id' | 'width' | 'height'>): string {
  return `${GIPHY_PLACEHOLDER_PREFIX}${gif.id}:${gif.width}x${gif.height}`;
}

export function resolveGiphyUrl(urlOrPlaceholder: string): string {
  if (!urlOrPlaceholder.startsWith(GIPHY_PLACEHOLDER_PREFIX)) return urlOrPlaceholder;
  const id = urlOrPlaceholder.slice(GIPHY_PLACEHOLDER_PREFIX.length).split(':')[0];
  return `https://media.giphy.com/media/${id}/giphy.gif`;
}

export function parseGiphyDimensions(urlOrPlaceholder: string): { width: number; height: number } | null {
  const match = /:(\d+)x(\d+)$/.exec(urlOrPlaceholder);
  if (!match) return null;
  return { width: parseInt(match[1]!, 10), height: parseInt(match[2]!, 10) };
}

export function buildGiphyMarkdown(gif: Pick<GifResult, 'id' | 'width' | 'height'>): string {
  return `![gif](${buildGiphyPlaceholder(gif)})`;
}

// Caps real dimensions to a preview box, scaling down proportionally and
// never up — shared so web and RN render GIFs at the same effective size.
export function fitGifDimensions(
  dims: { width: number; height: number } | null,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (!dims || dims.width <= 0 || dims.height <= 0) return { width: maxWidth, height: maxHeight };
  const scale = Math.min(1, maxWidth / dims.width, maxHeight / dims.height);
  return { width: Math.round(dims.width * scale), height: Math.round(dims.height * scale) };
}
