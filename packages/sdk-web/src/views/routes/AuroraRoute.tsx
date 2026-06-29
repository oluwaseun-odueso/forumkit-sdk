import { AuroraLayer } from '../components/AuroraLayer';
import { GrainLayer } from '../components/GrainLayer';
import { Mascot } from '../components/Mascot';
import { TagPill } from '../components/TagPill';
import { ReplyCard } from '../components/ReplyCard';
import { Composer } from '../components/Composer';
import { Sidebar } from '../components/Sidebar';
import { NavOverlay } from '../components/NavOverlay';
import { ComposeSheet } from '../components/ComposeSheet';
import { useForum } from '../hooks/useForumState';
import { useTheme } from '../hooks/useTheme';

export function AuroraRoute() {
  const {
    state, sortedReplies, totalReplies, tagNames, tagCounts,
    upvotePost, upvoteReply, toggleReaction, togglePicker,
    openReply, setReplyText, cancelReply, submitReply,
    setInput, postReply, acceptReply,
    setSidebar, openSearch, openTag, closeNav, setNavQuery,
    openCompose, closeCompose, setComposeField, addFiles, removeFile, submitCompose,
  } = useForum();
  const { theme, toggleTheme } = useTheme();

  const { thread, input, reply, reactPicker, sidebar, nav, compose } = state;

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
    <div style={{
      position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
      background: 'radial-gradient(110% 70% at 50% 6%, #222a48 0%, #0d1226 44%, #07090f 100%)',
    }}>
      <AuroraLayer variant="aurora" />
      <GrainLayer />

      {/* Controls — absolute positioned over the top */}
      <div style={{ position: 'absolute', top: 18, left: 18, zIndex: 2 }}>
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={() => setSidebar(true)}
          style={{
            width: 36, height: 36, borderRadius: 11, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'var(--t59, rgba(218,229,247,.06))',
            border: '1px solid var(--t65, rgba(218,229,247,.13))',
          }}
        >
          {[0, 1, 2].map(i => (
            <span key={i} style={{ display: 'block', width: 14, height: 1.5, borderRadius: 2, background: 'var(--t23, #acb7cc)' }} />
          ))}
        </button>
      </div>

      <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 2 }}>
        <button
          type="button"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          onClick={toggleTheme}
          style={{
            width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            background: 'var(--t59, rgba(218,229,247,.06))',
            border: '1px solid var(--t65, rgba(218,229,247,.13))',
            color: 'var(--t23, #acb7cc)',
          }}
        >
          {theme === 'dark' ? '☀' : '☽'}
        </button>
      </div>

      {/* Scrollable centered column */}
      <div style={{
        position: 'relative', zIndex: 1, height: '100%',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '64px 24px 0',
      }}>
        <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column' }}>

          {/* Floating mascot orb */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <div style={{ animation: 'fkfloat 5s ease-in-out infinite' }}>
              <Mascot size={80} />
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
            {thread.post.tags.map(t => <TagPill key={t} tag={t} />)}
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 600,
            color: 'var(--t30, #e9eff8)', lineHeight: 1.35,
            textAlign: 'center', margin: '0 0 8px',
          }}>
            {thread.post.title}
          </h1>

          {/* Author + meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12.5, color: 'var(--t20, #9da9be)' }}>{thread.post.author}</span>
            <span style={{ color: 'var(--t12, #5b6376)', fontSize: 10 }}>·</span>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t14, #6b7488)' }}>{thread.post.time}</span>
            <span style={{ color: 'var(--t12, #5b6376)', fontSize: 10 }}>·</span>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t14, #6b7488)' }}>{totalReplies} repl{totalReplies !== 1 ? 'ies' : 'y'}</span>
          </div>

          {/* Opening post body */}
          <p style={{
            fontFamily: 'Sora,sans-serif', fontSize: 16, lineHeight: 1.65,
            color: 'var(--t25, #b8c4d9)', margin: '0 0 40px', textAlign: 'center',
          }}>
            {thread.post.body}
          </p>

          {/* Upvote row */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 44 }}>
            <button
              type="button"
              aria-pressed={thread.post.voted}
              aria-label={`Upvote post (${thread.post.votes} votes)`}
              onClick={upvotePost}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '7px 18px', borderRadius: 24, cursor: 'pointer',
                fontFamily: 'Sora,sans-serif', fontSize: 13,
                ...(thread.post.voted
                  ? { color: '#16203a', background: 'linear-gradient(155deg,#e3ebf8,#adbbd7)', border: '1px solid rgba(108,170,245,.5)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }
                  : { color: 'var(--t20, #9da9be)', background: 'var(--t58, rgba(218,229,247,.05))', border: '1px solid var(--t63, rgba(218,229,247,.1))' }
                ),
              }}
            >
              ↑ <span style={{ fontWeight: 600 }}>{thread.post.votes}</span>
            </button>
          </div>

          {/* Node-spine replies */}
          {sortedReplies.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
              {/* Spine */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 34, flexShrink: 0, paddingTop: 3 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                  background: 'radial-gradient(circle at 33% 27%, #d4e0f4, #7a9bc4 60%, #2e4a72)',
                  boxShadow: '0 0 12px rgba(108,170,245,.5)',
                }} />
                {i < sortedReplies.length - 1 && (
                  <div style={{
                    flex: 1, width: 1, minHeight: 36,
                    background: 'linear-gradient(180deg, rgba(108,170,245,.4), rgba(108,170,245,.08))',
                  }} />
                )}
              </div>

              {/* Reply card */}
              <div style={{ flex: 1, paddingLeft: 16, paddingBottom: 20 }}>
                <ReplyCard reply={r} handlers={replyHandlers} variant="aurora" />
              </div>
            </div>
          ))}

          {/* Composer */}
          <div style={{ paddingBottom: 32, paddingTop: 4 }}>
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
          onSubmit={() => { submitCompose(); }}
        />
      </div>
    </div>
  );
}
