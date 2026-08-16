import { registerRootComponent } from 'expo';
import App from './App';

// Registers the root component for the standalone Expo dev-harness app
// (npm run ios / android / start) — the actual installable library entry a
// host app imports is src/index.ts (see package.json's "exports" field),
// not this file.
registerRootComponent(App);
