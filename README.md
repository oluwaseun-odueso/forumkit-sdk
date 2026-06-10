# ForumKit

An open-source, self-hostable, embeddable discussion system with AI-augmented content intelligence.

ForumKit is a **library**, not a platform. Drop it into any existing web or mobile application via a single SDK initialisation. It inherits your application's user authentication, adapts to your visual design, and provides four AI-powered features out of the box.

---

## Features

- **Embeddable** — Web Component + React/Vue wrappers. Integrates in minutes.
- **Self-hostable** — Single Docker Compose command. No cloud account required.
- **Identity-delegating** — Trusts your app's JWT. No separate login for users.
- **White-label** — CSS design-token theming. Matches any brand.
- **AI moderation** — Content scored for toxicity before publishing.
- **Semantic search** — Natural language search via text embeddings.
- **Duplicate detection** — Surfaces similar threads as users type.
- **AI assistant** — `@ai summarise` and `@ai suggest` in-thread commands.

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-org/forumkit.git
cd forumkit

# 2. Copy environment config
cp .env.example .env

# 3. Start the database and API
docker compose -f deploy/docker-compose.dev.yml up

# 4. Run migrations (in a new terminal)
npm run db:migrate

# 5. Seed development data (optional)
npm run db:seed
```

The API is now running at `http://localhost:3000`.

---

## Integration

### Plain HTML
```html
<script src="https://your-host/forumkit.js"></script>
<forum-kit
  forum-id="my-forum"
  token="eyJ..."
  theme='{"primaryColor":"#6200EE","fontFamily":"Inter"}'
></forum-kit>
```

### React
```tsx
import { ForumKit } from '@forumkit/sdk-web/react';

<ForumKit
  forumId="my-forum"
  token={userToken}
  theme={{ primaryColor: '#6200EE', borderRadius: '8px' }}
/>
```

---

## Repository Structure

```
forumkit/
├── packages/
│   ├── api/          Node.js / Fastify backend
│   ├── sdk-web/      Web Component + React wrapper
│   ├── ai/           AI service adapters
│   ├── db/           Schema and migrations
│   └── types/        Shared TypeScript types
├── deploy/           Docker configs
├── docs/             Developer documentation
└── tests/            Integration and E2E tests
```

---

## Development

```bash
npm install                          # install all workspace dependencies
npm run dev                          # start all packages in watch mode
npm test                             # run all tests
npm run typecheck                    # typecheck all packages
npm run lint                         # lint all packages
```

---

## Licence

MIT
