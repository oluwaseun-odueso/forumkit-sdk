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
  publicApiUrl: string;
  logLevel: string;
  nodeEnv: string;
  sessionTtlMinutes: number;
  maxPostLength: number;
  aiProvider: AIProvider;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  openrouterApiKey: string | null;
  aiModel: string | null;
  moderationProvider: ModerationProvider;
  perspectiveApiKey: string | null;
  embeddingProvider: EmbeddingProvider;
  embeddingDimension: number;
  storageS3Endpoint: string | null;
  storageS3Bucket: string;
  storageS3Region: string;
  storageS3AccessKeyId: string;
  storageS3SecretAccessKey: string;
  storageMaxFileSizeBytes: number;
  storageAllowedMimeTypes: string[];
  giphyApiKey: string | null;
};

export function loadConfig(): Config {
  return {
    databaseUrl: required('DATABASE_URL'),
    databasePoolUrl: optional('DATABASE_POOL_URL', required('DATABASE_URL')),
    forumSecretKey: required('FORUM_SECRET_KEY'),
    port: optionalNumber('PORT', 3000),
    publicApiUrl: optional('PUBLIC_API_URL', `http://localhost:${optionalNumber('PORT', 3000)}`),
    logLevel: optional('LOG_LEVEL', 'info'),
    nodeEnv: optional('NODE_ENV', 'development'),
    sessionTtlMinutes: optionalNumber('SESSION_TTL_MINUTES', 15),
    maxPostLength: optionalNumber('MAX_POST_LENGTH', 10000),
    aiProvider: optional('AI_PROVIDER', 'openrouter') as AIProvider,
    openaiApiKey: process.env['OPENAI_API_KEY'] ?? null,
    anthropicApiKey: process.env['ANTHROPIC_API_KEY'] ?? null,
    openrouterApiKey: process.env['OPENROUTER_API_KEY'] ?? null,
    aiModel: process.env['AI_MODEL'] ?? null,
    moderationProvider: optional('MODERATION_PROVIDER', 'local') as ModerationProvider,
    perspectiveApiKey: process.env['PERSPECTIVE_API_KEY'] ?? null,
    embeddingProvider: optional('EMBEDDING_PROVIDER', 'local') as EmbeddingProvider,
    embeddingDimension: optionalNumber('EMBEDDING_DIMENSION', 384),
    storageS3Endpoint: process.env['STORAGE_S3_ENDPOINT'] ?? null,
    storageS3Bucket: required('STORAGE_S3_BUCKET'),
    storageS3Region: required('STORAGE_S3_REGION'),
    storageS3AccessKeyId: required('STORAGE_S3_ACCESS_KEY_ID'),
    storageS3SecretAccessKey: required('STORAGE_S3_SECRET_ACCESS_KEY'),
    storageMaxFileSizeBytes: optionalNumber('STORAGE_MAX_FILE_SIZE_BYTES', 26_214_400),
    storageAllowedMimeTypes: optional(
      'STORAGE_ALLOWED_MIME_TYPES',
      'image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm',
    ).split(','),
    giphyApiKey: process.env['GIPHY_API_KEY'] ?? null,
  };
}
