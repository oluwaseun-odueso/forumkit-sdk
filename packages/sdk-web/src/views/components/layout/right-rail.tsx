import type { Community, RailItem } from '../../hooks/use-forum-state';
import Avatar from '../shared/avatar';
import Thumbnail from '../shared/thumbnail';
import { UpvoteIcon, CommentIcon } from '../shared/icons';
import './right-rail.css';

type RightRailProps = {
  communities: Community[];
  latestItems: RailItem[];
  similarItems: RailItem[];
  trendingItems: RailItem[];
  onOpenPost: (id: string) => void;
};

function findCommunity(communities: Community[], id: string): Community | undefined {
  return communities.find(c => c.id === id);
}

function RailRow({ item, community, onOpen }: { item: RailItem; community: Community | undefined; onOpen: () => void }) {
  return (
    <div className="fk-rail-row" onClick={onOpen}>
      <div className="fk-rail-row-body">
        <div className="fk-rail-row-head">
          {community && <Avatar size={18} gradient={community.gradient} letter={community.letter} />}
          <span className="fk-rail-row-community">{community?.name}</span>
          <span className="fk-rail-row-time">· {item.time}</span>
        </div>
        <div className="fk-rail-row-title fk-clamp-2">{item.title}</div>
        <div className="fk-rail-row-stats">
          <span><UpvoteIcon size={13} />{item.votes}</span>
          <span><CommentIcon size={13} />{item.commentCount}</span>
        </div>
      </div>
      <Thumbnail gradient={item.thumbGradient} width={56} height={56} radius={11} />
    </div>
  );
}

/** Home feed's right rail: a combined Latest+Similar card, and a Featured/Trending card. Hidden on the thread view. */
export default function RightRail({ communities, latestItems, similarItems, trendingItems, onOpenPost }: RightRailProps) {
  return (
    <aside className="fk-right-rail">
      <div className="fk-rail-card">
        <div className="fk-rail-card-title">Latest Posts</div>
        {latestItems.map(item => (
          <RailRow key={item.id} item={item} community={findCommunity(communities, item.communityId)} onOpen={() => onOpenPost(item.id)} />
        ))}
        <div className="fk-rail-card-title fk-rail-card-title--divided">Similar Posts</div>
        {similarItems.map(item => (
          <RailRow key={item.id} item={item} community={findCommunity(communities, item.communityId)} onOpen={() => onOpenPost(item.id)} />
        ))}
      </div>

      <div className="fk-rail-card">
        <div className="fk-rail-card-title">Featured Posts</div>
        {trendingItems.map(item => (
          <div key={item.id} className="fk-rail-trending-row" onClick={() => onOpenPost(item.id)}>
            <div className="fk-rail-row-body">
              <div className="fk-rail-trending-head">
                <span className="fk-rail-trending-tag">TRENDING</span>
                <span className="fk-rail-row-time">{item.time}</span>
              </div>
              <div className="fk-rail-row-title fk-clamp-2">{item.title}</div>
              <div className="fk-rail-row-stats">
                <span><UpvoteIcon size={14} />{item.votes}</span>
                <span><CommentIcon size={14} />{item.commentCount}</span>
              </div>
            </div>
            <Thumbnail gradient={item.thumbGradient} width={64} height={64} radius={12} />
          </div>
        ))}
      </div>

      <div className="fk-rail-footer">
        <span>Home</span><span>Popular</span><span>News</span><span>Explore</span><span>Best of Forum Kit</span>
        <div className="fk-rail-footer-copy">Forum Kit, Inc. © 2026. All rights reserved.</div>
      </div>
    </aside>
  );
}
