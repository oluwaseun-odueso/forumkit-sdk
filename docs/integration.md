# ForumKit Integration Guide

This guide covers embedding ForumKit into an existing web application. It assumes you have
a running ForumKit API and a forum ID (created via `POST /forums`).

---

## How authentication works

ForumKit never handles user passwords or sessions. Instead your application signs a
short-lived JWT using the shared `FORUM_SECRET_KEY` and passes it to the SDK. ForumKit
verifies the JWT and exchanges it for its own session token.

**JWT payload shape:**

```typescript
type HostJWTPayload = {
  sub: string        // your app's user ID
  name: string       // display name shown in the forum
  email: string      // used for notifications only (not displayed)
  role: 'member' | 'moderator' | 'admin'
  forumId: string    // which forum this user is accessing
  iat: number        // issued-at (Unix seconds)
  exp: number        // expiry (Unix seconds) — keep short, e.g. 15 minutes
}
```

**Signing example (Node.js):**

```ts
import { createHmac } from 'crypto';

function signForumKitToken(userId: string, displayName: string, email: string): string {
  const secret = process.env.FORUM_SECRET_KEY!;
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    name: displayName,
    email,
    role: 'member',
    forumId: 'your-forum-id',
    iat: now,
    exp: now + 900, // 15 minutes
  })).toString('base64url');
  const sig = createHmac('sha256', secret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}
```

Sign the token server-side and pass it to the frontend. Never expose `FORUM_SECRET_KEY`
to the browser.

---

## Plain HTML

No build step required. Load the SDK from a `<script>` tag, then drop in the custom element.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My App</title>
</head>
<body>

  <forum-kit
    forum-id="YOUR_FORUM_ID"
    token="YOUR_HOST_JWT"
    api-url="https://your-forumkit-api.example.com"
  ></forum-kit>

  <script type="module" src="https://your-forumkit-api.example.com/sdk/forum-kit.js"></script>

</body>
</html>
```

To apply a custom theme, pass the `theme` attribute as a JSON string:

```html
<forum-kit
  forum-id="YOUR_FORUM_ID"
  token="YOUR_HOST_JWT"
  theme='{"primaryColor":"#0d6efd","borderRadius":"4px"}'
></forum-kit>
```

When the user's session changes (login, logout, role change), update the `token` attribute
and the SDK will re-authenticate automatically:

```js
const el = document.querySelector('forum-kit');
el.setAttribute('token', newToken);
```

---

## React

Install the package:

```bash
npm install @forumkit/sdk-web
```

Import and use the `ForumKit` component:

```tsx
import { ForumKit } from '@forumkit/sdk-web/react';

export function DiscussionPage({ userToken }: { userToken: string }) {
  return (
    <ForumKit
      forumId="YOUR_FORUM_ID"
      token={userToken}
      apiUrl="https://your-forumkit-api.example.com"
      theme={{
        primaryColor: '#0d6efd',
        borderRadius: '4px',
      }}
    />
  );
}
```

**Generating the token server-side (Next.js App Router example):**

```ts
// app/api/forum-token/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { signForumKitToken } from '@/lib/forumkit';

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const token = signForumKitToken(
    session.user.id,
    session.user.name ?? 'Anonymous',
    session.user.email ?? '',
  );
  return NextResponse.json({ token });
}
```

```tsx
// components/DiscussionPage.tsx
'use client';
import { ForumKit } from '@forumkit/sdk-web/react';
import useSWR from 'swr';

export function DiscussionPage() {
  const { data } = useSWR<{ token: string }>('/api/forum-token');
  if (!data) return null;

  return <ForumKit forumId="YOUR_FORUM_ID" token={data.token} />;
}
```

**TypeScript props reference:**

```ts
type ForumKitProps = {
  forumId: string;          // required
  token: string;            // required — signed host JWT
  apiUrl?: string;          // defaults to same origin
  theme?: ThemeTokens;      // see theming.md
  className?: string;       // forwarded to the host element
};
```

---

## Vue 3

Install the package:

```bash
npm install @forumkit/sdk-web
```

Import and use the `ForumKit` component:

```vue
<template>
  <ForumKit
    forum-id="YOUR_FORUM_ID"
    :token="userToken"
    api-url="https://your-forumkit-api.example.com"
    :theme="forumTheme"
  />
</template>

<script setup lang="ts">
import { ForumKit } from '@forumkit/sdk-web/vue';
import type { ThemeTokens } from '@forumkit/sdk-web';

defineProps<{ userToken: string }>();

const forumTheme: ThemeTokens = {
  primaryColor: '#0d6efd',
  borderRadius: '4px',
};
</script>
```

When the `:token` prop changes the SDK re-authenticates automatically — no manual
teardown needed.

---

## Roles

The `role` field in the JWT controls what actions the user can take:

| Role | Permissions |
|---|---|
| `member` | Create threads, post replies, react to posts, edit and delete their own content. |
| `moderator` | All member permissions, plus: lock/unlock threads, pin threads, access and action the moderation queue. |
| `admin` | All moderator permissions, plus: manage forum config, create/rename/delete tags. |

Map these to your own application's roles in the JWT-signing function. A user who is an
admin in your app might be `'moderator'` in ForumKit if you want to restrict forum
administration to a specific team.

---

## Re-authentication

ForumKit session tokens are short-lived (15 minutes by default, configurable via
`SESSION_TTL_MINUTES`). When a session expires, the SDK automatically re-exchanges the
host JWT for a new session token — as long as the `token` attribute/prop is still valid.
If the host JWT has also expired, the SDK shows an authentication error inside the component.

To proactively refresh, update the token before the host JWT expires. A common pattern
is to refresh on page focus:

```js
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    const { token } = await fetch('/api/forum-token').then(r => r.json());
    document.querySelector('forum-kit').setAttribute('token', token);
  }
});
```

---

## Multiple forums on one page

Each `<forum-kit>` element is fully isolated in its own shadow DOM. You can embed multiple
instances on the same page with different `forum-id` values:

```html
<forum-kit forum-id="general-discussion" token="..."></forum-kit>
<forum-kit forum-id="support-tickets"    token="..."></forum-kit>
```

---

## Content Security Policy

If your app uses a CSP, add the ForumKit API origin to `connect-src`:

```
Content-Security-Policy: connect-src 'self' https://your-forumkit-api.example.com;
```

If you also load the SDK script from the API origin, add it to `script-src`:

```
Content-Security-Policy:
  script-src 'self' https://your-forumkit-api.example.com;
  connect-src 'self' https://your-forumkit-api.example.com;
```
