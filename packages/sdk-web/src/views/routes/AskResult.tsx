import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchResult } from '@forumkit/types';
import Shell from '../components/layout/shell';
import Modal from '../components/shared/modal';
import MascotIcon from '../components/layout/mascot-icon';
import PillButton from '../components/shared/pill-button';
import Avatar from '../components/shared/avatar';
import { ChevronLeftIcon, ChevronRightIcon, SparkleIcon, LinkIcon } from '../components/shared/icons';
import { authorAvatar } from '../lib/author-avatar';
import { fmtRelativeTime } from '../lib/format-time';
import { useForum } from '../hooks/use-forum-state';
import { callAskStreaming } from '../api/ai';
import type { AskStreamEvent } from '../api/ai';
import './ask-result.css';

type AskBullet = { fact: string; quote: string; sourceIndex: number };
type AskCategory = { title: string; bullets: AskBullet[] };

type PartialAnswer = {
  intro: string;
  categories: AskCategory[];
};

type Turn = {
  query: string;
  answer: PartialAnswer | null;
  sources: SearchResult[];
  loading: boolean;
  error: string | null;
};

function SourcesModal({ sources, onClose, onOpenThread }: {
  sources: SearchResult[];
  onClose: () => void;
  onOpenThread: (id: string) => void;
}) {
  return (
    <Modal onClose={onClose} maxWidth={560}>
      <div className="fk-ask-sources-modal-title">Sources</div>
      <div className="fk-ask-sources-inner">
        {sources.map((s, i) => {
          const avatar = authorAvatar(s.authorId, s.authorDisplayName);
          return (
            <button
              key={s.threadId}
              type="button"
              className="fk-ask-source-card"
              onClick={() => { onClose(); onOpenThread(s.threadId); }}
            >
              <Avatar size={32} gradient={avatar.gradient} letter={avatar.letter} imageUrl={s.authorAvatarUrl} />
              <div className="fk-ask-source-card-body">
                <div className="fk-ask-source-card-title">[{i + 1}] {s.title}</div>
                <div className="fk-ask-source-card-meta">
                  {s.authorDisplayName} · {fmtRelativeTime(s.createdAt)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function TurnView({ turn, onOpenThread, onOpenSources }: {
  turn: Turn;
  onOpenThread: (id: string) => void;
  onOpenSources: () => void;
}) {
  const mediaSources = turn.sources.filter(s => s.imageUrl !== null);

  return (
    <div className="fk-ask-turn">
      <div className="fk-ask-turn-query-row">
        <div className="fk-ask-turn-query-pill">{turn.query}</div>
      </div>

      {turn.sources.length > 0 && (
        <button type="button" className="fk-ask-source-pill" onClick={onOpenSources}>
          <LinkIcon size={12} />
          {turn.sources.length} source{turn.sources.length !== 1 ? 's' : ''}
        </button>
      )}

      {turn.loading && !turn.answer?.intro && (
        <div className="fk-ask-spinner">
          <MascotIcon size={22} variant="nav" />
          Thinking…
        </div>
      )}

      {turn.error && (
        <div className="fk-ask-disclaimer" style={{ fontStyle: 'normal', color: 'var(--text-2)' }}>{turn.error}</div>
      )}

      {turn.answer?.intro && (
        <div className="fk-ask-intro">{turn.answer.intro}</div>
      )}

      {turn.answer?.categories.map((cat, i) => (
        <div key={i} className="fk-ask-category">
          <div className="fk-ask-category-title">{cat.title}</div>
          {cat.bullets.map((b, j) => (
            <div key={j} className="fk-ask-bullet">
              <div className="fk-ask-bullet-fact">{b.fact}</div>
              <div className="fk-ask-bullet-quote">"{b.quote}"</div>
              {turn.sources[b.sourceIndex] && (
                <button
                  type="button"
                  className="fk-ask-attr-chip"
                  onClick={() => onOpenThread(turn.sources[b.sourceIndex]!.threadId)}
                >
                  [{b.sourceIndex + 1}] {turn.sources[b.sourceIndex]!.title.slice(0, 40)}{turn.sources[b.sourceIndex]!.title.length > 40 ? '…' : ''}
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      {!turn.loading && turn.answer && mediaSources.length > 0 && (
        <div className="fk-ask-media-row">
          {mediaSources.map(s => (
            <button key={s.threadId} type="button" className="fk-ask-media-thumb" onClick={() => onOpenThread(s.threadId)}>
              <img src={s.imageUrl!} alt="" />
            </button>
          ))}
        </div>
      )}

      {!turn.loading && turn.answer && (
        <div className="fk-ask-disclaimer">
          Responses are AI-generated from threads and comments and may not be accurate.
        </div>
      )}
    </div>
  );
}

export function AskResult() {
  const { state, openThread, goBack, forumId, sessionToken } = useForum();
  const initialQuery = state.ask.query;

  const [turns, setTurns] = useState<Turn[]>([]);
  const [followUp, setFollowUp] = useState('');
  const [sourcesModalTurnIdx, setSourcesModalTurnIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ask = useCallback(async (q: string) => {
    const idx = turns.length;
    setTurns(prev => [...prev, { query: q, answer: null, sources: [], loading: true, error: null }]);

    try {
      await callAskStreaming(forumId, q, sessionToken, (event: AskStreamEvent) => {
        setTurns(prev => prev.map((t, i) => {
          if (i !== idx) return t;
          if (event.type === 'sources') return { ...t, sources: event.sources };
          if (event.type === 'intro') {
            return { ...t, answer: { intro: event.text, categories: t.answer?.categories ?? [] } };
          }
          if (event.type === 'category') {
            const existing = t.answer ?? { intro: '', categories: [] };
            return { ...t, answer: { ...existing, categories: [...existing.categories, { title: event.title, bullets: event.bullets }] } };
          }
          if (event.type === 'error') return { ...t, error: event.message };
          return t;
        }));
      });
    } catch (err) {
      setTurns(prev => prev.map((t, i) =>
        i === idx
          ? { ...t, error: err instanceof Error ? err.message : 'Something went wrong' }
          : t,
      ));
    } finally {
      setTurns(prev => prev.map((t, i) => i === idx ? { ...t, loading: false } : t));
    }
  }, [forumId, sessionToken, turns.length]);

  // Fire the initial question once on mount
  const hasAsked = useRef(false);
  useEffect(() => {
    if (hasAsked.current || !initialQuery) return;
    hasAsked.current = true;
    void ask(initialQuery);
  }, [initialQuery, ask]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  function submitFollowUp() {
    const q = followUp.trim();
    if (!q) return;
    setFollowUp('');
    void ask(q);
  }

  const sourcesModalTurn = sourcesModalTurnIdx !== null ? turns[sourcesModalTurnIdx] : null;

  return (
    <Shell askActive>
      <div className="fk-profile fk-ask-result-wide">
        {state.history.length > 0 && (
          <PillButton variant="surface" icon={<ChevronLeftIcon />} onClick={goBack} style={{ marginBottom: 14 }}>Back</PillButton>
        )}

        <div className="fk-ask-result-header">
          <SparkleIcon size={22} />
          <h1 className="fk-ask-result-title">Ask AI</h1>
        </div>

        <div className="fk-ask-result-turns">
          {turns.map((turn, i) => (
            <TurnView
              key={i}
              turn={turn}
              onOpenThread={openThread}
              onOpenSources={() => setSourcesModalTurnIdx(i)}
            />
          ))}
        </div>

        <div ref={bottomRef} />

        <div className="fk-ask-followup-bar">
          <input
            className="fk-ask-followup-input"
            placeholder="Ask a follow-up…"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitFollowUp(); }}
          />
          <button
            type="button"
            className="fk-ask-followup-btn"
            disabled={!followUp.trim()}
            onClick={submitFollowUp}
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      {sourcesModalTurn && (
        <SourcesModal
          sources={sourcesModalTurn.sources}
          onClose={() => setSourcesModalTurnIdx(null)}
          onOpenThread={openThread}
        />
      )}
    </Shell>
  );
}
