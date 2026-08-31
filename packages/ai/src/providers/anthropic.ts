import type { LLMFn, LLMStreamFn } from '../index';

export function anthropicLLM(apiKey: string, model: string): LLMFn {
  return async (systemPrompt: string, userPrompt: string): Promise<string> => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
    const data = await response.json() as { content: { type: string; text: string }[] };
    const text = data.content.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error('No text in Anthropic response');
    return text;
  };
}

export function buildAnthropicStreamFn(apiKey: string, model: string): LLMStreamFn {
  return async (systemPrompt: string, userPrompt: string, onChunk: (text: string) => void): Promise<void> => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
    if (!response.body) throw new Error('No response body from Anthropic stream');

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
            type: string;
            delta?: { type: string; text: string };
          };
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            onChunk(evt.delta.text);
          }
        } catch { /* malformed line */ }
      }
    }
  };
}
