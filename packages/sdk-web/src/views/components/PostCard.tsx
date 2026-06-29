import { Avatar } from './Avatar';
import { TagPill } from './TagPill';
import { UpvotePill } from './UpvotePill';
import type { PostData } from '../data/seed';

type Props = {
  post: PostData;
  replyCountLabel: string;
  onUpvote: () => void;
};

export function PostCard({ post, replyCountLabel, onUpvote }: Props) {
  return (
    <div style={{
      padding: '28px 30px', borderRadius: 20,
      background: 'linear-gradient(165deg, var(--t62, rgba(218,229,247,.09)), var(--t56, rgba(218,229,247,.03)))',
      border: '1px solid var(--t67, rgba(218,229,247,.15))',
      boxShadow: '0 24px 56px -28px var(--t39, rgba(0,0,0,.7)), inset 0 1px 0 rgba(255,255,255,.1)',
    }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {post.tags.map(t => <TagPill key={t} tag={t} />)}
      </div>

      <div style={{
        fontFamily: 'Sora,sans-serif', fontSize: 23, lineHeight: 1.28,
        fontWeight: 500, color: 'var(--t32, #eef3fb)',
      }}>
        {post.title}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 13 }}>
        <Avatar size={24} />
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 13, color: 'var(--t30, #e9eff8)', fontWeight: 500 }}>
          {post.author}
        </span>
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 11, color: 'var(--t14, #6b7488)' }}>
          {post.time}
        </span>
      </div>

      <div style={{
        fontFamily: 'Sora,sans-serif', fontSize: 16, lineHeight: 1.6,
        color: 'var(--t29, #d3dcee)', marginTop: 14,
      }}>
        {post.body}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 18 }}>
        <UpvotePill votes={post.votes} voted={post.voted} onUpvote={onUpvote} />
        <span style={{ fontFamily: 'Sora,sans-serif', fontSize: 12.5, color: 'var(--t15, #757f95)' }}>
          {replyCountLabel}
        </span>
      </div>
    </div>
  );
}
