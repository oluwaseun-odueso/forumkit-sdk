import { useState } from 'react';
import type { useForum, CommentNodeData } from '../../hooks/use-forum-state';
import Avatar from '../shared/avatar';
import Thumbnail from '../shared/thumbnail';
import VotePill from '../shared/vote-pill';
import PillButton from '../shared/pill-button';
import { ChevronLeftIcon, CommentIcon, ShareIcon, CloseIcon, AiSparkleIcon } from '../shared/icons';
import CommentSort from './comment-sort';
import Comment from './comment';
import './thread-view.css';

type ThreadViewProps = {
  forum: ReturnType<typeof useForum>;
  onBack: () => void;
};

function filterComments(list: CommentNodeData[], q: string): CommentNodeData[] {
  const lower = q.toLowerCase();
  return list.reduce<CommentNodeData[]>((acc, c) => {
    const filteredReplies = filterComments(c.replies, lower);
    if (c.body.toLowerCase().includes(lower) || filteredReplies.length > 0) {
      acc.push({ ...c, replies: filteredReplies });
    }
    return acc;
  }, []);
}

export default function ThreadView({ forum, onBack }: ThreadViewProps) {
  const {
    state, activePost, sortedComments, communities,
    votePost, voteComment, setCommentInput, submitComment, setCommentSort, toggleCommentCollapsed,
    summarize, suggest,
  } = forum;
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [commentSearch, setCommentSearch] = useState('');
  const [aiPanel, setAiPanel] = useState<'summary' | 'reply' | null>(null);

  if (!activePost) return null;
  const community = communities.find(c => c.id === activePost.communityId);
  const displayComments = commentSearch ? filterComments(sortedComments, commentSearch) : sortedComments;

  function handleSummarise() {
    if (aiPanel === 'summary') {
      setAiPanel(null);
    } else {
      setAiPanel('summary');
      if (!state.asst.summary && !state.asst.summarizing) void summarize();
    }
  }

  function handleSuggestReply() {
    if (aiPanel === 'reply') {
      setAiPanel(null);
    } else {
      setAiPanel('reply');
      if (!state.asst.suggested) void suggest();
    }
  }

  return (
    <div className="fk-thread">
      <PillButton variant="surface" icon={<ChevronLeftIcon />} onClick={onBack}>Back</PillButton>

      <div className="fk-thread-head">
        {community && <Avatar size={26} gradient={community.gradient} letter={community.letter} />}
        <span className="fk-thread-community">{community?.name}</span>
        <span className="fk-thread-time">· {activePost.time}</span>
      </div>

      <h1 className="fk-thread-title">{activePost.title}</h1>
      <p className="fk-thread-body">{activePost.body}</p>
      <Thumbnail gradient={activePost.thumbGradient} imageUrl={activePost.imageUrl} height={340} radius={16} style={{ marginBottom: 16 }} />

      <div className="fk-thread-actions">
        <VotePill votes={activePost.votes} dir={state.feed.votes[activePost.id] ?? 0} onVote={dir => votePost(activePost.id, dir)} />
        <div className="fk-thread-chip fk-thread-chip--static">
          <CommentIcon size={18} />
          {activePost.commentCount}
        </div>
        <button type="button" className="fk-thread-chip">
          <ShareIcon size={18} />
          Share
        </button>
      </div>

      <div className="fk-ai-row">
        <button
          type="button"
          className={`fk-ai-btn${aiPanel === 'summary' ? ' fk-ai-btn--active' : ''}`}
          onClick={handleSummarise}
        >
          <AiSparkleIcon gradId="fkAiG1" size={17} />
          Summarise thread
        </button>
        <button
          type="button"
          className={`fk-ai-btn${aiPanel === 'reply' ? ' fk-ai-btn--active' : ''}`}
          onClick={handleSuggestReply}
        >
          <AiSparkleIcon gradId="fkAiG2" size={17} />
          Suggest reply
        </button>
      </div>

      {aiPanel && (
        <div className="fk-ai-panel">
          <div className="fk-ai-panel-head">
            <AiSparkleIcon gradId="fkAiPG" size={16} />
            <span>{aiPanel === 'summary' ? 'Thread summary' : 'Suggested reply'}</span>
            <button type="button" onClick={() => setAiPanel(null)}>
              <CloseIcon size={16} />
            </button>
          </div>
          <div className="fk-ai-panel-body">
            {aiPanel === 'summary'
              ? state.asst.summarizing
                ? 'Summarising…'
                : state.asst.summary
                  ? state.asst.summary.points.map((p, i) => <p key={i}>{p}</p>)
                  : 'No summary yet.'
              : state.thread.commentInput || 'Generating suggestion…'}
          </div>
        </div>
      )}

      <div className="fk-thread-composer">
        <input
          className="fk-thread-composer-input"
          placeholder="Add a comment"
          value={state.thread.commentInput}
          onChange={e => setCommentInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
        />
        <PillButton variant="accent" onClick={submitComment}>Comment</PillButton>
      </div>

      <CommentSort
        sort={state.thread.commentSort}
        open={sortMenuOpen}
        onToggle={() => setSortMenuOpen(o => !o)}
        onClose={() => setSortMenuOpen(false)}
        onSelect={sort => { setCommentSort(sort); setSortMenuOpen(false); }}
        commentSearch={commentSearch}
        onCommentSearchChange={setCommentSearch}
      />

      {displayComments.map(comment => (
        <Comment
          key={comment.id}
          comment={comment}
          collapsed={state.thread.collapsed}
          votes={state.thread.commentVotes}
          onToggleCollapsed={toggleCommentCollapsed}
          onVote={voteComment}
        />
      ))}
    </div>
  );
}
