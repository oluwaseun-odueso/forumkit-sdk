import { AuroraLayer } from '../components/AuroraLayer';
import { GrainLayer } from '../components/GrainLayer';
import { Mascot } from '../components/Mascot';
import { PostCard } from '../components/PostCard';
import { ReplyCard } from '../components/ReplyCard';
import { Composer } from '../components/Composer';
import { Sidebar } from '../components/Sidebar';
import { NavOverlay } from '../components/NavOverlay';
import { ComposeSheet } from '../components/ComposeSheet';
import { chromeButton } from '../styles/tokens';
import { useForum } from '../hooks/useForumState';
import { useTheme } from '../hooks/useTheme';

function LoadingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            display: 'block', width: 7, height: 7, borderRadius: '50%',
            background: 'var(--t25, #b8c4d9)',
            animation: `fkdotpop 1.2s ${i * 0.2}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function Assistant() {
  const {
    state, sortedReplies, totalReplies, tagNames, tagCounts,
    upvotePost, upvoteReply, toggleReaction, togglePicker,
    openReply, setReplyText, cancelReply, submitReply,
    setInput, postReply, acceptReply,
    setSidebar, openSearch, openTag, closeNav, setNavQuery,
    openCompose, closeCompose, setComposeField, addFiles, removeFile, submitCompose,
    summarize, suggest,
  } = useForum();
  const { theme, toggleTheme } = useTheme();

  const { thread, input, reply, reactPicker, sidebar, nav, compose, asst } = state;

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
      background: 'radial-gradient(120% 90% at 70% -12%, #16203a 0%, #0a0e18 48%, #07090f 100%)',
      display: 'flex',
    }}>
      <AuroraLayer variant="assistant" />
      <GrainLayer />

      {/* Main thread pane */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
      }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px 14px', flexShrink: 0 }}>
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

          <Mascot size={28} />

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t14, #6b7488)' }}>FORUM KIT</span>
            <span style={{ color: 'var(--t12, #5b6376)', fontSize: 12 }}>/</span>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t20, #9da9be)' }}>Writing</span>
          </div>

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

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 0' }}>
          <PostCard post={thread.post} onUpvote={upvotePost} replyCount={totalReplies} />

          <div style={{ margin: '22px 0 14px', fontFamily: 'Sora,sans-serif', fontSize: 12, letterSpacing: '1.4px', color: 'var(--t15, #757f95)' }}>
            {totalReplies} REPL{totalReplies !== 1 ? 'IES' : 'Y'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
            {sortedReplies.map(r => (
              <ReplyCard key={r.id} reply={r} handlers={replyHandlers} variant="studio" />
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 24px 24px', flexShrink: 0 }}>
          <Composer
            value={input}
            placeholder="Write a reply…"
            onChange={setInput}
            onPost={postReply}
            variant="studio"
          />
        </div>
      </div>

      {/* AI Rail */}
      <div style={{
        position: 'relative', zIndex: 2, width: 330, flexShrink: 0,
        borderLeft: '1px solid rgba(108,170,245,.1)',
        background: 'linear-gradient(180deg, var(--t46, rgba(18,24,40,.96)), var(--t75, rgba(9,13,23,.96)))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        padding: '32px 20px 24px',
        overflowY: 'auto',
      }}>
        {/* Lina avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ animation: 'fkfloat 6.5s ease-in-out infinite', marginBottom: 14 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 28%, rgba(200,225,255,.9) 0%, rgba(108,170,245,.7) 30%, rgba(56,100,180,.85) 60%, rgba(20,30,60,.95) 100%)',
              boxShadow: '0 0 50px rgba(108,170,245,.5), 0 0 100px rgba(56,100,180,.3), inset 0 1px 3px rgba(255,255,255,.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mascot size={44} />
            </div>
          </div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 16, fontWeight: 600, color: 'var(--t30, #e9eff8)' }}>Lina</div>
          <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, letterSpacing: '1.8px', color: 'var(--t14, #6b7488)', marginTop: 3 }}>FORUM ASSISTANT</div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(108,170,245,.1)', margin: '4px 0 20px' }} />

        {/* AI Tools */}
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, letterSpacing: '1.6px', color: 'var(--t12, #5b6376)', marginBottom: 12 }}>
          AI TOOLS
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            aria-label="Summarize thread"
            disabled={asst.summarizing}
            onClick={summarize}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 13, cursor: asst.summarizing ? 'wait' : 'pointer',
              background: 'linear-gradient(165deg, var(--t59, rgba(218,229,247,.07)), var(--t55, rgba(218,229,247,.02)))',
              border: '1px solid rgba(108,170,245,.22)',
              boxShadow: '0 8px 20px -12px var(--t38, rgba(0,0,0,.65))',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>✦</span>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13.5, color: 'var(--t28, #c9d7ee)', fontWeight: 500, textAlign: 'left' }}>
              Summarise thread
            </span>
          </button>

          <button
            type="button"
            aria-label="Suggest a reply"
            onClick={suggest}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 13, cursor: 'pointer',
              background: 'linear-gradient(165deg, var(--t59, rgba(218,229,247,.07)), var(--t55, rgba(218,229,247,.02)))',
              border: '1px solid rgba(108,170,245,.22)',
              boxShadow: '0 8px 20px -12px var(--t38, rgba(0,0,0,.65))',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>↩</span>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13.5, color: 'var(--t28, #c9d7ee)', fontWeight: 500, textAlign: 'left' }}>
              Suggest a reply
            </span>
          </button>

          <button
            type="button"
            disabled
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 13, cursor: 'not-allowed', opacity: 0.4,
              background: 'var(--t57, rgba(218,229,247,.04))',
              border: '1px solid var(--t63, rgba(218,229,247,.1))',
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>⊙</span>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13.5, color: 'var(--t20, #9da9be)', textAlign: 'left' }}>
              Surface related
            </span>
          </button>
        </div>

        {/* Loading state */}
        {asst.summarizing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 16 }}>
            <LoadingDots />
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t14, #6b7488)' }}>Analysing thread…</span>
          </div>
        )}

        {/* Summary card */}
        {asst.summary && (
          <div style={{
            padding: '16px 16px', borderRadius: 14,
            background: 'linear-gradient(165deg, rgba(108,170,245,.09), rgba(56,100,180,.04))',
            border: '1px solid rgba(108,170,245,.22)',
            boxShadow: '0 12px 30px -18px var(--t38, rgba(0,0,0,.65))',
            marginBottom: 8,
          }}>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, letterSpacing: '1.6px', color: 'rgba(108,170,245,.7)', marginBottom: 12 }}>
              SUMMARY
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {asst.summary.map((point, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: 'rgba(108,170,245,.6)', fontSize: 10, marginTop: 3, flexShrink: 0 }}>●</span>
                  <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, color: 'var(--t25, #b8c4d9)', lineHeight: 1.55 }}>
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
