import type { ModerateFn } from '../index.js';

export function perspectiveModerate(apiKey: string): ModerateFn {
  return async (text: string) => {
    const response = await fetch(
      `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: { text },
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            IDENTITY_ATTACK: {},
            THREAT: {},
          },
        }),
      },
    );
    if (!response.ok) throw new Error(`Perspective API error: ${response.status}`);
    const data = await response.json() as {
      attributeScores: Record<string, { summaryScore: { value: number } }>;
    };
    const scores = data.attributeScores;
    const toxicity = scores['TOXICITY']?.summaryScore.value ?? 0;
    const flags = Object.entries(scores)
      .filter(([, v]) => v.summaryScore.value > 0.5)
      .map(([k]) => k);
    return { score: toxicity, flags, provider: 'perspective' };
  };
}
