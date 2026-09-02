# ForumKit Self-Hosting Guide

ForumKit is designed to run entirely on infrastructure you control. This guide covers
two deployment paths: local Docker Compose (development and self-hosted production) and
Supabase (managed PostgreSQL with pgvector).

---

## Prerequisites

- Docker and Docker Compose v2
- Node.js 20 LTS and npm 10+
- A `FORUM_SECRET_KEY` — any long random string, used to sign JWTs

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Option A: Docker Compose (recommended for self-hosting)

This starts a PostgreSQL 16 + pgvector database and the ForumKit API together.

### 1. Clone and configure

```bash
git clone https://github.com/oluwaseun-odueso/forumkit-sdk.git
cd forumkit-sdk
cp .env.example .env
```

Edit `.env` and set at minimum:

```bash
DATABASE_URL=postgresql://forumkit:forumkit@db:5432/forumkit
DATABASE_POOL_URL=postgresql://forumkit:forumkit@db:5432/forumkit
FORUM_SECRET_KEY=your-generated-secret-here
```

### 2. Start the stack

```bash
docker compose --env-file .env -f deploy/docker-compose.dev.yml up -d
```

`--env-file .env` matters here — without it, Compose looks for `.env` next to the compose
file (`deploy/.env`) rather than the one you just created at the project root, and your
edits above would be silently ignored in favour of the file's local-dev defaults.

This starts:
- `db` — PostgreSQL 16 + pgvector on port 5433 (host-mapped to avoid conflicts)
- `minio` — local S3-compatible storage, standing in for a real bucket (see Storage below)
- `api` — ForumKit API on port 3000

### 3. Run migrations

```bash
npm run db:migrate
```

### 4. (Optional) Seed development data

```bash
npm run db:seed
```

### 5. Verify

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

---

## Option B: Supabase (managed PostgreSQL)

Supabase provides a hosted PostgreSQL 15+ instance with pgvector enabled.

### 1. Create a project

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Choose a region close to your users.
3. Note your project ref (the subdomain in your project URL).

### 2. Enable pgvector

In the Supabase dashboard: **Database > Extensions > vector** — enable it.

### 3. Get your connection strings

From **Project Settings > Database**:

- **Direct connection** (port 5432) — use for `DATABASE_URL` (migrations only)
- **Session pooler** (port 5432) — use for `DATABASE_POOL_URL` (application runtime)

> Supabase's transaction pooler (port 6543) does not support prepared statements and
> will cause errors with the `postgres` npm package. Use the session pooler instead.

### 4. Configure `.env`

```bash
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
DATABASE_POOL_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
FORUM_SECRET_KEY=your-generated-secret-here
```

### 5. Run migrations

```bash
npm run db:migrate
```

---

## Environment variables

All variables are documented in `.env.example`. Key ones:

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | Direct Postgres connection string. Used for migrations only. |
| `DATABASE_POOL_URL` | Pooled connection string. Used by the application at runtime. Falls back to `DATABASE_URL` if not set. |
| `FORUM_SECRET_KEY` | Shared secret for signing and verifying JWTs. Must match across all API instances. |

### Storage (required — no local-disk fallback)

Every integrator needs an S3-compatible bucket for image/video uploads: AWS S3,
Cloudflare R2, Backblaze B2, Supabase Storage, or (for local dev/self-hosting without
an external account) the bundled MinIO container — `docker-compose.dev.yml` already
points these at MinIO by default, so you only need to fill these in yourself if you're
using a real provider instead.

| Variable | Default | Description |
|---|---|---|
| `STORAGE_S3_ENDPOINT` | `http://minio:9000` | Leave unset for real AWS S3; set for any other S3-compatible provider (R2, B2, Supabase Storage, or MinIO). |
| `STORAGE_S3_BUCKET` | `forumkit-dev` | Bucket name. |
| `STORAGE_S3_REGION` | `us-east-1` | Bucket region. |
| `STORAGE_S3_ACCESS_KEY_ID` | `forumkit` | — |
| `STORAGE_S3_SECRET_ACCESS_KEY` | `forumkit-dev` | — |
| `STORAGE_MAX_FILE_SIZE_BYTES` | `26214400` | 25MB. |
| `STORAGE_ALLOWED_MIME_TYPES` | `image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm` | Comma-separated. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `GIPHY_API_KEY` | — | Powers the comment composer's GIF picker. Left blank, the picker stays a disabled "coming soon" panel instead of erroring — get a key at [developers.giphy.com](https://developers.giphy.com). |

### AI providers (all optional — every AI feature no-ops gracefully without a key)

Unlike the LLM-backed features, moderation and search currently have **no local/offline
fallback model** — without a key, they silently degrade (posts publish unscored, search
falls back to keyword-only) rather than actually running locally, despite `local` still
being a listed value below for forward-compatibility.

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `openrouter` | `openai`, `anthropic`, or `openrouter` — which key below is used for Summarise/Suggest/Ask AI. No `local` option; one of the three keys is required for these features to run at all. |
| `ANTHROPIC_API_KEY` | — | Required when `AI_PROVIDER=anthropic`. |
| `OPENAI_API_KEY` | — | Required when `AI_PROVIDER=openai`. Also used for embeddings when `EMBEDDING_PROVIDER=openai`. |
| `OPENROUTER_API_KEY` | — | Required when `AI_PROVIDER=openrouter` (the default). |
| `AI_MODEL` | — | Summarise/Suggest model; provider-specific default if unset. |
| `AI_ASK_MODEL` | — | A cheaper/faster model just for Ask AI; defaults to a smaller model than `AI_MODEL` if unset. |
| `EMBEDDING_PROVIDER` | `local` | `local` is currently a no-op (no model behind it) — search falls back to keyword-only. `openai` uses text-embedding-3-small (1536 dims) for real semantic search. |
| `EMBEDDING_DIMENSION` | `1536` | Must match the provider: 384 if you restore a local model, 1536 for OpenAI. **Set this before running migrations** — changing it on an existing database requires recreating the embedding columns. |
| `MODERATION_PROVIDER` | `local` | `local` is currently a no-op — every post publishes with `toxicity_score: 0` and no flags. `perspective` uses Google's real Perspective API. |
| `PERSPECTIVE_API_KEY` | — | Required when `MODERATION_PROVIDER=perspective`. |

### Application

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port the API listens on. |
| `LOG_LEVEL` | `info` | `error` `warn` `info` `debug`. Use `info` or `warn` in production. |
| `NODE_ENV` | `development` | Set to `production` in production. Disables pretty-print logging. |
| `SESSION_TTL_MINUTES` | `15` | How long ForumKit session tokens are valid before the SDK re-exchanges. |
| `MAX_POST_LENGTH` | `10000` | Maximum character length of a post body. |
| `PUBLIC_API_URL` | `http://localhost:$PORT` | The public URL this API is reachable at — used to build download links for uploaded attachments (avatars, post/comment images). **Set this to your real public domain in production** (e.g. `https://forum.yourapp.com`); the `localhost` default only resolves for clients on the same machine as the API. |

---

## Production checklist

- [ ] `FORUM_SECRET_KEY` is a randomly generated 32+ byte secret, not a human-readable string
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=warn` or `error` (avoids logging PII in request bodies)
- [ ] Database is not publicly accessible (API is the only client)
- [ ] API is served behind a reverse proxy (nginx, Caddy) with TLS
- [ ] `DATABASE_URL` (direct) is only used for migrations, never exposed to the application process
- [ ] Rate limiting is configured at the proxy level in addition to the application-level limits

---

## Upgrading

ForumKit uses sequential numbered migrations. To upgrade:

```bash
git pull
npm install
npm run db:migrate
```

The migration runner applies only unapplied migrations in order. Rollback with:

```bash
npm run db:migrate:down
```

---

## Health check

```
GET /health
```

Returns `{ "status": "ok", "timestamp": "..." }` with HTTP 200. Wire this into your
load balancer or container orchestrator's health check.
