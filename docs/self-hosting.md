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

### A1. Quick start — pull the published image (no clone needed)

Every tagged release is published to GitHub Container Registry. This is
the fastest path to a running backend — just these two files, nothing to
clone or build:

`docker-compose.yml`:
```yaml
services:
  api:
    image: ghcr.io/oluwaseun-odueso/forumkit-api:latest
    ports:
      - "3000:3000"
    env_file: .env
```

`.env` (pointing at Postgres 16+ with pgvector and an S3-compatible bucket
you already have — a managed instance, Supabase, RDS, whatever you run):

```bash
DATABASE_URL=postgresql://user:pass@your-postgres-host:5432/forumkit
DATABASE_POOL_URL=postgresql://user:pass@your-postgres-host:6543/forumkit
FORUM_SECRET_KEY=your-generated-secret-here
STORAGE_S3_BUCKET=your-bucket
STORAGE_S3_REGION=your-region
STORAGE_S3_ACCESS_KEY_ID=...
STORAGE_S3_SECRET_ACCESS_KEY=...
```

```bash
docker compose up -d
```

Migrations run automatically as part of the container starting — a
short-lived step applies anything pending against `DATABASE_URL`, then
exits before the server itself starts.

Verify:
```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

Pin a specific version instead of `latest` by using that release's tag,
e.g. `ghcr.io/oluwaseun-odueso/forumkit-api:v0.1.0` — see
[Upgrading](#upgrading) below for how versions are cut.

### A2. Build from source

For contributing, customizing the image, or running entirely offline
without pulling from GHCR. This bundles a local PostgreSQL 16 + pgvector
database and local S3-compatible storage alongside the API, so there's
nothing external to provide.

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

```bash
docker compose --env-file .env -f deploy/docker-compose.dev.yml up -d --build
```

`--env-file .env` matters here — without it, Compose looks for `.env` next to the compose
file (`deploy/.env`) rather than the one you just created at the project root, and your
edits above would be silently ignored in favour of the file's local-dev defaults.
`--build` builds the image from this checkout instead of pulling one, so local changes
to `packages/api`/`packages/db` are actually reflected.

This starts:
- `db` — PostgreSQL 16 + pgvector on port 5433 (host-mapped to avoid conflicts)
- `minio` — local S3-compatible storage, standing in for a real bucket (see Storage below)
- `api` — ForumKit API on port 3000

Optionally seed development data:
```bash
npm run db:seed
```

Verify the same way as A1:
```bash
curl http://localhost:3000/health
```

### A3. Production: behind Caddy with automatic HTTPS

`deploy/docker-compose.prod.yml` runs the published image alongside a `caddy:2`
container that terminates TLS automatically — the setup used for ForumKit's own
EC2 deployments. It reads two files from its own directory (`/opt/forumkit` in
that setup) instead of one:

- **`.env`** — this stack's own config: `FORUMKIT_TAG` (image tag to run),
  `FORUM_SITE` (Caddy's site address), `PUBLIC_API_URL`, `ACME_EMAIL`,
  `COMPOSE_FILE=docker-compose.prod.yml`.
- **`forumkit.env`** — everything else: `DATABASE_URL`, `FORUM_SECRET_KEY`, storage
  keys, etc. — the same variables as everywhere else in this guide.

`FORUM_SITE` and `PUBLIC_API_URL` are kept separate on purpose, so you can run on a
bare IP before you have a domain and switch later with no file changes:

```bash
# Before DNS exists — plain HTTP on the instance's IP, no certificate requested
FORUM_SITE=:80
PUBLIC_API_URL=http://203.0.113.10

# Once a domain points at the instance — automatic Let's Encrypt HTTPS
FORUM_SITE=forum.yourapp.com
PUBLIC_API_URL=https://forum.yourapp.com
```

Switching from the first to the second is just editing `.env` and redeploying — the
A record has to already resolve to the instance before Caddy starts in domain mode,
or certificate issuance fails (and gets rate-limited on repeated failures).

Set `TRUST_PROXY=1` in `forumkit.env` whenever the API runs behind this (or any)
reverse proxy — see [Environment variables](#environment-variables) below. The
compose file sets this for you already.

```bash
cd /opt/forumkit
docker compose pull
docker compose up -d
```

Deploying a new version is `deploy/deploy.sh <tag>` — see the script's own comments
for exactly what it does; in short, it pulls first, only switches `FORUMKIT_TAG`
once the pull succeeds, health-checks the new container through Caddy, and rolls
back to the previous tag automatically if that check fails.

A `Caddyfile` is bind-mounted into the container as a file, so a content change
alone wouldn't normally reach the running Caddy on its own - `deploy.sh` handles
this itself: it keeps a checksum of the last-applied `Caddyfile` and automatically
force-recreates `caddy` (about a second of downtime, no cert re-issuance - certs
live in a separate volume) whenever that checksum changes.

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

- **Direct connection** (port 5432) — use for `DATABASE_URL` if your project exposes it.
  Many projects don't (IPv6-only, or no IPv4 add-on) — if yours doesn't, use the
  **session pooler** (also port 5432) for `DATABASE_URL` instead; it supports the
  prepared statements migrations need.
- **Transaction pooler** (port 6543) — use for `DATABASE_POOL_URL` (application
  runtime). ForumKit's db client already sets `prepare: false` for this connection
  specifically because the transaction pooler can route successive queries to
  different backend connections, where a statement prepared on one wouldn't exist on
  another — so this is supported, not a workaround to avoid.

Whichever host you use for `DATABASE_URL`, remember it has to stay reachable from
wherever the API container actually runs in production, not just from your own
machine: migrations run automatically on every container start (see [Upgrading](#upgrading)),
in the same process as the server, so `DATABASE_URL` is live network traffic at
runtime, not a one-time local step.

### 4. Configure `.env`

```bash
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
DATABASE_POOL_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
FORUM_SECRET_KEY=your-generated-secret-here
```

### 5. Start the server

```bash
npm start
```

Applies any pending migrations against `DATABASE_URL` first (exiting before
continuing if that fails), then starts the API server — the same two-step
sequence the Docker image runs internally. `npm run db:migrate` remains
available separately if you want to apply migrations without starting the
server.

### 6. Optional: use Supabase Storage for file uploads too

ForumKit's storage adapter talks to any S3-compatible bucket (see
[Storage](#storage-required--no-local-disk-fallback) below), and Supabase Storage is
one — no separate adapter or dependency, just these `STORAGE_S3_*` values instead
of AWS's:

1. In the Supabase dashboard: **Storage > Settings**, enable the S3 connection, and
   create a bucket (private, since ForumKit resolves download URLs itself rather
   than relying on public bucket access).
2. Still in **Storage > Settings**, create an S3 access key — this gives you the
   access key ID/secret pair below (distinct from your Supabase API keys).
3. Configure:

```bash
STORAGE_S3_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
STORAGE_S3_BUCKET=your-bucket-name
STORAGE_S3_REGION=<your project's region, e.g. eu-west-1>
STORAGE_S3_ACCESS_KEY_ID=...
STORAGE_S3_SECRET_ACCESS_KEY=...
```

These keys are project-wide and bypass row-level security — treat them as server
secrets the same way as your database password, never in the app or in git.

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
| `EMBEDDING_DIMENSION` | `384` | Must match the provider: 384 (the default, matching `EMBEDDING_PROVIDER=local`) if you restore a local model, 1536 for OpenAI. **Set this before running migrations** — changing it on an existing database requires recreating the embedding columns. |
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
| `TRUST_PROXY` | off | Number of reverse-proxy hops in front of this server (e.g. `1` for a single Caddy/nginx in the same compose stack). Controls Fastify's `trustProxy`, which decides where the rate limiter and anything else reading the client IP trust `X-Forwarded-For` from. Leave unset with no reverse proxy — trusting that header with nothing in front to set it correctly lets a client fake its own IP and dodge rate limits. |

---

## Production checklist

- [ ] `FORUM_SECRET_KEY` is a randomly generated 32+ byte secret, not a human-readable string
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=warn` or `error` (avoids logging PII in request bodies)
- [ ] Database is not publicly accessible (API is the only client)
- [ ] API is served behind a reverse proxy (nginx, Caddy) with TLS, with `TRUST_PROXY` set to that proxy's hop count
- [ ] `DATABASE_URL` is used only for running migrations (never for application queries, which go through `DATABASE_POOL_URL`) — but it still needs to be reachable from wherever the container runs in production, since migrations run there on every start, not from a separate offline step
- [ ] Rate limiting is configured at the proxy level in addition to the application-level limits

---

## Upgrading

ForumKit uses sequential numbered migrations — they run automatically as
part of starting either way, no separate migration step needed. The
runner applies only unapplied migrations, in order, and refuses to start
the server if a migration fails.

**If you're on A1 (the published image)**: bump the tag in your
`docker-compose.yml` to the release you want (see each release's notes on
GitHub for what changed), then:

```bash
docker compose pull
docker compose up -d
```

No git, no npm, no build — just a new image.

**If you're on A2 (built from source)**:

```bash
git pull
docker compose --env-file .env -f deploy/docker-compose.dev.yml up -d --build
```

Either way, roll back a migration with:

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
