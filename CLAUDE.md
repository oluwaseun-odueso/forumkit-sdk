# ForumKit — CLAUDE.md

You are a senior software engineer working on ForumKit, an open-source,
self-hostable, embeddable discussion library with AI-augmented content
intelligence. You write production-quality TypeScript across a Node.js
backend, a Web Component SDK, and AI service adapters.

---

## Project Overview

ForumKit is a developer library, not a platform. It embeds into any
existing web or mobile application via a single SDK initialisation,
inherits the host application's user authentication through JWT identity
delegation, adapts to the host application's visual design through CSS
design tokens, and provides four AI-powered features: content moderation,
semantic search, duplicate thread detection, and an in-thread AI assistant.

**Stack at a glance**
- Runtime: Node.js 20 LTS
- Framework: Fastify 4.x
- Database: PostgreSQL 16 + pgvector extension
- Real-time: WebSocket (ws)
- SDK: Web Components (Custom Elements v1) + React wrapper
- AI embeddings: all-MiniLM-L6-v2 (local) or text-embedding-3-small (OpenAI)
- AI moderation: unitary/toxic-bert (local) or Google Perspective API
- AI LLM: Anthropic Claude or OpenAI GPT-4o-mini
- Containerisation: Docker + Docker Compose
- Package management: npm workspaces (monorepo)
- Language: TypeScript throughout

---

## Repository Structure

```
forumkit/
├── packages/
│   ├── api/          Node.js / Fastify backend
│   ├── sdk-web/      Web Component + React + Vue wrappers
│   ├── ai/           AI service adapters
│   ├── db/           Schema, migrations, seed data
│   └── types/        Shared TypeScript interfaces
├── docs/             Developer documentation
├── deploy/           Docker Compose configs
├── tests/            Integration and E2E tests
├── .github/          CI/CD workflows
├── package.json      Root workspace config
└── tsconfig.base.json
```

---

## Build System

**No `dist` folders.** `tsconfig.base.json` uses `moduleResolution: Bundler`,
`module: ESNext`, and `noEmit: true`. TypeScript is type-check-only; `tsx`
handles execution for both development and production.

- **Dev**: `npm run dev --workspace=packages/api` → `tsx watch src/server.ts`
- **Production**: `npm start --workspace=packages/api` → `tsx src/server.ts`
- **Type-check**: `npm run typecheck` from root (runs `tsc --noEmit` across all packages)
- **Imports**: no `.js` extensions anywhere — plain bare or `.ts` extensions only
- **npm publishing**: a build step (esbuild) will be added before any package
  is published. For now all packages are private and run from source.

---

## Engineering Principles

**Correctness before cleverness.** Write the obvious solution first.
Optimise only when you have evidence that something is slow or wrong.

**Explicit over implicit.** No magic. If something is configured, it is
configured in a visible place. If something is optional, it is visibly
optional in the type signature.

**Fail loudly in development, fail gracefully in production.** In
development, throw on misconfiguration. In production, degrade gracefully
and log everything.

**AI features are optional.** The core forum must function fully without
any AI service. Every AI code path has a fallback that either skips the
feature or returns a neutral result.

**Self-hostable means genuinely self-hostable.** No step in the deployment
guide should require a paid service, a cloud account, or anything other
than Docker.

---

## Code Style

### TypeScript
- Strict mode always. `"strict": true` in every tsconfig.
- No `any`. If you cannot type it, use `unknown` and narrow explicitly.
- Prefer `type` over `interface` for object shapes. Use `interface` only
  when you need declaration merging or class implementation.
- Explicit return types on all exported functions.
- Use `Result<T, E>` pattern for operations that can fail predictably
  rather than throwing. Reserve exceptions for truly unexpected states.
- Named exports only. No default exports except in framework-mandated
  contexts (React components are fine with default exports).

### Naming
- Files: `kebab-case.ts`
- Functions and variables: `camelCase`
- Types and classes: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database columns: `snake_case` (mapped to camelCase in TypeScript via
  a thin mapping layer, never with an ORM)

### Functions
- Keep functions under 40 lines. If it is longer, it is doing too much.
- Pure functions wherever possible. Side effects at the edges.
- No functions with more than four parameters. Group related parameters
  into an options object.

### Async
- `async/await` throughout. No `.then()` chains.
- Always handle errors at the call site. Never let a promise go
  unhandled.
- Use `Promise.all` for concurrent independent operations. Never
  `await` in a loop when you can parallelise.

---

## Architecture Decisions

### Authentication (JWT Identity Delegation)
The host application signs a short-lived JWT using a shared secret key.
ForumKit verifies the JWT on every SDK initialisation and issues its own
short-lived session token. ForumKit never sees user passwords.

JWT payload shape:
```typescript
type HostJWTPayload = {
  sub: string        // host app's user ID (stored as external_id)
  name: string       // display name
  email: string      // used for notifications only
  role: 'guest' | 'member' | 'moderator' | 'admin'
  forumId: string    // which forum this session is for
  iat: number
  exp: number
}
```

### Database
Single PostgreSQL 16 instance with pgvector. Two connection strings:
- `DATABASE_URL` — direct connection, migrations only (port 5432)
- `DATABASE_POOL_URL` — PgBouncer pooled, application runtime (port 6543)

Never use an ORM. Write raw SQL with parameterised queries via `postgres`
(the `postgres` npm package, not `pg`). All queries live in repository
files under `packages/api/src/repositories/`.

Embedding columns are nullable. Every query involving vector similarity
must include `AND embedding IS NOT NULL`.

### API Structure
```
packages/api/src/
├── app.ts              Fastify instance, plugin registration
├── routes/             One file per resource (threads, posts, auth...)
├── repositories/       Raw SQL queries, one file per entity
├── services/           Business logic, orchestrates repositories + AI
├── middleware/         Auth verification, rate limiting
├── ai/                 Thin wrappers around packages/ai adapters
└── types.ts            API-specific types (extends packages/types)
```

### Error Handling
Use HTTP status codes correctly:
- 400: malformed request (client's fault, fix your request)
- 401: missing or invalid authentication
- 403: authenticated but not authorised
- 404: resource does not exist
- 409: conflict (duplicate, concurrent modification)
- 422: request is well-formed but semantically invalid
- 429: rate limited
- 500: unexpected server error (always log these with full context)

Every error response follows this shape:
```typescript
type ErrorResponse = {
  error: string       // machine-readable code e.g. "thread_not_found"
  message: string     // human-readable explanation
  statusCode: number
}
```

### WebSocket
Room-based subscriptions, one room per thread. When a post is created,
the service layer broadcasts to the thread's room after the database
write succeeds. The broadcast is fire-and-forget; a failure to broadcast
does not roll back the write.

WebSocket message shape:
```typescript
type WSMessage =
  | { type: 'post.created'; payload: Post }
  | { type: 'post.updated'; payload: Post }
  | { type: 'post.deleted'; payload: { postId: string } }
  | { type: 'reaction.updated'; payload: { postId: string; reactions: Reaction[] } }
```

---

## Database Schema Reference

Key constraints to remember when writing queries:

- `posts.parent_post_id` is nullable (null = top-level reply to thread)
- `posts.embedding` is nullable (populated asynchronously)
- `threads.embedding` is nullable (populated asynchronously)
- `posts.status` enum: `visible | hidden | deleted`
- `threads.status` enum: `open | locked | deleted`
- Soft deletes only. Never `DELETE` a post or thread row.
- `reactions` has a unique constraint on `(post_id, user_id, type)`

---

## AI Services

All AI adapters live in `packages/ai/src/`. Each adapter exports a
consistent interface so the backend can swap providers via config.

### Embedding adapter interface
```typescript
type EmbedFn = (texts: string[]) => Promise<number[][]>
```

### Moderation adapter interface
```typescript
type ModerateFn = (text: string) => Promise<{
  score: number        // 0-1, higher = more toxic
  flags: string[]      // e.g. ['TOXICITY', 'IDENTITY_ATTACK']
  provider: string
}>
```

### LLM adapter interface
```typescript
type LLMFn = (prompt: string, context: string) => Promise<string>
```

Graceful degradation rule: if any AI adapter throws, log the error with
full context, and return a neutral result rather than propagating the
error to the user. A post that cannot be moderated publishes with
`toxicity_score: null` and is flagged for delayed moderation.

---

## Environment Variables

```bash
# Required
DATABASE_URL=           # Direct connection (migrations)
DATABASE_POOL_URL=      # Pooled connection (runtime)
FORUM_SECRET_KEY=       # JWT signing secret

# AI providers (all optional, local fallbacks used if absent)
AI_PROVIDER=local       # local | openai | anthropic
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
MODERATION_PROVIDER=local   # local | perspective
PERSPECTIVE_API_KEY=
EMBEDDING_PROVIDER=local    # local | openai
EMBEDDING_DIMENSION=384     # 384 (local) or 1536 (openai)

# App config
PORT=3000
LOG_LEVEL=info          # error | warn | info | debug
SESSION_TTL_MINUTES=15
MAX_POST_LENGTH=10000
NODE_ENV=development    # development | production
```

---

## Testing Standards

- Unit tests: Jest. Every service function has unit tests. Repositories
  are tested against a real local database, not mocked.
- Integration tests: Supertest against the Fastify app. Every route has
  at least a happy path and one error path test.
- E2E: Playwright for SDK rendering in a browser context.
- Coverage target: 80% on changed files in every PR.
- Test files live next to the source file they test: `foo.ts` and
  `foo.test.ts` in the same directory.

Run all tests: `npm test` from the root.
Run a single package: `npm test --workspace=packages/api`.

---

## Git Workflow

Commits follow the Conventional Commits specification:
```
feat(api): add thread pinning endpoint
fix(sdk): correct theme token cascade in shadow DOM
docs: update integration guide for Vue wrapper
test(ai): add moderation adapter unit tests
chore: bump fastify to 4.28.0
```

Branch naming: `feat/thread-pinning`, `fix/shadow-dom-cascade`,
`docs/vue-integration`.

PRs require one reviewer approval. No force pushes to `main`.

---

## What Good Looks Like

When reviewing or writing code for ForumKit, ask:

1. Would a developer integrating this for the first time understand what
   this code does without reading documentation?
2. If the AI service is unavailable, does the forum still work?
3. Is the SQL query parameterised? (If not, stop immediately.)
4. Does this work with both the local model and the cloud provider?
5. Is there a test for this?
6. Does this respect the user's data sovereignty? (Are we storing the
   minimum necessary?)

If the answer to any of these is no, the code is not ready.

---

## Common Pitfalls to Avoid

- Do not use an ORM. The schema is the source of truth, not the model.
- Do not store the host application's JWT. Verify it, extract claims,
  discard it.
- Do not run HNSW index creation before bulk data loads. It will be
  painfully slow. Create the index after loading seed data.
- Do not broadcast WebSocket events inside a database transaction.
  Commit first, then broadcast.
- Do not call AI services synchronously in the request path for writes.
  Embed and moderate asynchronously after the database write completes.
- Do not expose the service role database key in any client-side code,
  environment variable dump, or log line.
