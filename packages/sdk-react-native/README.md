# @timpel/forumkit-sdk-react-native

Embeddable discussion forum for React Native / Expo applications. Add a full-featured forum - threads, nested comments, voting, search, drafts, media uploads, notifications, and AI-powered features (summarise, suggest reply, Ask AI, duplicate detection) - to any Expo app with a single component.

---

## Requirements

- A running ForumKit API server - see the [self-hosting guide](https://github.com/oluwaseun-odueso/forumkit-sdk#quick-start)
- A backend that can sign short-lived JWTs with your `FORUM_SECRET_KEY`
- Expo SDK 57
- A custom development build (the SDK includes JSI native modules and cannot run in Expo Go)

---

## Installation

```bash
npm install @timpel/forumkit-sdk-react-native
```

The SDK has several peer dependencies that must be installed and linked in your Expo project:

```bash
npm install \
  expo@~57.0.16 \
  react@^19.2.3 \
  react-native@^0.86.2 \
  @react-navigation/native@^7.3.16 \
  @react-navigation/native-stack@^7.18.8 \
  react-native-screens@~4.26.0 \
  react-native-safe-area-context@~5.7.0 \
  react-native-reanimated@4.5.1 \
  react-native-svg@15.15.4 \
  react-native-worklets@0.10.x \
  @expensify/react-native-live-markdown@0.1.336 \
  @react-native-async-storage/async-storage@2.2.0 \
  expensify-common \
  expo-blur@~57.0.2 \
  expo-clipboard@~57.0.1 \
  expo-file-system@~57.0.4 \
  expo-font@~57.0.1 \
  expo-glass-effect@~57.0.1 \
  expo-image-manipulator@~57.0.11 \
  expo-image-picker@~57.0.11 \
  expo-status-bar@~57.0.1 \
  expo-video@~57.0.2
```

After installing, run a native build to link the native modules:

```bash
npx expo run:ios
# or
npx expo run:android
```

---

## Usage

```tsx
import { ForumKit } from '@timpel/forumkit-sdk-react-native';

export default function App() {
  return (
    <ForumKit
      forumId="YOUR_FORUM_ID"
      token={hostJwt}
      apiUrl="https://your-api.example.com"
      getToken={() => yourAuth.getFreshJwt()}
      onLogout={() => yourAuth.signOut()}
      theme={{ primaryColor: '#6200EE' }}
    />
  );
}
```

`ForumKit` is a full-screen component that includes its own navigation stack. Mount it at the root of your app or inside a dedicated screen.

---

## Configuration

| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| `forumId` | `string` | Yes | The forum's UUID, created via the ForumKit API. |
| `token` | `string` | Yes | A short-lived JWT signed by your backend. Used for the initial session exchange - see [JWT shape](#jwt-shape) below. |
| `apiUrl` | `string` | Yes | Base URL of your ForumKit API server. Required - there is no same-origin default inside a native app. |
| `getToken` | `() => Promise<string>` | No | Called to fetch a fresh host JWT for every session renewal. Without this, the session expires when `token` does. Strongly recommended for production. |
| `useHostTokenDirectly` | `boolean` | No | Skip the ForumKit session exchange and present your host JWT on every request. For Cognito-centralised auth or any setup that avoids a second token. Defaults to `false`. |
| `theme` | `ThemeTokens` | No | Colour overrides. See [Theming](#theming). |
| `onLogout` | `() => void` | No | Called when the user taps "Log Out". Your app owns the actual sign-out. Omit to hide the Log Out button entirely. |
| `brandName` | `string` | No | Replaces the "FORUM KIT" wordmark in the nav bar. Max 15 characters. |

---

## Authentication

ForumKit supports two authentication modes. Choose the one that fits your setup.

### Standard mode (default)

Your backend mints a short-lived JWT, signs it with `FORUM_SECRET_KEY` (the same secret set in your ForumKit API's environment), and passes it to the SDK. On initialisation the SDK exchanges that JWT for its own internal session token and uses that for all subsequent requests. Your app never needs to know ForumKit's internal token exists.

**1. Set `FORUM_SECRET_KEY` in your ForumKit API `.env`:**

```bash
FORUM_SECRET_KEY=a-long-random-secret-only-your-servers-know
```

**2. Add an endpoint to your backend that mints the token:**

```ts
import jwt from 'jsonwebtoken';

app.get('/api/forumkit-token', requireAuth, (req, res) => {
  const token = jwt.sign(
    {
      sub: req.user.id,           // your app's user ID
      name: req.user.displayName,
      email: req.user.email,
      role: toForumKitRole(req.user.role), // 'guest' | 'member' | 'moderator' | 'admin'
      forumId: 'YOUR_FORUM_ID',
    },
    process.env.FORUM_SECRET_KEY,
    { expiresIn: '15m', algorithm: 'HS256' }
  );
  res.send(token);
});
```

**3. Pass the token to the SDK:**

```tsx
<ForumKit
  forumId="YOUR_FORUM_ID"
  apiUrl="https://your-api.example.com"
  token={await fetch('https://your-api.example.com/forumkit-token').then(r => r.text())}
  getToken={() => fetch('https://your-api.example.com/forumkit-token').then(r => r.text())}
/>
```

`getToken` is called automatically before each session renewal. Without it the session will expire once the initial `token` does - always provide it in production.

---

### Direct host token mode (Cognito, Auth0, and similar)

If your app already authenticates users through an identity provider and you do not want a second token in your codebase, set `useHostTokenDirectly: true`. The SDK skips its own session exchange and presents your Access Token directly on every API request.

```tsx
import { Auth } from 'aws-amplify';

<ForumKit
  forumId="YOUR_FORUM_ID"
  apiUrl="https://your-api.example.com"
  token={cognitoAccessToken}
  useHostTokenDirectly={true}
  getToken={async () => {
    const session = await Auth.currentSession();
    return session.getAccessToken().getJwtToken();
  }}
/>
```

**Important - custom claims are required.** ForumKit reads `sub`, `name`, `email`, `role`, and `forumId` from the token on every request. Your identity provider will not add these automatically - you must configure custom claims on your tokens before using this mode.

For AWS Cognito, add a Pre Token Generation Lambda trigger that appends the claims:

```ts
exports.handler = async (event) => {
  event.response.claimsOverrideDetails = {
    claimsToAddOrOverride: {
      name: event.request.userAttributes.name,
      email: event.request.userAttributes.email,
      role: lookupRole(event.userName),  // map your Cognito group to 'member' | 'moderator' | 'admin'
      forumId: 'YOUR_FORUM_ID',
    },
  };
  return event;
};
```

The ForumKit API must also be configured to verify tokens from your identity provider. See the JWT verification settings in the [self-hosting guide](https://github.com/oluwaseun-odueso/forumkit-sdk#quick-start).

---

## Theming

Pass a `ThemeTokens` object to the `theme` prop. On React Native only colour tokens are applied - font family, font size, border radius, and spacing are fixed native values.

```ts
theme={{
  primaryColor: '#6200EE',
  primaryColorHover: '#7B29F5',
  backgroundColor: '#0D0D0D',
  surfaceColor: '#1A1A1A',
  borderColor: '#2E2E2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
}}
```

| Token | Description |
|-------|-------------|
| `primaryColor` | Accent colour for buttons, links, and active states. |
| `primaryColorHover` | Pressed/hover shade of the accent. |
| `backgroundColor` | App background. |
| `surfaceColor` | Card and panel background, one step above the app background. |
| `borderColor` | Subtle dividers and input borders. |
| `textPrimary` | Primary body text colour. |
| `textSecondary` | Muted labels and metadata. |

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
