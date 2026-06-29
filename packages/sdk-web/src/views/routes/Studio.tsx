import { AuroraLayer } from '../components/AuroraLayer';
import { GrainLayer } from '../components/GrainLayer';
import { Mascot } from '../components/Mascot';
import { PostCard } from '../components/PostCard';
import { ReplyCard } from '../components/ReplyCard';
import { Composer } from '../components/Composer';
import { SortBar } from '../components/SortBar';
import { Sidebar } from '../components/Sidebar';
import { NavOverlay } from '../components/NavOverlay';
import { ComposeSheet } from '../components/ComposeSheet';
import { chromeButton } from '../styles/tokens';
import { useForum } from '../hooks/useForumState';
import { useTheme } from '../hooks/useTheme';

export function Studio() {
  const {
    state, sortedReplies, totalReplies, tagNames, tagCounts,
    upvotePost, upvoteReply, toggleReaction, togglePicker,
    openReply, setReplyText, cancelReply, submitReply,
    setInput, postReply, acceptReply,
    setSidebar, openSearch, openTag, closeNav, setNavQuery,
    openCompose, closeCompose, setComposeField, addFiles, removeFile, submitCompose,
    setSort,
  } = useForum();
  const { theme, toggleTheme } = useTheme();

  const { thread, input, reply, reactPicker, sort, sidebar, nav, compose } = state;

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
    }}>
      <AuroraLayer variant="studio" />
      <GrainLayer />

      {/* Scrollable content */}
      <div style={{
        position: 'relative', zIndex: 1, height: '100%',
        display: 'flex', flexDirection: 'column',
        maxWidth: 800, margin: '0 auto',
      }}>
        {/* Header */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px 14px',
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
              border: '1px solid var(--t65, rgba(218,229,247,.13))',
            }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: 14, height: 1.5, borderRadius: 2, background: 'var(--t23, #acb7cc)' }} />
            ))}
          </button>

          <Mascot size={28} />

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t14, #6b7488)' }}>Writing</span>
            <span style={{ color: 'var(--t12, #5b6376)', fontSize: 12 }}>/</span>
            <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t20, #9da9be)' }}>thread</span>
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
              ...chromeButton,
              display: 'inline-flex', alignItems: 'center', gap: 7,
              height: 34, padding: '0 16px', borderRadius: 11,
              cursor: 'pointer', border: 'none',
              fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 500,
            }}
          >
            + New post
          </button>
        </header>

        {/* Thread scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 0' }}>
          <PostCard
            post={thread.post}
            onUpvote={upvotePost}
            replyCount={totalReplies}
          />

          <div style={{ margin: '22px 0 14px' }}>
            <SortBar
              sort={sort}
              repliesHeader={`${totalReplies} REPL${totalReplies !== 1 ? 'IES' : 'Y'}`}
              onSetSort={setSort}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 8 }}>
            {sortedReplies.map(r => (
              <ReplyCard key={r.id} reply={r} handlers={replyHandlers} variant="studio" />
            ))}
          </div>
        </div>

        {/* Composer */}
        <div style={{ padding: '14px 24px 24px', flexShrink: 0 }}>
          <Composer
            value={input}
            placeholder="Write an answer…"
            onChange={setInput}
            onPost={postReply}
            variant="studio"
          />
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
