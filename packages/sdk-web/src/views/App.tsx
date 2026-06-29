import { ForumProvider } from './hooks/useForumState';
import { Thread } from './routes/Thread';

export function App() {
  return (
    <ForumProvider>
      <div style={{ position: 'fixed', inset: 0 }}>
        <Thread />
      </div>
    </ForumProvider>
  );
}
