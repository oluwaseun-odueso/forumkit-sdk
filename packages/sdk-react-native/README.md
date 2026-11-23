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
