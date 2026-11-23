# @timpel/forumkit-sdk-web

Embeddable discussion forum for web applications. Add a full-featured forum - threads, nested comments, voting, search, drafts, media uploads, notifications, and AI-powered features (summarise, suggest reply, Ask AI, duplicate detection) - to any web page in a single tag.

The forum renders inside a Shadow DOM, so your page's global styles don't leak in and ForumKit's styles don't leak out. Theming is done through design tokens.

---

## Requirements

- A running ForumKit API server - see the [self-hosting guide](https://github.com/oluwaseun-odueso/forumkit-sdk#quick-start)
- A backend that can sign short-lived JWTs with your `FORUM_SECRET_KEY`
- Modern evergreen browser (Chrome, Firefox, Safari, Edge)

---

## Installation

The core package has no required peer dependencies. Install extras only for the wrapper you are using:

```bash
# Web Component (no framework)
npm install @timpel/forumkit-sdk-web

# React wrapper
npm install @timpel/forumkit-sdk-web react@^18 react-dom@^18

# Vue wrapper
npm install @timpel/forumkit-sdk-web vue@^3
```

---

## Usage

### Plain HTML / Web Component

No build step or framework required:

```html
<script type="module">
  import { ForumKitElement } from '@timpel/forumkit-sdk-web';
  customElements.define('forum-kit', ForumKitElement);
</script>

<forum-kit
  forum-id="YOUR_FORUM_ID"
  token="eyJ..."
></forum-kit>
```

Attribute names are the kebab-case versions of the props below. The `theme` attribute accepts a JSON string.

---

### React

```tsx
import { ForumKitElement } from '@timpel/forumkit-sdk-web/react';

export default function App() {
  return (
    <ForumKitElement
      forumId="YOUR_FORUM_ID"
      token={hostJwt}
      apiUrl="https://your-api.example.com"
      getToken={() => yourAuth.getFreshJwt()}
      onLogout={() => yourAuth.signOut()}
      theme={{ primaryColor: '#6200EE', borderRadius: '8px' }}
    />
  );
}
```

---

### Vue

```vue
<script setup lang="ts">
import { ForumKitElement } from '@timpel/forumkit-sdk-web/vue';
</script>

<template>
  <ForumKitElement
    forum-id="YOUR_FORUM_ID"
    :token="hostJwt"
    api-url="https://your-api.example.com"
    :get-token="() => yourAuth.getFreshJwt()"
    :theme="{ primaryColor: '#6200EE', borderRadius: '8px' }"
  />
</template>
```

---

## Configuration

| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| `forumId` | `string` | Yes | The forum's UUID, created via the ForumKit API. |
| `token` | `string` | Yes | A short-lived JWT signed by your backend. Used for the initial session exchange - see [JWT shape](#jwt-shape) below. |
| `apiUrl` | `string` | No | Base URL of your ForumKit API server. Defaults to same origin. Required when the API is on a different domain or port. |
| `getToken` | `() => Promise<string>` | No | Called to fetch a fresh host JWT for every session renewal. Without this, the session expires when `token` does. Strongly recommended for production. |
| `useHostTokenDirectly` | `boolean` | No | Skip the ForumKit session exchange and present your host JWT on every request. For Cognito-centralised auth or any setup that avoids a second token. Defaults to `false`. |
| `theme` | `ThemeTokens` | No | Design token overrides. See [Theming](#theming). |
| `onLogout` | `() => void` | No | Called when the user taps "Log Out". Your app owns the actual sign-out. Omit to hide the Log Out button entirely. |
| `platform` | `'web' \| 'native'` | No | Defaults to `'web'`. Set `'native'` when embedding inside a React Native WebView - changes Share sheet behaviour. |
| `brandName` | `string` | No | Replaces the "FORUM KIT" wordmark in the nav bar. Max 15 characters. |

---

## JWT shape

Your backend signs a short-lived JWT using `FORUM_SECRET_KEY` (HS256). The payload must include:

```ts
{
  sub: string;      // your app's internal user ID
  name: string;     // display name shown in the forum
  email: string;    // used for notification delivery only, never displayed publicly
  role: 'guest' | 'member' | 'moderator' | 'admin';
  forumId: string;  // must match the forumId prop
  iat: number;
  exp: number;      // keep this short - 15 minutes is recommended
}
```

ForumKit verifies the JWT on every session handshake, creates or updates the user record, and issues its own internal session token. Your JWT is never stored.

---

## Theming

Pass a `ThemeTokens` object to the `theme` prop:

```ts
theme={{
  primaryColor: '#6200EE',
  primaryColorHover: '#7B29F5',
  backgroundColor: '#0D0D0D',
  surfaceColor: '#1A1A1A',
  borderColor: '#2E2E2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  fontFamily: "'Inter', sans-serif",
  fontSize: '15px',
  borderRadius: '12px',
  spacing: '1rem',
}}
```

| Token | Description |
|-------|-------------|
| `primaryColor` | Accent colour for buttons, links, and active states. |
| `primaryColorHover` | Hover shade of the accent. |
| `backgroundColor` | Page/app background. |
| `surfaceColor` | Card and panel background, one step above the page. |
| `borderColor` | Subtle dividers and input borders. |
| `textPrimary` | Primary body text colour. |
| `textSecondary` | Muted labels and metadata. |
| `fontFamily` | CSS font-family string. |
| `fontSize` | Base font size, e.g. `'15px'`. |
| `borderRadius` | Corner radius applied to cards and inputs. |
| `spacing` | Base spacing unit used for padding and gaps. |

### CSS custom properties (alternative)

Each token also maps to a CSS custom property that crosses the Shadow DOM boundary by design, so you can set them from your own stylesheet instead:

```css
forum-kit {
  --fk-color-primary: #6200ee;
  --fk-border-radius: 12px;
  --fk-font-family: 'DM Sans', sans-serif;
}
```

Useful when your theme already lives in CSS, e.g. driven by a design system or `prefers-color-scheme`.

---

## Dark / light mode

The SDK has a built-in dark/light toggle, seeded from the user's OS preference and persisted per user. Your `theme` token overrides sit on top of whichever base palette is active - the switching continues to work underneath them.

---

## AI features

AI features are opt-in at the forum level and require the ForumKit API server to be configured with an LLM provider. The core forum works fully without them.

| Feature | Description |
|---------|-------------|
| **Summarise** | Generates a streaming bullet-point summary of a thread. |
| **Suggest reply** | Drafts a contextual reply based on the thread discussion. |
| **Ask AI** | RAG-based question answering over your forum's content, with cited source threads and follow-up suggestions. |
| **Duplicate detection** | Shows similar existing threads as a user drafts a new post, reducing duplicate questions. |

See the [AI Configuration](https://github.com/oluwaseun-odueso/forumkit-sdk#ai-configuration) section of the main repo for the required environment variables.

---

## License

MIT © timpel
