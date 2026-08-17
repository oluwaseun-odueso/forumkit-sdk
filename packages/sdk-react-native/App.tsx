import { Platform } from 'react-native';
import { ForumKit } from './src/ForumKit';

// Dev-harness entry — mounts the SDK the same way a host app eventually will,
// against the local dev API. The forumId + token come from Expo env vars so no
// real JWT lives in this committed file: run `node gen-tokens-native.mjs` (from
// the repo root) to write a gitignored .env with a long-lived dev token for the
// seeded users. Restart Metro after generating so Expo picks up the new .env.
//
// apiUrl: real phones can't reach the host's loopback, so they need the Mac's
// LAN IP — gen-tokens-native.mjs auto-detects it and writes EXPO_PUBLIC_FK_API_URL
// into the .env, which wins here when set. Falling back (no env, i.e. running on
// a simulator/emulator with no LAN detected): the iOS simulator reaches the host
// at localhost; the Android emulator reaches it at 10.0.2.2.
const API_URL = process.env.EXPO_PUBLIC_FK_API_URL
  ?? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');
const FORUM_ID = process.env.EXPO_PUBLIC_FK_FORUM_ID ?? '';
const TOKEN = process.env.EXPO_PUBLIC_FK_TOKEN ?? '';

export default function App() {
  return (
    <ForumKit
      forumId={FORUM_ID}
      token={TOKEN}
      apiUrl={API_URL}
      platform="native"
    />
  );
}
