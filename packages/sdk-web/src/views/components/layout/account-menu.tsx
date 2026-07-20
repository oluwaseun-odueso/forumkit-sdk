import DropdownMenu, { DropdownMenuDivider, DropdownMenuItem } from '../shared/dropdown-menu';
import Avatar from '../shared/avatar';
import { ShirtIcon, DraftIcon, ToggleIcon, LogoutIcon, GearIcon } from '../shared/icons';
import './account-menu.css';

const USER_GRADIENT = 'radial-gradient(120% 95% at 30% 25%, #f0c9a8, #b97d52 70%, #7a4f34)';

const MENU_ITEMS = [
  { label: 'Edit Avatar', icon: <ShirtIcon /> },
  { label: 'Drafts', icon: <DraftIcon /> },
  { label: 'Display Mode', icon: <ToggleIcon /> },
  { label: 'Log Out', icon: <LogoutIcon /> },
  { label: 'Settings', icon: <GearIcon />, dividerBefore: true },
];

type AccountMenuProps = {
  open: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  showViewProfile?: boolean;
};

export default function AccountMenu({ open, onClose, onViewProfile, showViewProfile = true }: AccountMenuProps) {
  return (
    <DropdownMenu open={open} onClose={onClose} style={{ top: 52, right: 12, width: 300, padding: 8 }}>
      {showViewProfile && (
        <button type="button" className="fk-account-header" onClick={onViewProfile}>
          <Avatar size={40} gradient={USER_GRADIENT} online />
          <span className="fk-account-header-labels">
            <span className="fk-account-header-name">View Profile</span>
            <span className="fk-account-header-handle">/Cultural-Rope137</span>
          </span>
        </button>
      )}
      {showViewProfile && <DropdownMenuDivider />}
      {MENU_ITEMS.map(item => (
        <div key={item.label}>
          {item.dividerBefore && <DropdownMenuDivider />}
          <DropdownMenuItem icon={item.icon} label={item.label} />
        </div>
      ))}
    </DropdownMenu>
  );
}
