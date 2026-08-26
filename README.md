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
git clone https://github.com/oluwaseun-odueso/forumkit-sdk.git
cd forumkit-sdk

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

`@timpel/forumkit-sdk-web` and `@timpel/forumkit-sdk-react-native` are
private npm packages under a personal scope, not publicly installable —
you'll need to be logged in (`npm login`) as an account that's been
granted read access to the scope before `npm install` will work.

### Web

```bash
npm install @timpel/forumkit-sdk-web
```

**Plain HTML / Web Component** — no build step, no framework required:
```html
<script src="https://your-host/forumkit.js"></script>
<forum-kit
  forum-id="my-forum"
  token="eyJ..."
  theme='{"primaryColor":"#6200EE","fontFamily":"Inter"}'
></forum-kit>
```

**React**
```tsx
import { ForumKit } from '@timpel/forumkit-sdk-web/react';

<ForumKit
  forumId="my-forum"
  token={userToken}
  theme={{ primaryColor: '#6200EE', borderRadius: '8px' }}
/>
```

**Vue**
```vue
<script setup lang="ts">
import { ForumKit } from '@timpel/forumkit-sdk-web/vue';
</script>

<template>
  <ForumKit
    forum-id="my-forum"
    :token="userToken"
    :theme="{ primaryColor: '#6200EE', borderRadius: '8px' }"
  />
</template>
```

### React Native

```bash
npm install @timpel/forumkit-sdk-react-native
```

Requires an existing Expo (SDK 57) app — `react`, `react-native`, `expo`,
and the Expo modules the SDK uses (navigation, safe-area, reanimated,
etc.) are peer dependencies, resolved from your app's own install rather
than bundled, so native linking stays in your control.

```tsx
import { ForumKit } from '@timpel/forumkit-sdk-react-native';

export default function App() {
  return (
    <ForumKit
      forumId="my-forum"
      token={userToken}
      apiUrl="https://your-host"
      platform="native"
    />
  );
}
```

---

## Customization

### Theme tokens

Passed via the `theme` prop (React/Vue/React Native) or the `theme`
attribute as JSON (plain HTML). Token support differs by platform —
the web SDK maps every token to a CSS custom property (`--fk-*`) that
its stylesheets actually use; the React Native SDK only re-themes
colors, since fonts/spacing/radius are hardcoded native `StyleSheet`
values rather than swappable tokens today.

| Token | Web | React Native |
|---|---|---|
| `primaryColor` | ✅ | ✅ |
| `primaryColorHover` | ✅ | ✅ |
| `backgroundColor` | ✅ | ✅ |
| `surfaceColor` | ✅ | ✅ |
| `borderColor` | ✅ | ✅ |
| `textPrimary` | ✅ | ✅ |
| `textSecondary` | ✅ | ✅ |
| `fontFamily` | ✅ | ❌ ignored |
| `fontSize` | ✅ | ❌ ignored |
| `borderRadius` | ✅ | ❌ ignored |
| `spacing` | ✅ | ❌ ignored |

### CSS custom properties (web only)

Every token above is really just a CSS custom property under the hood
(`--fk-color-primary`, `--fk-font-family`, etc.), and those cross the
Shadow DOM boundary by design — so instead of the `theme` prop/attribute,
you can set them directly in your own stylesheet:

```css
forum-kit {
  --fk-color-primary: #6200ee;
  --fk-border-radius: 12px;
}
```

Useful if your theme already lives in CSS (e.g. driven by a design
system or a `prefers-color-scheme` media query) rather than JS.

### Other config

- **`onLogout`** — only available via the React, Vue, and React Native
  component props (it's a function, which a plain HTML attribute can't
  carry). The bare `<forum-kit>` Web Component has no equivalent, so no
  "Log Out" item appears in its account menu.
- **`apiUrl`** — points the SDK at a non-same-origin API. Defaults to
  same origin on web; required on React Native (there's no "same
  origin" inside a native app).
- **`platform`** — `'web' | 'native'`, defaults to `'web'`. Only changes
  Share-sheet behavior (web offers a copyable link alongside in-app
  sharing; native goes straight to in-app sharing). The React Native SDK
  always behaves as `'native'` regardless of this prop.
- **Dark/light mode** — the SDK has its own built-in toggle (seeded from
  the system preference, persisted across sessions) that a signed-in
  user controls from within the UI. Your `theme` tokens override
  whichever of the light/dark base palettes is currently active, rather
  than replacing the light/dark system itself.

---

## Repository Structure

```
forumkit/
├── packages/
│   ├── api/                Node.js / Fastify backend
│   ├── sdk-web/            Web Component + React/Vue wrappers (published)
│   ├── sdk-react-native/   Expo/React Native SDK (published)
│   ├── shared/             Client-side API/data helpers used by both SDKs
│   ├── ai/                 AI service adapters
│   ├── storage/            File/attachment storage providers
│   ├── db/                 Schema and migrations
│   └── types/              Shared TypeScript types
├── deploy/                 Docker configs
├── docs/                   Developer documentation
└── tests/                  Integration and E2E tests
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
