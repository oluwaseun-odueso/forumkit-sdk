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
git clone https://github.com/your-org/forumkit.git
cd forumkit
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
docker compose -f deploy/docker-compose.dev.yml up -d
```

This starts:
- `db` — PostgreSQL 16 + pgvector on port 5433 (host-mapped to avoid conflicts)
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

### AI providers (all optional — local fallbacks run if absent)

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `local` | `local` uses the stub LLM. `anthropic` or `openai` enables AI summarise/suggest. |
| `ANTHROPIC_API_KEY` | — | Required when `AI_PROVIDER=anthropic`. |
| `OPENAI_API_KEY` | — | Required when `AI_PROVIDER=openai`. Also used for embeddings when `EMBEDDING_PROVIDER=openai`. |
| `EMBEDDING_PROVIDER` | `local` | `local` uses all-MiniLM-L6-v2 (384 dims). `openai` uses text-embedding-3-small (1536 dims). |
| `EMBEDDING_DIMENSION` | `384` | Must match the model: 384 for local, 1536 for OpenAI. **Set this before running migrations** — changing it on an existing database requires recreating the embedding columns. |
| `MODERATION_PROVIDER` | `local` | `local` uses toxic-bert. `perspective` uses Google Perspective API. |
| `PERSPECTIVE_API_KEY` | — | Required when `MODERATION_PROVIDER=perspective`. |

### Application

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port the API listens on. |
| `LOG_LEVEL` | `info` | `error` `warn` `info` `debug`. Use `info` or `warn` in production. |
| `NODE_ENV` | `development` | Set to `production` in production. Disables pretty-print logging. |
| `SESSION_TTL_MINUTES` | `15` | How long ForumKit session tokens are valid before the SDK re-exchanges. |
| `MAX_POST_LENGTH` | `10000` | Maximum character length of a post body. |

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
