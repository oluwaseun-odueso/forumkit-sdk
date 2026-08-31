import type { LLMFn, LLMStreamFn } from '../index';

export function openaiLLM(apiKey: string, model: string): LLMFn {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
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

export function buildOpenAIStreamFn(apiKey: string, model: string): LLMStreamFn {
  return async (systemPrompt: string, userPrompt: string, onChunk: (text: string) => void): Promise<void> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
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
    if (!response.ok) throw new Error(`OpenAI LLM stream error: ${response.status}`);
    if (!response.body) throw new Error('No response body from OpenAI stream');

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
