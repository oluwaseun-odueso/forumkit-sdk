import Shell from '../components/layout/shell';
import ComposerModal from '../components/composer/composer-modal';
import { useForum } from '../hooks/use-forum-state';
import './compose.css';

export function Compose() {
  const {
    state, forumId, sessionToken, closeComposer, setComposerTab, setComposerField,
    addFiles, removeFile, updateAttachmentMeta, suggestComposeMeta, submitComposer,
    saveDraft, openDraftsList,
  } = useForum();

  return (
    <Shell>
      <div className="fk-compose">
        <ComposerModal
          composer={state.composer}
          forumId={forumId}
          sessionToken={sessionToken}
          onClose={closeComposer}
          onSetTab={setComposerTab}
          onSetField={setComposerField}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          onUpdateMeta={updateAttachmentMeta}
          onSuggestMeta={suggestComposeMeta}
          onSubmit={submitComposer}
          onSaveDraft={() => saveDraft()}
          onOpenDraftsList={openDraftsList}
        />
      </div>
    </Shell>
  );
}
