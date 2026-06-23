import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ForumKit } from './src/wrappers/react';

function App(): React.ReactElement {
  const [token, setToken] = useState('');
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <ForumKit
        forumId="0e53b554-16b0-47cf-983a-db68c02b362e"
        token={token}
        apiUrl="http://localhost:3000"
      />
    );
  }

  return (
    <div id="setup">
      <h1>React integration</h1>
      <p>
        Run <code>node gen-tokens.mjs</code> from the repo root to get a fresh JWT,
        then paste it below and click Load Forum.
      </p>
      <textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste JWT here..."
      />
      <button onClick={() => { if (token.trim()) setLoaded(true); }}>
        Load Forum
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
