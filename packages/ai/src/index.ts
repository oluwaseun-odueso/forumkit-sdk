import type { AIProvider, EmbeddingProvider, ModerationProvider } from '@forumkit/types';

// ── Adapter interfaces ─────────────────────────────────────────────
// These are the contracts every provider must satisfy.
// Swap providers by changing config — the API never knows the difference.

export type EmbedFn = (texts: string[]) => Promise<number[][]>;

export type ModerateResult = {
  score: number;       // 0-1, higher = more toxic
  flags: string[];     // e.g. ['TOXICITY', 'IDENTITY_ATTACK']
  provider: string;
};
export type ModerateFn = (text: string) => Promise<ModerateResult>;

export type LLMFn = (systemPrompt: string, userPrompt: string) => Promise<string>;

export type LLMStreamFn = (
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
) => Promise<void>;

// ── Graceful degradation helpers ───────────────────────────────────

export type AIAdapters = {
  embed: EmbedFn;
  moderate: ModerateFn;
  llm: LLMFn | null;
  askLlm: LLMFn | null;
  askLlmStream: LLMStreamFn | null;
};

type AdapterConfig = {
  aiProvider: AIProvider;
  embeddingProvider: EmbeddingProvider;
  moderationProvider: ModerationProvider;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  openrouterApiKey: string | null;
  aiModel: string | null;
  aiAskModel: string | null;
  perspectiveApiKey: string | null;
};

/**
 * Builds the AI adapter set based on config.
 * Falls back to cloud providers; uses neutral stubs when API keys are absent.
 */
export async function buildAdapters(config: AdapterConfig): Promise<AIAdapters> {
  const embed = await buildEmbedAdapter(config);
  const moderate = await buildModerationAdapter(config);
  const llm = await buildLLMAdapter(config);
  const askLlm = await buildAskLLMAdapter(config);
  const askLlmStream = await buildAskLLMStreamAdapter(config);
  return { embed, moderate, llm, askLlm, askLlmStream };
}

async function buildEmbedAdapter(config: AdapterConfig): Promise<EmbedFn> {
  if (config.openaiApiKey) {
    const { openaiEmbed } = await import('./providers/openai-embed.js');
    return openaiEmbed(config.openaiApiKey);
  }
  // No embedding key available — return empty vectors; vector search degrades gracefully.
  return async (texts: string[]) => texts.map(() => []);
}

async function buildModerationAdapter(config: AdapterConfig): Promise<ModerateFn> {
  if (config.perspectiveApiKey) {
    const { perspectiveModerate } = await import('./providers/perspective.js');
    return perspectiveModerate(config.perspectiveApiKey);
  }
  // No moderation key — publish with neutral score; flag for delayed moderation.
  return async (_text: string) => ({ score: 0, flags: [], provider: 'none' });
}

async function buildLLMAdapter(config: AdapterConfig): Promise<LLMFn | null> {
  const model = config.aiModel;
  if (config.aiProvider === 'anthropic' && config.anthropicApiKey) {
    const { anthropicLLM } = await import('./providers/anthropic.js');
    return anthropicLLM(config.anthropicApiKey, model ?? 'claude-sonnet-4-5');
  }
  if (config.aiProvider === 'openai' && config.openaiApiKey) {
    const { openaiLLM } = await import('./providers/openai-llm.js');
    return openaiLLM(config.openaiApiKey, model ?? 'gpt-4o-mini');
  }
  if (config.aiProvider === 'openrouter' && config.openrouterApiKey) {
    const { openrouterLLM } = await import('./providers/openrouter-llm.js');
    return openrouterLLM(config.openrouterApiKey, model ?? 'anthropic/claude-sonnet-4-5');
  }
  return null;
}

async function buildAskLLMAdapter(config: AdapterConfig): Promise<LLMFn | null> {
  const model = config.aiAskModel;
  if (config.aiProvider === 'anthropic' && config.anthropicApiKey) {
    const { anthropicLLM } = await import('./providers/anthropic.js');
    return anthropicLLM(config.anthropicApiKey, model ?? 'claude-haiku-4-5-20251001');
  }
  if (config.aiProvider === 'openai' && config.openaiApiKey) {
    const { openaiLLM } = await import('./providers/openai-llm.js');
    return openaiLLM(config.openaiApiKey, model ?? 'gpt-4o-mini');
  }
  if (config.aiProvider === 'openrouter' && config.openrouterApiKey) {
    const { openrouterLLM } = await import('./providers/openrouter-llm.js');
    return openrouterLLM(config.openrouterApiKey, model ?? 'anthropic/claude-haiku-4-5-20251001');
  }
  return null;
}

async function buildAskLLMStreamAdapter(config: AdapterConfig): Promise<LLMStreamFn | null> {
  const model = config.aiAskModel;
  if (config.aiProvider === 'anthropic' && config.anthropicApiKey) {
    const { buildAnthropicStreamFn } = await import('./providers/anthropic.js');
    return buildAnthropicStreamFn(config.anthropicApiKey, model ?? 'claude-haiku-4-5-20251001');
  }
  if (config.aiProvider === 'openai' && config.openaiApiKey) {
    const { buildOpenAIStreamFn } = await import('./providers/openai-llm.js');
    return buildOpenAIStreamFn(config.openaiApiKey, model ?? 'gpt-4o-mini');
  }
  if (config.aiProvider === 'openrouter' && config.openrouterApiKey) {
    const { buildOpenRouterStreamFn } = await import('./providers/openrouter-llm.js');
    return buildOpenRouterStreamFn(config.openrouterApiKey, model ?? 'anthropic/claude-haiku-4-5-20251001');
  }
  return null;
}

export * from './adapters/embedding';
export * from './adapters/moderation';
export * from './adapters/llm';
