import type { RailItem } from '../../hooks/use-forum-state';
import { authorAvatar } from '../../lib/author-avatar';
import Avatar from '../shared/avatar';
import Thumbnail from '../shared/thumbnail';
import { UpvoteIcon, CommentIcon } from '../shared/icons';
import './right-rail.css';

type RailSections = {
  latest?: RailItem[];
  similar?: RailItem[];
  featured?: RailItem[];
};

type RightRailProps = {
  sections: RailSections;
  onOpenPost: (id: string) => void;
};

function RailRow({ item, onOpen }: { item: RailItem; onOpen: () => void }) {
  const avatar = authorAvatar(item.authorId, item.author);
  return (
    <div className="fk-rail-row" onClick={onOpen}>
      <div className="fk-rail-row-body">
        <div className="fk-rail-row-head">
          <Avatar size={18} gradient={avatar.gradient} letter={avatar.letter} imageUrl={item.authorAvatarUrl} />
          <span className="fk-rail-row-author">{item.author}</span>
          <span className="fk-rail-row-time">· {item.time}</span>
        </div>
        <div className="fk-rail-row-title fk-clamp-2">{item.title}</div>
        <div className="fk-rail-row-stats">
          <span><UpvoteIcon size={13} />{item.votes}</span>
          <span><CommentIcon size={13} />{item.commentCount}</span>
        </div>
      </div>
      {item.imageUrl && <Thumbnail gradient={item.thumbGradient} imageUrl={item.imageUrl} width={56} height={56} radius={11} />}
    </div>
  );
}

/**
 * Right rail sections, shown per-screen: Feed passes {latest, featured},
 * Thread passes {similar, featured} — only sections actually present render,
 * so the two screens share this one component instead of near-duplicating it.
 */
export default function RightRail({ sections, onOpenPost }: RightRailProps) {
  const hasLatestOrSimilar = (sections.latest?.length ?? 0) > 0 || (sections.similar?.length ?? 0) > 0;

  return (
    <aside className="fk-right-rail">
      {hasLatestOrSimilar && (
        <div className="fk-rail-card">
          {sections.latest && sections.latest.length > 0 && (
            <>
              <div className="fk-rail-card-title">Latest Posts</div>
              {sections.latest.map(item => (
                <RailRow key={item.id} item={item} onOpen={() => onOpenPost(item.id)} />
              ))}
            </>
          )}
          {sections.similar && sections.similar.length > 0 && (
            <>
              <div className={`fk-rail-card-title${sections.latest && sections.latest.length > 0 ? ' fk-rail-card-title--divided' : ''}`}>Similar Posts</div>
              {sections.similar.map(item => (
                <RailRow key={item.id} item={item} onOpen={() => onOpenPost(item.id)} />
              ))}
            </>
          )}
        </div>
      )}

      {sections.featured && sections.featured.length > 0 && (
        <div className="fk-rail-card">
          <div className="fk-rail-card-title">Featured Posts</div>
          {sections.featured.map(item => (
            <div key={item.id} className="fk-rail-trending-row" onClick={() => onOpenPost(item.id)}>
              <div className="fk-rail-row-body">
                <div className="fk-rail-trending-head">
                  <span className="fk-rail-row-time">{item.time}</span>
                </div>
                <div className="fk-rail-row-title fk-clamp-2">{item.title}</div>
                <div className="fk-rail-row-stats">
                  <span><UpvoteIcon size={14} />{item.votes}</span>
                  <span><CommentIcon size={14} />{item.commentCount}</span>
                </div>
              </div>
              {item.imageUrl && <Thumbnail gradient={item.thumbGradient} imageUrl={item.imageUrl} width={64} height={64} radius={12} />}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
