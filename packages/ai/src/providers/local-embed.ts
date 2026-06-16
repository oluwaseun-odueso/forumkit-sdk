import type { EmbedFn } from '../index';

type ExtractorPipeline = (
  text: string,
  opts: { pooling: string; normalize: boolean },
) => Promise<{ data: Float32Array }>;

let extractor: ExtractorPipeline | null = null;

async function getExtractor(): Promise<ExtractorPipeline> {
  if (!extractor) {
    const { pipeline } = await import('@xenova/transformers');
    extractor = (await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
    )) as ExtractorPipeline;
  }
  return extractor;
}

export function localEmbed(): EmbedFn {
  return async (texts: string[]): Promise<number[][]> => {
    const pipe = await getExtractor();
    return Promise.all(
      texts.map(async (text) => {
        const output = await pipe(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data) as number[];
      }),
    );
  };
}
