import { AuroraLayer } from '../components/AuroraLayer';
import { GrainLayer } from '../components/GrainLayer';
import { Mascot } from '../components/Mascot';
import { PostNode } from '../components/PostNode';
import { SpineNode } from '../components/SpineNode';
import { AssistantRail } from '../components/AssistantRail';
import { ReplyCard } from '../components/ReplyCard';
import { Composer } from '../components/Composer';
import { SortBar } from '../components/SortBar';
import { Sidebar } from '../components/Sidebar';
import { NavOverlay } from '../components/NavOverlay';
import { ComposeSheet } from '../components/ComposeSheet';
import { chromeButton } from '../styles/tokens';
import { useForum } from '../hooks/useForumState';
import { useTheme } from '../hooks/useTheme';

export function Thread() {
  const {
    state, sortedReplies, totalReplies, tagNames, tagCounts,
    upvotePost, upvoteReply, toggleReaction, togglePicker,
    openReply, setReplyText, cancelReply, submitReply,
    setInput, postReply, acceptReply,
    setSidebar, openSearch, openTag, closeNav, setNavQuery,
    openCompose, closeCompose, setComposeField, addFiles, removeFile, submitCompose,
    setSort, summarize, suggest, surfaceRelated, suggestComposeMeta,
  } = useForum();
  const { theme, toggleTheme } = useTheme();

  const { thread, input, reply, reactPicker, sort, sidebar, nav, compose, asst } = state;

  const replyHandlers = {
    onUpvoteReply: upvoteReply,
    onToggleReaction: toggleReaction,
    onTogglePicker: togglePicker,
    onOpenReply: openReply,
    onSetReplyText: setReplyText,
    onCancelReply: cancelReply,
    onSubmitReply: submitReply,
    onAcceptReply: acceptReply,
    replyInProgress: reply,
    reactPicker,
  };

  return (
    // Outer frame is a flex ROW — main pane (left) + AI rail (right) are siblings,
    // so the rail reaches the full height of the frame including the header row.
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: 'radial-gradient(120% 90% at 78% -10%, var(--t7, #192036) 0%, var(--t4, #0c1019) 50%, var(--t1, #07090f) 100%)',
      display: 'flex',
    }}>
      <AuroraLayer variant="assistant" />
      <GrainLayer />

      {/* Main thread pane — flex column containing header + scroll area + composer */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header — border-bottom is the "thin title line" across the top of the thread pane */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 11, padding: '20px 30px',
          borderBottom: '1px solid rgba(108,170,245,.1)',
          flexShrink: 0,
        }}>
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={() => setSidebar(true)}
            style={{
              width: 36, height: 36, borderRadius: 11, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: 'var(--t59, rgba(218,229,247,.06))',
              border: '1px solid var(--t66, rgba(218,229,247,.14))',
            }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: 16, height: 1.6, borderRadius: 2, background: 'var(--t23, #acb7cc)' }} />
            ))}
          </button>

          <Mascot size={32} />

          {/* Wordmark in Michroma per spec */}
          <span style={{ fontFamily: 'Michroma,sans-serif', fontSize: 13, letterSpacing: '2px', color: 'var(--t30, #e9eff8)' }}>
            FORUM KIT
          </span>
          <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t12, #5b6376)', marginLeft: 6 }}>
            / Writing
          </span>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={toggleTheme}
            style={{
              width: 36, height: 36, borderRadius: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              background: 'var(--t59, rgba(218,229,247,.06))',
              border: '1px solid var(--t66, rgba(218,229,247,.14))',
              color: 'var(--t23, #acb7cc)',
            }}
          >
            {theme === 'dark' ? '☀' : '☽'}
          </button>

          <button
            type="button"
            aria-label="New post"
            onClick={openCompose}
            style={{
              ...chromeButton, display: 'inline-flex', alignItems: 'center', gap: 7,
              height: 34, padding: '0 16px', borderRadius: 11,
              cursor: 'pointer', border: 'none',
              fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 500,
            }}
          >
            + New post
          </button>
        </header>

        {/* Scrollable centered thread body */}
        <div style={{
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '40px 34px 0',
        }}>
          <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column' }}>
            <PostNode post={thread.post} totalReplies={totalReplies} onUpvote={upvotePost} />

            <div style={{ margin: '0 0 14px' }}>
              <SortBar
                sort={sort}
                repliesHeader={`${totalReplies} REPL${totalReplies !== 1 ? 'IES' : 'Y'}`}
                onSetSort={setSort}
              />
            </div>

            {sortedReplies.map((r, i) => (
              <SpineNode key={r.id} isLast={i === sortedReplies.length - 1}>
                <ReplyCard reply={r} handlers={replyHandlers} variant="aurora" />
              </SpineNode>
            ))}

            {/* Bottom padding so last reply doesn't sit flush against composer */}
            <div style={{ height: 32 }} />
          </div>
        </div>

        {/* Composer — fixed to the bottom of the thread pane, not inside the scroll */}
        <div style={{ padding: '14px 34px 26px', flexShrink: 0 }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <Composer
              value={input}
              placeholder="Add a node to the thread…"
              onChange={setInput}
              onPost={postReply}
              variant="aurora"
            />
          </div>
        </div>
      </div>

      {/* Lina AI rail — sibling to main pane, spans full height */}
      <AssistantRail asst={asst} onSummarize={summarize} onSuggest={suggest} onSurfaceRelated={surfaceRelated} />

      {/* Overlays */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: sidebar || nav.mode !== null || compose.open ? 'auto' : 'none' }}>
        <Sidebar
          open={sidebar}
          onClose={() => setSidebar(false)}
          onSearch={openSearch}
          onTag={openTag}
          tagNames={tagNames}
          tagCounts={tagCounts}
          directory={state.directory}
          activeTag={nav.mode === 'tag' ? nav.tag : null}
        />
        <NavOverlay
          mode={nav.mode}
          tag={nav.tag}
          query={nav.query}
          directory={state.directory}
          onClose={closeNav}
          onQueryChange={setNavQuery}
        />
        <ComposeSheet
          compose={compose}
          onClose={closeCompose}
          onSetField={setComposeField}
          onAddFiles={addFiles}
          onRemoveFile={removeFile}
          onSubmit={submitCompose}
          onSuggestMetadata={suggestComposeMeta}
        />
      </div>
    </div>
  );
}
