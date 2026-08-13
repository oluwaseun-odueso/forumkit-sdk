import type { ReactNode } from 'react';
import type { ForumKitConfig } from '@forumkit/types';
import { ForumProvider, useForum } from './hooks/use-forum-state';
import { SessionProvider, useSession } from './hooks/use-session';
import { Feed } from './routes/Feed';
import { Thread } from './routes/Thread';
import { Profile } from './routes/Profile';
import { Compose } from './routes/Compose';
import { SearchResults } from './routes/SearchResults';
import { Notifications } from './routes/Notifications';
import EditProfileModal from './components/profile/edit-profile-modal';
import DraftsListModal from './components/composer/drafts-list-modal';

function Router() {
  const {
    state, closeSettings, saveProfile, toggleTheme,
    closeDraftsList, resumeDraft, deleteDraftFromList,
  } = useForum();
  const { profile } = state;

  return (
    <>
      {state.view === 'feed' && <Feed />}
      {state.view === 'thread' && <Thread />}
      {state.view === 'profile' && <Profile />}
      {state.view === 'compose' && <Compose />}
      {state.view === 'search' && <SearchResults />}
      {state.view === 'notifications' && <Notifications />}
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
      {state.draftsModal.open && (
        <DraftsListModal
          items={state.draftsModal.items}
          loading={state.draftsModal.loading}
          highlightedDraftId={state.draftsModal.highlightedDraftId}
          onClose={closeDraftsList}
          onResume={resumeDraft}
          onDelete={deleteDraftFromList}
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
