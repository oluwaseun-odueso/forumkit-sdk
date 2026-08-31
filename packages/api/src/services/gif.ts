import type { GifResult } from '@forumkit/types';

const GIPHY_SEARCH_URL = 'https://api.giphy.com/v1/gifs/search';

export type GifError = 'not_configured' | 'provider_error';

type GiphyImage = { url: string; width: string; height: string };
type GiphyGif = {
  id: string;
  title: string;
  images: {
    original: GiphyImage;
    fixed_width_small?: GiphyImage;
    fixed_width?: GiphyImage;
  };
};
type GiphySearchResponse = { data: GiphyGif[] };

// Only ever called with a real apiKey (route checks config.giphyApiKey first)
// — kept as a required param rather than reading config directly so this
// stays easy to unit test without needing to mock the config module.
export async function searchGifs(apiKey: string, query: string, limit: number): Promise<GifResult[] | { error: GifError }> {
  const url = new URL(GIPHY_SEARCH_URL);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('rating', 'g');

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return { error: 'provider_error' };
  }
  if (!res.ok) return { error: 'provider_error' };

  const body = (await res.json()) as GiphySearchResponse;
  return body.data.map((gif) => {
    const preview = gif.images.fixed_width_small ?? gif.images.fixed_width ?? gif.images.original;
    return {
      id: gif.id,
      title: gif.title,
      previewUrl: preview.url,
      url: gif.images.original.url,
      width: Number(gif.images.original.width),
      height: Number(gif.images.original.height),
    };
  });
}
