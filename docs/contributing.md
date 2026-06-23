# Contributing to ForumKit

---

## Development setup

### Prerequisites

- Node.js 20 LTS
- npm 10+
- Docker (for the local database)

### 1. Clone and install

```bash
git clone https://github.com/your-org/forumkit.git
cd forumkit
npm install
```

### 2. Start the database

```bash
docker compose -f deploy/docker-compose.dev.yml up -d db
```

This starts PostgreSQL 16 + pgvector on `localhost:5433`.

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
DATABASE_URL=postgresql://forumkit:forumkit@localhost:5433/forumkit
DATABASE_POOL_URL=postgresql://forumkit:forumkit@localhost:5433/forumkit
FORUM_SECRET_KEY=dev-secret-any-string-here
```

### 4. Run migrations

```bash
npm run db:migrate
```

### 5. Start the API

```bash
npm run dev --workspace=packages/api
```

The API is now running on `http://localhost:3000`.

---

## Project structure

```
forumkit/
├── packages/
│   ├── api/          Fastify backend — routes, services, repositories
│   ├── sdk-web/      Web Component SDK — forum-kit element, React/Vue wrappers
│   ├── ai/           AI adapter interfaces and provider implementations
│   ├── db/           Migrations and seed data
│   └── types/        Shared TypeScript interfaces
├── docs/             Developer documentation (this folder)
├── deploy/           Docker Compose configs and Dockerfile
└── .github/          CI workflow
```

---

## Code standards

### TypeScript

- Strict mode everywhere. No `any` — use `unknown` and narrow explicitly.
- `type` for object shapes; `interface` only when declaration merging is needed.
- Explicit return types on all exported functions.
- Named exports only. No default exports except React components.

### Naming

- Files: `kebab-case.ts`
- Functions and variables: `camelCase`
- Types and classes: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database columns: `snake_case` (mapped to `camelCase` in TypeScript via a thin layer)

### Database

- Never use an ORM. Write raw SQL with parameterised queries via the `postgres` package.
- All queries live in `packages/api/src/repositories/`.
- Soft deletes only — never `DELETE` a post or thread row.
- Embedding columns are nullable. Every vector similarity query must include
  `AND embedding IS NOT NULL`.

### Error handling

- Use the `Result<T, E>` pattern for predictable failures. Reserve exceptions for
  unexpected states.
- Every HTTP error response uses the standard shape:
  `{ error: string, message: string, statusCode: number }`

---

## Running tests

```bash
# All packages
npm test

# Single package
npm test --workspace=packages/api
npm test --workspace=packages/ai

# With coverage
npm test -- --coverage
```

Tests require a running database. The CI workflow spins one up automatically.

Test files live in a `tests/` folder at the package root, separate from source:

```
packages/api/
├── src/                  Source code
└── tests/
    ├── unit/             Unit tests — no database, dependencies mocked
    ├── routes/           Integration tests — run against real database via Fastify inject
    ├── helpers/          Shared test utilities (buildTestApp, makeHostToken, etc.)
    └── __mocks__/        Module mocks (e.g. Xenova transformers stub)

packages/ai/
├── src/                  Source code
└── tests/
    └── unit/             Unit tests for AI adapters
```

---

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add thread pinning endpoint
fix(sdk): correct theme token cascade in shadow DOM
docs: update integration guide for Vue wrapper
test(ai): add moderation adapter unit tests
chore: bump fastify to 4.28.0
```

Scopes: `api`, `sdk`, `ai`, `db`, `types`, `ci`.

---

## Branch and PR workflow

1. Branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
   Branch naming: `feat/`, `fix/`, `docs/`, `test/`, `chore/`.

2. Make your changes and commit following Conventional Commits.

3. Open a PR against `main`. The CI pipeline runs typecheck, lint, and all tests with coverage.

4. PRs require one reviewer approval before merging.

5. No force-pushes to `main`.

---

## Adding a database migration

```bash
npm run migrate:create --workspace=packages/db -- --name describe-your-change
```

This creates a numbered TypeScript migration file in `packages/db/src/migrations/`.
Edit it to add your `up` and `down` SQL, then run:

```bash
npm run db:migrate
```

Always provide a `down` migration. Breaking schema changes (column removal, type changes)
should be rolled out across two migrations: one to make the old and new states coexist,
one to remove the old state.

---

## Adding an AI provider

1. Create `packages/ai/src/providers/your-provider.ts` exporting a factory function
   that returns the appropriate adapter type (`EmbedFn`, `ModerateFn`, or `LLMFn`).

2. Register the provider in `packages/ai/src/index.ts` inside the relevant `build*Adapter`
   function.

3. Add the corresponding config option to `packages/api/src/config.ts` and
   `packages/types/src/index.ts`.

4. Add unit tests in `packages/ai/tests/unit/` mocking the provider function and testing
   the adapter wrapper's graceful degradation behaviour.
