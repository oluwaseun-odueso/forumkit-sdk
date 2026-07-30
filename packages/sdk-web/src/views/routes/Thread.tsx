import { useState } from 'react';
import Shell from '../components/layout/shell';
import RightRail from '../components/layout/right-rail';
import ThreadView from '../components/thread/thread-view';
import AssistantPanel from '../components/thread/assistant-panel';
import { useForum } from '../hooks/use-forum-state';

export function Thread() {
  const forum = useForum();
  const { state, communities, setView, openThread, summarize, suggest, surfaceRelated } = forum;
  const [assistantOpen, setAssistantOpen] = useState(false);

  return (
    <Shell
      onAsk={() => setAssistantOpen(o => !o)}
      rail={
        <>
          {assistantOpen && (
            <AssistantPanel
              asst={state.asst}
              onClose={() => setAssistantOpen(false)}
              onSummarize={summarize}
              onSuggest={suggest}
              onSurfaceRelated={surfaceRelated}
              onOpenRelated={openThread}
            />
          )}
          <RightRail
            communities={communities}
            sections={{ similar: state.rail.similar, featured: state.rail.featured }}
            onOpenPost={openThread}
          />
        </>
      }
    >
      <ThreadView forum={forum} onBack={() => setView('feed')} />
    </Shell>
  );
}
