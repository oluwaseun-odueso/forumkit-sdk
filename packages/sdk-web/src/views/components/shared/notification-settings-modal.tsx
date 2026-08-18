import type { NotificationPrefs, UserRole } from '@forumkit/types';
import { NOTIFICATION_PREF_ROWS } from '@forumkit/shared';
import Modal from './modal';
import { CloseIcon } from './icons';
// Reuses the drafts modal's header/close shell and the edit-profile
// modal's preference-row/switch styling (same rows this used to render
// inline in EditProfileModal's own Preferences section) rather than a
// parallel stylesheet — only the sizing/spacing overrides below (scoped to
// .fk-notification-settings-body, not the shared classes themselves) are
// new.
import '../composer/drafts-list-modal.css';
import '../profile/edit-profile-modal.css';
import './notification-settings-modal.css';

// NOTIFICATION_PREF_ROWS now lives in @forumkit/shared (imported above).

type NotificationSettingsModalProps = {
  notificationPrefs: NotificationPrefs;
  role: UserRole;
  onToggleNotificationPref: (type: keyof NotificationPrefs, enabled: boolean) => void;
  onClose: () => void;
};

/**
 * Standalone notification-preferences modal, reached from the gear icon on
 * the Notifications page. Previously these same four toggles lived inside
 * EditProfileModal's Preferences section (alongside Display Mode); pulled
 * out into their own modal so the settings gear on Notifications doesn't
 * have to open the much larger profile-editing modal just to reach them.
 * Each toggle fires immediately on click (same "no Save button" pattern
 * the Display Mode toggle still uses in EditProfileModal) rather than
 * being gated behind a save action.
 *
 * The "Moderation reports" row only ever matters to admins/moderators (a
 * plain member's notification feed can structurally never contain a report
 * notification — see the backend's read-time role filter) so it's hidden
 * for members entirely rather than shown-but-irrelevant.
 */
export default function NotificationSettingsModal({
  notificationPrefs, role, onToggleNotificationPref, onClose,
}: NotificationSettingsModalProps) {
  const canModerate = role === 'admin' || role === 'moderator';
  const rows = NOTIFICATION_PREF_ROWS.filter(row => !row.modOnly || canModerate);

  return (
    <Modal onClose={onClose} maxWidth={560} blurBackground>
      <div className="fk-drafts-modal-header">
        <h3 className="fk-drafts-modal-title">Notification settings</h3>
        <button type="button" className="fk-drafts-modal-close" onClick={onClose}>
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="fk-drafts-modal-body fk-notification-settings-body">
        {rows.map(row => {
          const enabled = notificationPrefs[row.key];
          return (
            <div className="fk-edit-modal-preference-row" key={row.key}>
              <div>
                <div className="fk-edit-modal-preference-label">{row.label}</div>
                <div className="fk-edit-modal-preference-sub">{row.sub}</div>
              </div>
              <button
                type="button"
                className={`fk-edit-modal-switch${enabled ? ' fk-edit-modal-switch--on' : ''}`}
                role="switch"
                aria-checked={enabled}
                aria-label={row.label}
                onClick={() => onToggleNotificationPref(row.key, !enabled)}
              >
                <span className="fk-edit-modal-switch-knob" />
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
