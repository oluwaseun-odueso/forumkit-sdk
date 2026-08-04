import DropdownMenu, { DropdownMenuDivider, DropdownMenuItem } from '../shared/dropdown-menu';
import Avatar from '../shared/avatar';
import { authorAvatar } from '../../lib/author-avatar';
import { ShirtIcon, DraftIcon, SunIcon, MoonIcon, LogoutIcon, GearIcon } from '../shared/icons';
import { useForum } from '../../hooks/use-forum-state';
import './account-menu.css';

type AccountMenuProps = {
  open: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onOpenDrafts?: (() => void) | undefined;
  showViewProfile?: boolean;
};

export default function AccountMenu({ open, onClose, onViewProfile, onOpenDrafts, showViewProfile = true }: AccountMenuProps) {
  const { state, openSettings, toggleTheme, logOut, canLogOut } = useForum();
  const { profile } = state;
  const username = profile.displayName || 'You';
  const avatar = authorAvatar(profile.id ?? username, username);
  const isDark = profile.themePreference !== 'light';

  const menuItems = [
    { label: 'Edit Avatar', icon: <ShirtIcon />, onClick: () => { openSettings(); onClose(); } },
    { label: 'Drafts', icon: <DraftIcon />, onClick: () => { onOpenDrafts?.(); onClose(); } },
    {
      label: 'Display Mode',
      icon: isDark ? <MoonIcon /> : <SunIcon />,
      sub: isDark ? 'Dark' : 'Light',
      onClick: () => void toggleTheme(),
    },
    // Only shown when the host app opted in via ForumKitConfig.onLogout —
    // ForumKit can't log anyone out itself, so a button with nothing behind
    // it would just look broken for hosts that never wired this up.
    ...(canLogOut ? [{ label: 'Log Out', icon: <LogoutIcon />, onClick: () => { logOut(); onClose(); } }] : []),
    { label: 'Settings', icon: <GearIcon />, dividerBefore: true, onClick: () => { openSettings(); onClose(); } },
  ];

  return (
    <DropdownMenu open={open} onClose={onClose} style={{ top: 52, right: 12, width: 300, padding: 8 }}>
      {showViewProfile && (
        <button type="button" className="fk-account-header" onClick={onViewProfile}>
          <Avatar size={40} gradient={avatar.gradient} letter={avatar.letter} imageUrl={profile.avatarUrl} online />
          <span className="fk-account-header-labels">
            <span className="fk-account-header-name">View Profile</span>
            <span className="fk-account-header-handle">/{username}</span>
          </span>
        </button>
      )}
      {showViewProfile && <DropdownMenuDivider />}
      {menuItems.map(item => (
        <div key={item.label}>
          {item.dividerBefore && <DropdownMenuDivider />}
          <DropdownMenuItem icon={item.icon} label={item.label} sub={'sub' in item ? item.sub : undefined} onClick={item.onClick} />
        </div>
      ))}
    </DropdownMenu>
  );
}
