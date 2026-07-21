import Shell from '../components/layout/shell';
import ComposerModal from '../components/composer/composer-modal';
import { useForum } from '../hooks/use-forum-state';
import './compose.css';

export function Compose() {
  const {
    state, closeComposer, setComposerTab, setComposerField,
    addFiles, removeFile, suggestComposeMeta, submitComposer,
  } = useForum();

  return (
    <Shell>
      <div className="fk-compose">
        <ComposerModal
          composer={state.composer}
          onClose={closeComposer}
          onSetTab={setComposerTab}
          onSetField={setComposerField}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          onSuggestMeta={suggestComposeMeta}
          onSubmit={submitComposer}
        />
      </div>
    </Shell>
  );
}
