import { REACTION_TYPES, type ReactionData } from '../data/seed';
import { reactPillActive, reactPillInactive } from '../styles/tokens';

type Props = {
  replyId: number;
  reactions: ReactionData[];
  reactPicker: number | null;
  onToggleReaction: (id: number, key: string) => void;
  onTogglePicker: (id: number) => void;
};

export function ReactionChips({ replyId, reactions, reactPicker, onToggleReaction, onTogglePicker }: Props) {
  const pickerOpen = reactPicker === replyId;

  return (
    <>
      {reactions.map(rx => (
        <button
          key={rx.key}
          type="button"
          aria-label={`${rx.label} reaction (${rx.count})`}
          aria-pressed={rx.on}
          onClick={() => onToggleReaction(replyId, rx.key)}
          style={{
            ...(rx.on ? reactPillActive : reactPillInactive),
            border: rx.on
              ? '1px solid rgba(108,170,245,.5)'
              : '1px solid var(--t63, rgba(218,229,247,.1))',
          }}
        >
          <span>{rx.glyph}</span>
          <span>{rx.label}</span>
          <span style={{ opacity: .75 }}>{rx.count}</span>
        </button>
      ))}

      <div style={{ position: 'relative', display: 'flex' }}>
        <button
          type="button"
          aria-label="Add a reaction"
          aria-expanded={pickerOpen}
          onClick={() => onTogglePicker(replyId)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 28, borderRadius: 16, cursor: 'pointer',
            fontFamily: 'Sora,sans-serif', fontSize: 15,
            color: 'var(--t18, #919cb3)',
            background: 'var(--t57, rgba(218,229,247,.04))',
            border: '1px solid var(--t63, rgba(218,229,247,.1))',
          }}
        >
          ＋
        </button>

        {pickerOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 20,
              display: 'flex', gap: 3, padding: 6,
              borderRadius: 14,
              background: 'var(--t44, rgba(14,20,34,.98))',
              border: '1px solid rgba(108,170,245,.28)',
              boxShadow: '0 18px 44px -16px var(--t40, rgba(0,0,0,.85))',
            }}
          >
            {REACTION_TYPES.map(rt => (
              <button
                key={rt.key}
                type="button"
                role="menuitem"
                aria-label={rt.label}
                onClick={() => onToggleReaction(replyId, rt.key)}
                style={{
                  width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, borderRadius: 10, cursor: 'pointer',
                  background: 'var(--t58, rgba(218,229,247,.05))',
                  border: 'none',
                }}
              >
                {rt.glyph}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
