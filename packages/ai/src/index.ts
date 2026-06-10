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

// ── Graceful degradation helpers ───────────────────────────────────

export type AIAdapters = {
  embed: EmbedFn;
  moderate: ModerateFn;
  llm: LLMFn;
};

type AdapterConfig = {
  aiProvider: AIProvider;
  embeddingProvider: EmbeddingProvider;
  moderationProvider: ModerationProvider;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  perspectiveApiKey: string | null;
};

/**
 * Builds the AI adapter set based on config.
 * Falls back to local/stub implementations when API keys are absent.
 */
export async function buildAdapters(config: AdapterConfig): Promise<AIAdapters> {
  const embed = await buildEmbedAdapter(config);
  const moderate = await buildModerationAdapter(config);
  const llm = await buildLLMAdapter(config);
  return { embed, moderate, llm };
}

async function buildEmbedAdapter(config: AdapterConfig): Promise<EmbedFn> {
  if (config.embeddingProvider === 'openai' && config.openaiApiKey) {
    const { openaiEmbed } = await import('./providers/openai-embed.js');
    return openaiEmbed(config.openaiApiKey);
  }
  // Default: local model
  const { localEmbed } = await import('./providers/local-embed.js');
  return localEmbed();
}

async function buildModerationAdapter(config: AdapterConfig): Promise<ModerateFn> {
  if (config.moderationProvider === 'perspective' && config.perspectiveApiKey) {
    const { perspectiveModerate } = await import('./providers/perspective.js');
    return perspectiveModerate(config.perspectiveApiKey);
  }
  const { localModerate } = await import('./providers/local-moderate.js');
  return localModerate();
}

async function buildLLMAdapter(config: AdapterConfig): Promise<LLMFn> {
  if (config.aiProvider === 'anthropic' && config.anthropicApiKey) {
    const { anthropicLLM } = await import('./providers/anthropic.js');
    return anthropicLLM(config.anthropicApiKey);
  }
  if (config.aiProvider === 'openai' && config.openaiApiKey) {
    const { openaiLLM } = await import('./providers/openai-llm.js');
    return openaiLLM(config.openaiApiKey);
  }
  // Stub: returns a placeholder when no LLM is configured
  return async (_system, _user) => '[AI assistant is not configured for this deployment]';
}

export * from './adapters/embedding';
export * from './adapters/moderation';
export * from './adapters/llm';
