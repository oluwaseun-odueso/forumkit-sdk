import './profile-tabs.css';

const TABS = ['Overview', 'Posts', 'Comments', 'Saved', 'Upvoted', 'Downvoted'];

type ProfileTabsProps = {
  active: string;
  onSelect: (tab: string) => void;
  // Saved is a private bookmark list — hidden when viewing someone else's
  // profile (the backend rejects scope=saved for that case too, see
  // publicActivityQuerySchema in routes/users.ts, so this isn't just
  // cosmetic hiding of a tab that would silently fail).
  showSaved?: boolean;
};

export default function ProfileTabs({ active, onSelect, showSaved = true }: ProfileTabsProps) {
  const tabs = showSaved ? TABS : TABS.filter(t => t !== 'Saved');
  return (
    <div className="fk-profile-tabs">
      {tabs.map(tab => (
        <button
          key={tab}
          type="button"
          className={`fk-profile-tab${active === tab ? ' fk-profile-tab--active' : ''}`}
          onClick={() => onSelect(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
