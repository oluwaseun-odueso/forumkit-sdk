import type { ModerateFn, ModerateResult } from '../index';

type ClassificationResult = { label: string; score: number };
type ClassifierFn = (text: string, opts: unknown) => Promise<ClassificationResult[]>;

let classifier: ClassifierFn | null = null;

async function getClassifier(): Promise<ClassifierFn> {
  if (!classifier) {
    const { pipeline } = await import('@xenova/transformers');
    // multilabel and topk:null are valid at runtime but not in the TS types
    classifier = (await pipeline(
      'text-classification',
      'Xenova/toxic-bert',
      { multilabel: true } as unknown as Parameters<typeof pipeline>[2],
    )) as unknown as ClassifierFn;
  }
  return classifier;
}

export function localModerate(): ModerateFn {
  return async (text: string): Promise<ModerateResult> => {
    const pipe = await getClassifier();
    const results = await pipe(text, { topk: null });
    const toxic = results.find((r) => r.label === 'toxic');
    const score = toxic?.score ?? 0;
    const flags = results
      .filter((r) => r.score > 0.5)
      .map((r) => r.label.toUpperCase());
    return { score, flags, provider: 'local/toxic-bert' };
  };
}
