import { Mascot } from './Mascot';
import type { DirectoryEntry } from '../data/seed';

type Props = {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  onTag: (tag: string) => void;
  tagNames: string[];
  tagCounts: Record<string, number>;
  directory: DirectoryEntry[];
  activeTag: string | null;
};

const STATIC_TOPICS = [
  { name: 'Writing', count: 4 },
  { name: 'Voice', count: 5 },
  { name: 'Errors', count: 1 },
  { name: 'Onboarding', count: 2 },
  { name: 'Microcopy', count: 2 },
  { name: 'Process', count: 1 },
];

export function Sidebar({ open, onClose, onSearch, onTag, tagNames, tagCounts, activeTag }: Props) {
  if (!open) return null;

  return (
    <>
      {/* Blur scrim */}
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, zIndex: 7,
          background: 'var(--t71, rgba(7,9,15,.55))',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          border: 'none', cursor: 'pointer',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 286, zIndex: 8,
        boxShadow: '30px 0 70px -30px var(--t40, rgba(0,0,0,.85))',
        display: 'flex', flexDirection: 'column',
        padding: '22px 16px',
        background: 'linear-gradient(180deg, var(--t46, rgba(18,24,40,.97)), var(--t75, rgba(9,13,23,.97)))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(108,170,245,.14)',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mascot size={30} />
            <span style={{ fontFamily: 'Michroma,sans-serif', fontSize: 12, letterSpacing: '1.5px', color: 'var(--t30, #e9eff8)' }}>
              FORUM KIT
            </span>
          </div>
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9, cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--t23, #acb7cc)', fontSize: 14,
              background: 'var(--t59, rgba(218,229,247,.06))',
              border: '1px solid var(--t66, rgba(218,229,247,.14))',
            }}
          >
            ✕
          </button>
        </div>

        {/* Search trigger */}
        <button
          type="button"
          aria-label="Search threads"
          onClick={onSearch}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 13px', borderRadius: 11, marginBottom: 24, cursor: 'text',
            background: 'var(--t58, rgba(218,229,247,.05))',
            border: '1px solid var(--t65, rgba(218,229,247,.13))',
            textAlign: 'left',
          }}
        >
          <span style={{ color: 'var(--t14, #6b7488)', fontSize: 14, lineHeight: 1 }}>⌕</span>
          <span style={{ flex: 1, fontFamily: 'Sora,sans-serif', fontSize: 13, color: 'var(--t14, #6b7488)' }}>
            Search threads…
          </span>
          <span style={{
            fontFamily: 'Sora,sans-serif', fontSize: 10, color: 'var(--t12, #5b6376)',
            border: '1px solid var(--t66, rgba(218,229,247,.14))', borderRadius: 5, padding: '1px 6px',
          }}>
            /
          </span>
        </button>

        {/* Topics */}
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, letterSpacing: '1.6px', color: 'var(--t12, #5b6376)', margin: '0 6px 12px' }}>
          TOPICS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {STATIC_TOPICS.map(tp => (
            <div key={tp.name} style={{
              display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: 10,
            }}>
              <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13.5, color: 'var(--t30, #e9eff8)' }}>{tp.name}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'Sora,sans-serif', fontSize: 11, color: 'var(--t17, #8590a5)' }}>{tp.count}</span>
            </div>
          ))}
        </div>

        {/* Tags */}
        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10, letterSpacing: '1.6px', color: 'var(--t12, #5b6376)', margin: '26px 6px 12px' }}>
          TAGS
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '0 2px' }}>
          {tagNames.map(name => {
            const active = activeTag === name;
            return (
              <button
                key={name}
                type="button"
                aria-label={`Filter by #${name}`}
                aria-pressed={active}
                onClick={() => onTag(name)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  padding: '5px 11px', borderRadius: 18, cursor: 'pointer',
                  fontFamily: 'Sora,sans-serif', fontSize: 12,
                  ...(active
                    ? { color: '#16203a', background: 'linear-gradient(155deg,#e3ebf8,#adbbd7)', border: '1px solid rgba(108,170,245,.5)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }
                    : { color: 'var(--t23, #acb7cc)', background: 'rgba(108,170,245,.08)', border: '1px solid rgba(108,170,245,.18)' }
                  ),
                }}
              >
                <span style={{ opacity: .55 }}>#</span>{name}
                <span style={{ marginLeft: 3, opacity: .6, fontSize: 10 }}>{tagCounts[name]}</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, minHeight: 24 }} />

        {/* User chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 14,
          background: 'linear-gradient(165deg, var(--t59, rgba(218,229,247,.06)), var(--t33, rgba(0,0,0,.1)))',
          border: '1px solid rgba(108,170,245,.12)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'radial-gradient(circle at 33% 27%, #ffffff 0%, #d9e4f5 14%, #90a4c5 46%, #3a4862 78%, #a6b9d6 100%)',
            boxShadow: '0 8px 18px -6px var(--t37, rgba(0,0,0,.6)), inset 0 1px 2px rgba(255,255,255,.85)',
          }} />
          <div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, color: 'var(--t30, #e9eff8)', fontWeight: 500 }}>You</div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 10.5, color: 'var(--t17, #8590a5)', marginTop: 1 }}>contributor</div>
          </div>
        </div>
      </div>
    </>
  );
}
