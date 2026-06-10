import type { EmbedFn } from '../index';

export function openaiEmbed(apiKey: string): EmbedFn {
  return async (texts: string[]): Promise<number[][]> => {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
    });
    if (!response.ok) throw new Error(`OpenAI embed error: ${response.status}`);
    const data = await response.json() as { data: { embedding: number[] }[] };
    return data.data.map((d) => d.embedding);
  };
}
