import Shell from '../components/layout/shell';
import ComposerModal from '../components/composer/composer-modal';
import PillButton from '../components/shared/pill-button';
import { ChevronLeftIcon } from '../components/shared/icons';
import { useForum } from '../hooks/use-forum-state';
import './compose.css';

export function Compose() {
  const {
    state, forumId, sessionToken, closeComposer, setComposerTab, setComposerField,
    addFiles, removeFile, updateAttachmentMeta, suggestComposeMeta, submitComposer,
    saveDraft, openDraftsList, goBack,
  } = useForum();

  return (
    <Shell mainAlign="start">
      <div className="fk-compose">
        {state.history.length > 0 && (
          <PillButton variant="surface" icon={<ChevronLeftIcon />} onClick={goBack} style={{ marginBottom: 14 }}>Back</PillButton>
        )}
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
