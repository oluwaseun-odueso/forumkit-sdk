import type { LLMFn } from '../index';

export function openaiLLM(apiKey: string): LLMFn {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenAI LLM error: ${response.status}`);
    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };
    const content = data.choices[0]?.message.content;
    if (!content) throw new Error('No content in OpenAI response');
    return content;
  };
}
