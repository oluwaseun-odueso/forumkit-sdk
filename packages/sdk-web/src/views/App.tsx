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
import { Moderation } from './routes/Moderation';
import { AskResult } from './routes/AskResult';
import EditProfileModal from './components/profile/edit-profile-modal';
import DraftsListModal from './components/composer/drafts-list-modal';
import ShareModal from './components/shared/share-modal';
import ReportModal from './components/shared/report-modal';
import NotificationSettingsModal from './components/shared/notification-settings-modal';

// The host page's own z-index landscape is unknown (headers, sidebars, modals
// are all commonly positioned+z-indexed), so this full-viewport container
// needs a value that can't lose a stacking fight it doesn't know it's in -
// 2147483647 (max signed 32-bit int) is the same convention widgets like
// Intercom's use for exactly this reason.
const FULLSCREEN_STYLE = { position: 'fixed', inset: 0, zIndex: 2147483647 } as const;

function Router() {
  const {
    state, closeSettings, saveProfile, toggleTheme,
    closeDraftsList, resumeDraft, deleteDraftFromList,
    closeShareModal,
    closeReportModal, submitReport,
    setNotificationPref,
    closeNotificationSettingsModal,
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
      {state.view === 'moderation' && <Moderation />}
      {state.view === 'ask' && <AskResult />}
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
      {state.shareModal.open && <ShareModal onClose={closeShareModal} />}
      {state.reportModal.open && state.reportModal.target && (
        <ReportModal target={state.reportModal.target} onClose={closeReportModal} onSubmit={submitReport} />
      )}
      {state.notificationSettingsModal.open && (
        <NotificationSettingsModal
          notificationPrefs={profile.notificationPrefs}
          role={profile.role}
          onToggleNotificationPref={(type, enabled) => void setNotificationPref(type, enabled)}
          onClose={closeNotificationSettingsModal}
        />
      )}
    </>
  );
}

function SessionGate({ children }: { children: ReactNode }) {
  const session = useSession();

  if (session.status === 'loading') {
    return <div style={FULLSCREEN_STYLE} />;
  }
  if (session.status === 'error') {
    return <div style={FULLSCREEN_STYLE}>Failed to connect: {session.error}</div>;
  }
  return <>{children}</>;
}

export function App({ config }: { config: ForumKitConfig }) {
  return (
    <SessionProvider config={config}>
      <SessionGate>
        <ForumProvider>
          <div style={FULLSCREEN_STYLE}>
            <Router />
          </div>
        </ForumProvider>
      </SessionGate>
    </SessionProvider>
  );
}
