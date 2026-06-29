import { Mascot } from './Mascot';
import { TagPill } from './TagPill';
import type { PostData } from '../data/seed';

type Props = {
  post: PostData;
  totalReplies: number;
  onUpvote: () => void;
};

export function PostNode({ post, totalReplies, onUpvote }: Props) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
        <div style={{ animation: 'fkfloat 5s ease-in-out infinite' }}>
          <Mascot size={80} />
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {post.tags.map(t => <TagPill key={t} tag={t} />)}
      </div>

      <h1 style={{
        fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 600,
        color: 'var(--t30, #e9eff8)', lineHeight: 1.35,
        textAlign: 'center', margin: '0 0 8px',
      }}>
        {post.title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12.5, color: 'var(--t20, #9da9be)' }}>{post.author}</span>
        <span style={{ color: 'var(--t12, #5b6376)', fontSize: 10 }}>·</span>
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t14, #6b7488)' }}>{post.time}</span>
        <span style={{ color: 'var(--t12, #5b6376)', fontSize: 10 }}>·</span>
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12, color: 'var(--t14, #6b7488)' }}>
          {totalReplies} repl{totalReplies !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      <p style={{
        fontFamily: 'Sora,sans-serif', fontSize: 16, lineHeight: 1.65,
        color: 'var(--t25, #b8c4d9)', margin: '0 0 40px', textAlign: 'center',
      }}>
        {post.body}
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 44 }}>
        <button
          type="button"
          aria-pressed={post.voted}
          aria-label={`Upvote post (${post.votes} votes)`}
          onClick={onUpvote}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 18px', borderRadius: 24, cursor: 'pointer',
            fontFamily: 'Sora,sans-serif', fontSize: 13,
            ...(post.voted
              ? { color: '#16203a', background: 'linear-gradient(155deg,#e3ebf8,#adbbd7)', border: '1px solid rgba(108,170,245,.5)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6)' }
              : { color: 'var(--t20, #9da9be)', background: 'var(--t58, rgba(218,229,247,.05))', border: '1px solid var(--t63, rgba(218,229,247,.1))' }
            ),
          }}
        >
          ↑ <span style={{ fontWeight: 600 }}>{post.votes}</span>
        </button>
      </div>
    </>
  );
}
