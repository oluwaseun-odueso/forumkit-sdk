import type { LLMFn } from '../index';

export function openrouterLLM(apiKey: string, model: string): LLMFn {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://forumkit.dev',
        'X-Title': 'ForumKit',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);
    const data = await response.json() as {
      choices: { message: { content: string } }[];
    };
    const content = data.choices[0]?.message.content;
    if (!content) throw new Error('No content in OpenRouter response');
    return content;
  };
}
