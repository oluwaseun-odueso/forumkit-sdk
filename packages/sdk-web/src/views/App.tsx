import { ForumProvider, useForum } from './hooks/use-forum-state';
import { Feed } from './routes/Feed';
import { Thread } from './routes/Thread';
import { Profile } from './routes/Profile';
import { Compose } from './routes/Compose';

function Router() {
  const { state } = useForum();

  return (
    <>
      {state.view === 'feed' && <Feed />}
      {state.view === 'thread' && <Thread />}
      {state.view === 'profile' && <Profile />}
      {state.view === 'compose' && <Compose />}
    </>
  );
}

export function App() {
  return (
    <ForumProvider>
      <div style={{ position: 'fixed', inset: 0 }}>
        <Router />
      </div>
    </ForumProvider>
  );
}
