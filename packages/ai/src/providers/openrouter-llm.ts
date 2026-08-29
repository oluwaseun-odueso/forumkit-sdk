import type { LLMFn, LLMStreamFn } from '../index';

const OPENROUTER_HEADERS = {
  'HTTP-Referer': 'https://forumkit.dev',
  'X-Title': 'ForumKit',
};

export function openrouterLLM(apiKey: string, model: string): LLMFn {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...OPENROUTER_HEADERS,
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

export function buildOpenRouterStreamFn(apiKey: string, model: string): LLMStreamFn {
  return async (systemPrompt: string, userPrompt: string, onChunk: (text: string) => void): Promise<void> => {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...OPENROUTER_HEADERS,
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter stream error: ${response.status}`);
    if (!response.body) throw new Error('No response body from OpenRouter stream');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;
        try {
          const evt = JSON.parse(raw) as {
            choices: { delta: { content?: string } }[];
          };
          const text = evt.choices[0]?.delta.content;
          if (text) onChunk(text);
        } catch { /* malformed line */ }
      }
    }
  };
}
