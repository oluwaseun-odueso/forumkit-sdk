import { ForumKit } from './src/ForumKit';

// Dev-harness entry — mounts the SDK the same way a host app eventually
// will, against a local API instance. Swap these for real values (or read
// from env) once there's an actual dev forum/session to point at.
export default function App() {
  return (
    <ForumKit
      forumId="dev-forum"
      token="dev-token"
      apiUrl="http://localhost:3000"
      platform="native"
    />
  );
}
