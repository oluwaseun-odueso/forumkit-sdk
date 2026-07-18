import { ForumProvider, useForum } from './hooks/use-forum-state';
import { Feed } from './routes/Feed';
import { Thread } from './routes/Thread';
import { Profile } from './routes/Profile';
import ComposerModal from './components/composer/composer-modal';

function Router() {
  const {
    state, communities, closeComposer, setComposerTab, setComposerField,
    setComposerCommunity, addFiles, removeFile, suggestComposeMeta, submitComposer,
  } = useForum();

  return (
    <>
      {state.view === 'feed' && <Feed />}
      {state.view === 'thread' && <Thread />}
      {state.view === 'profile' && <Profile />}
      <ComposerModal
        composer={state.composer}
        communities={communities}
        onClose={closeComposer}
        onSetTab={setComposerTab}
        onSetField={setComposerField}
        onSetCommunity={setComposerCommunity}
        onAddFiles={addFiles}
        onRemoveFile={removeFile}
        onSuggestMeta={suggestComposeMeta}
        onSubmit={submitComposer}
      />
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
