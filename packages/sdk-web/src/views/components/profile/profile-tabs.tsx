import './profile-tabs.css';

const TABS = ['Overview', 'Posts', 'Comments', 'Saved', 'Upvoted', 'Downvoted'];

type ProfileTabsProps = {
  active: string;
  onSelect: (tab: string) => void;
};

export default function ProfileTabs({ active, onSelect }: ProfileTabsProps) {
  return (
    <div className="fk-profile-tabs">
      {TABS.map(tab => (
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
