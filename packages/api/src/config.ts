import type { AIProvider, EmbeddingProvider, ModerationProvider } from '@forumkit/types';

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be a number`);
  return parsed;
}

export type Config = {
  databaseUrl: string;
  databasePoolUrl: string;
  forumSecretKey: string;
  port: number;
  logLevel: string;
  nodeEnv: string;
  sessionTtlMinutes: number;
  maxPostLength: number;
  aiProvider: AIProvider;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  moderationProvider: ModerationProvider;
  perspectiveApiKey: string | null;
  embeddingProvider: EmbeddingProvider;
  embeddingDimension: number;
};

export function loadConfig(): Config {
  return {
    databaseUrl: required('DATABASE_URL'),
    databasePoolUrl: optional('DATABASE_POOL_URL', required('DATABASE_URL')),
    forumSecretKey: required('FORUM_SECRET_KEY'),
    port: optionalNumber('PORT', 3000),
    logLevel: optional('LOG_LEVEL', 'info'),
    nodeEnv: optional('NODE_ENV', 'development'),
    sessionTtlMinutes: optionalNumber('SESSION_TTL_MINUTES', 15),
    maxPostLength: optionalNumber('MAX_POST_LENGTH', 10000),
    aiProvider: optional('AI_PROVIDER', 'local') as AIProvider,
    openaiApiKey: process.env['OPENAI_API_KEY'] ?? null,
    anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? null,
    moderationProvider: optional('MODERATION_PROVIDER', 'local') as ModerationProvider,
    perspectiveApiKey: process.env['PERSPECTIVE_API_KEY'] ?? null,
    embeddingProvider: optional('EMBEDDING_PROVIDER', 'local') as EmbeddingProvider,
    embeddingDimension: optionalNumber('EMBEDDING_DIMENSION', 384),
  };
}
