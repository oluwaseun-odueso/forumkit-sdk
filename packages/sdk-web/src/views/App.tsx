import type { ReactNode } from 'react';
import type { ForumKitConfig } from '@forumkit/types';
import { ForumProvider, useForum } from './hooks/use-forum-state';
import { SessionProvider, useSession } from './hooks/use-session';
import { Feed } from './routes/Feed';
import { Thread } from './routes/Thread';
import { Profile } from './routes/Profile';
import { Compose } from './routes/Compose';
import EditProfileModal from './components/profile/edit-profile-modal';

function Router() {
  const { state, closeSettings, saveProfile, toggleTheme } = useForum();
  const { profile } = state;

  return (
    <>
      {state.view === 'feed' && <Feed />}
      {state.view === 'thread' && <Thread />}
      {state.view === 'profile' && <Profile />}
      {state.view === 'compose' && <Compose />}
      {state.settings.open && (
        <EditProfileModal
          displayName={profile.displayName}
          bio={profile.bio}
          socialLinks={profile.socialLinks}
          avatarUrl={profile.avatarUrl}
          bannerUrl={profile.bannerUrl}
          themePreference={profile.themePreference}
          onToggleTheme={toggleTheme}
          onSave={saveProfile}
          onClose={closeSettings}
        />
      )}
    </>
  );
}

function SessionGate({ children }: { children: ReactNode }) {
  const session = useSession();

  if (session.status === 'loading') {
    return <div style={{ position: 'fixed', inset: 0 }} />;
  }
  if (session.status === 'error') {
    return <div style={{ position: 'fixed', inset: 0 }}>Failed to connect: {session.error}</div>;
  }
  return <>{children}</>;
}

export function App({ config }: { config: ForumKitConfig }) {
  return (
    <SessionProvider config={config}>
      <SessionGate>
        <ForumProvider>
          <div style={{ position: 'fixed', inset: 0 }}>
            <Router />
          </div>
        </ForumProvider>
      </SessionGate>
    </SessionProvider>
  );
}
