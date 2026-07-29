import Shell from '../components/layout/shell';
import ProfileHeader from '../components/profile/profile-header';
import ProfileTabs from '../components/profile/profile-tabs';
import ProfileEmptyState from '../components/profile/profile-empty-state';
import ProfileRightRail from '../components/profile/profile-right-rail';
import IconButton from '../components/shared/icon-button';
import PillButton from '../components/shared/pill-button';
import { EyeIcon, ChevronDownIcon, PlusIcon, FilterIcon } from '../components/shared/icons';
import { useForum } from '../hooks/use-forum-state';
import './profile.css';

export function Profile() {
  const { state, setProfileTab, openComposer } = useForum();

  return (
    <Shell
      scopeTag="Cultural-Rope137"
      scrollMain={false}
      rail={
        <ProfileRightRail
          username="Cultural-Rope137"
          handle="Cultural-Rope137"
          postKarma={1204}
          commentKarma={3891}
          cakeDay="Mar '24"
        />
      }
    >
      <div className="fk-profile">
        <ProfileHeader username="Cultural-Rope137" handle="Cultural-Rope137" />
        <ProfileTabs active={state.profile.activeTab} onSelect={setProfileTab} />

        <div className="fk-profile-filter-row">
          <div className="fk-profile-filter-label">
            <EyeIcon />
            Showing all content
          </div>
          <ChevronDownIcon size={22} />
        </div>
        <div className="fk-profile-actions-row">
          <PillButton variant="outline" icon={<PlusIcon size={18} />} onClick={openComposer}>Create Post</PillButton>
          <IconButton label="Filter and sort" size={38}><FilterIcon /></IconButton>
        </div>
        <div className="fk-profile-divider" />

        <ProfileEmptyState tab={state.profile.activeTab} onUpdateSettings={() => {}} />
      </div>
    </Shell>
  );
}
