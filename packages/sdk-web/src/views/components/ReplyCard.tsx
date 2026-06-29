import { Avatar } from './Avatar';
import { UpvotePill } from './UpvotePill';
import { ReactionChips } from './ReactionChips';
import type { ReplyData } from '../data/seed';

type Handlers = {
  onUpvoteReply: (id: number) => void;
  onToggleReaction: (id: number, key: string) => void;
  onTogglePicker: (id: number) => void;
  onOpenReply: (id: number) => void;
  onSetReplyText: (text: string) => void;
  onCancelReply: () => void;
  onSubmitReply: () => void;
  onAcceptReply: (id: number) => void;
  replyInProgress: { id: number; text: string } | null;
  reactPicker: number | null;
};

type Props = {
  reply: ReplyData;
  handlers: Handlers;
  variant: 'studio' | 'aurora';
  isChild?: boolean;
};

const CARD_STYLE = {
  studio: {
    padding: '22px 24px', borderRadius: 18,
    background: 'radial-gradient(130% 100% at 18% 0%, rgba(255,255,255,.09), rgba(255,255,255,0) 52%), linear-gradient(160deg, rgba(108,170,245,.13), var(--t69, rgba(32,44,68,.1)))',
    border: '1px solid rgba(108,170,245,.2)',
    boxShadow: '0 20px 48px -26px var(--t38, rgba(0,0,0,.65)), inset 0 1px 0 rgba(255,255,255,.14)',
  },
  aurora: {
    padding: '20px 22px', borderRadius: 18,
    background: 'linear-gradient(165deg, var(--t61, rgba(218,229,247,.08)), var(--t55, rgba(218,229,247,.02)))',
    border: '1px solid var(--t65, rgba(218,229,247,.13))',
    boxShadow: '0 18px 44px -24px var(--t37, rgba(0,0,0,.6))',
  },
};

const CHILD_CARD_STYLE = {
  padding: '15px 18px', borderRadius: 14,
  background: 'var(--t57, rgba(218,229,247,.04))',
  border: '1px solid var(--t62, rgba(218,229,247,.09))',
};

export function ReplyCard({ reply, handlers, variant, isChild = false }: Props) {
  const { replyInProgress, reactPicker } = handlers;
  const isReplying = replyInProgress?.id === reply.id;

  const cardStyle = isChild ? CHILD_CARD_STYLE : CARD_STYLE[variant];
  const avatarSize = isChild ? 22 : 26;
  const authorSize = isChild ? 12.5 : 13.5;
  const bodySize = isChild ? 15 : 16.5;

  return (
    <div style={cardStyle}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar size={avatarSize} />
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: authorSize, color: 'var(--t30, #e9eff8)', fontWeight: 500 }}>
          {reply.author}
        </span>
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, color: 'var(--t14, #6b7488)' }}>
          {reply.time}
        </span>
        {!isChild && (
          reply.accepted ? (
            <button
              type="button"
              aria-label="Unmark as answer"
              onClick={() => handlers.onAcceptReply(reply.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                fontFamily: 'Sora,sans-serif', fontSize: 10.5, letterSpacing: '.6px', color: '#16203a',
                padding: '3px 10px', borderRadius: 20, marginLeft: 2,
                background: 'linear-gradient(155deg,#e3ebf8,#adbbd7)',
                border: '1px solid rgba(108,170,245,.5)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)',
              }}
            >
              ✓ ANSWER
            </button>
          ) : (
            <button
              type="button"
              aria-label="Mark as the accepted answer"
              onClick={() => handlers.onAcceptReply(reply.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                fontFamily: 'Sora,sans-serif', fontSize: 10.5, letterSpacing: '.6px',
                color: 'var(--t16, #7e8aa2)', padding: '3px 10px', borderRadius: 20, marginLeft: 2,
                background: 'transparent', border: '1px dashed rgba(108,170,245,.32)',
              }}
            >
              ✓ Mark answer
            </button>
          )
        )}
      </div>

      {/* Body */}
      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: bodySize, lineHeight: 1.6, color: 'var(--t29, #d3dcee)', marginTop: 12 }}>
        {reply.body}
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: isChild ? 10 : 14, flexWrap: 'wrap' }}>
        <UpvotePill votes={reply.votes} voted={reply.voted} onUpvote={() => handlers.onUpvoteReply(reply.id)} />

        {!isChild && (
          <ReactionChips
            replyId={reply.id}
            reactions={reply.reactions}
            reactPicker={reactPicker}
            onToggleReaction={handlers.onToggleReaction}
            onTogglePicker={handlers.onTogglePicker}
          />
        )}

        {!isChild && (
          <button
            type="button"
            aria-label={`Reply to ${reply.author}`}
            onClick={() => handlers.onOpenReply(reply.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 18, cursor: 'pointer',
              fontFamily: 'Sora,sans-serif', fontSize: 12.5,
              color: 'var(--t18, #919cb3)',
              background: 'var(--t57, rgba(218,229,247,.04))',
              border: '1px solid var(--t63, rgba(218,229,247,.1))',
            }}
          >
            ↩ Reply
          </button>
        )}

        {/* Inline reply composer */}
        {isReplying && (
          <div style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            marginTop: 8, padding: '7px 7px 7px 16px', borderRadius: 14,
            background: 'var(--t49, rgba(214,226,245,.06))',
            border: '1px solid rgba(108,170,245,.24)',
          }}>
            <input
              autoFocus
              type="text"
              value={replyInProgress?.text ?? ''}
              onChange={e => handlers.onSetReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handlers.onSubmitReply(); if (e.key === 'Escape') handlers.onCancelReply(); }}
              placeholder={`Reply to ${reply.author}…`}
              aria-label="Write a reply"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--t30, #e9eff8)', fontFamily: 'Sora,sans-serif', fontSize: 14.5,
              }}
            />
            <button
              type="button"
              onClick={handlers.onCancelReply}
              style={{
                display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 12px',
                borderRadius: 11, cursor: 'pointer', border: 'none',
                color: 'var(--t18, #919cb3)', fontFamily: 'Sora,sans-serif', fontSize: 12.5,
                background: 'transparent',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlers.onSubmitReply}
              style={{
                display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 16px',
                borderRadius: 11, cursor: 'pointer', border: 'none',
                color: '#16203a', fontFamily: 'Sora,sans-serif', fontSize: 12.5, fontWeight: 500,
                background: 'linear-gradient(155deg,#edf3fc,#acbed9 50%,#566884)',
                boxShadow: '0 8px 18px -8px var(--t37, rgba(0,0,0,.6)), inset 0 1px 0 rgba(255,255,255,.8)',
              }}
            >
              Reply
            </button>
          </div>
        )}
      </div>

      {/* Nested children */}
      {reply.children.length > 0 && (
        <div style={{
          marginLeft: 28, paddingLeft: 22,
          borderLeft: '1px solid rgba(108,170,245,.22)',
          display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16,
        }}>
          {reply.children.map(child => (
            <ReplyCard
              key={child.id}
              reply={child}
              handlers={handlers}
              variant={variant}
              isChild
            />
          ))}
        </div>
      )}
    </div>
  );
}
