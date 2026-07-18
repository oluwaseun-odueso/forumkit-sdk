import type { useForum } from '../../hooks/use-forum-state';
import { useSpeech } from '../../hooks/use-speech';
import PillButton from '../shared/pill-button';
import { SparkleIcon, CloseIcon } from '../shared/icons';
import './assistant-panel.css';

type AssistantPanelProps = {
  asst: ReturnType<typeof useForum>['state']['asst'];
  onClose: () => void;
  onSummarize: () => void;
  onSuggest: () => void;
  onSurfaceRelated: () => void;
  onOpenRelated: (id: string) => void;
};

/**
 * The AI assistant surface for the thread view: thread summary,
 * suggested-reply, and related-thread lookups, plus read-aloud for the
 * summary. Opened from the top nav's "Ask" button; replaces the right rail
 * (which the design hides on the thread view anyway).
 */
export default function AssistantPanel({ asst, onClose, onSummarize, onSuggest, onSurfaceRelated, onOpenRelated }: AssistantPanelProps) {
  const { speak, stop, speaking, supported } = useSpeech();

  return (
    <aside className="fk-assistant-panel">
      <div className="fk-assistant-header">
        <span className="fk-assistant-title"><SparkleIcon size={15} /> Ask Forum Kit</span>
        <button type="button" className="fk-assistant-close" aria-label="Close" onClick={onClose}>
          <CloseIcon size={16} />
        </button>
      </div>

      <div className="fk-assistant-card">
        <div className="fk-assistant-card-head">
          <span className="fk-assistant-card-title">Thread summary</span>
          {supported && asst.summary && (
            <button
              type="button"
              className="fk-assistant-speak"
              aria-label={speaking ? 'Stop speaking' : 'Read summary aloud'}
              onClick={() => (speaking ? stop() : speak(asst.summary!.points.join('. ')))}
            >
              {speaking ? '◼' : '▶'}
            </button>
          )}
        </div>
        {asst.summary ? (
          <>
            <ul className="fk-assistant-points">
              {asst.summary.points.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
            <div className="fk-assistant-note">{asst.summary.note}</div>
          </>
        ) : (
          <PillButton variant="surface" onClick={onSummarize}>
            {asst.summarizing ? 'Summarizing…' : 'Summarize thread'}
          </PillButton>
        )}
      </div>

      <div className="fk-assistant-card">
        <div className="fk-assistant-card-head">
          <span className="fk-assistant-card-title">Suggested reply</span>
        </div>
        <PillButton variant="surface" onClick={onSuggest}>
          {asst.suggested ? 'Suggest another' : 'Suggest a reply'}
        </PillButton>
      </div>

      <div className="fk-assistant-card">
        <div className="fk-assistant-card-head">
          <span className="fk-assistant-card-title">Related threads</span>
        </div>
        {asst.related && asst.related.length > 0 ? (
          <ul className="fk-assistant-related">
            {asst.related.map(t => (
              <li key={t.id}>
                <button type="button" className="fk-assistant-related-btn" onClick={() => onOpenRelated(t.id)}>
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <PillButton variant="surface" onClick={onSurfaceRelated}>
            {asst.surfacing ? 'Looking…' : 'Surface related threads'}
          </PillButton>
        )}
      </div>
    </aside>
  );
}
