import { useState } from 'react';
import { useSession } from './use-session';
import { useForum } from './use-forum-state';

/**
 * Shared behavior behind every Share button (post-card, thread-view,
 * comment) — kept as one hook rather than duplicated per component since
 * the platform branch (web: small link+member menu, native: straight to
 * the member picker) is identical logic wherever Share appears; only the
 * surrounding visual chip/button markup differs per call site.
 */
export function useShare(threadId: string) {
  const { platform } = useSession();
  const { copyShareLink, openShareModal } = useForum();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleShareClick() {
    if (platform === 'native') {
      openShareModal(threadId);
    } else {
      setMenuOpen(o => !o);
    }
  }

  function handleCopyLink() {
    copyShareLink(threadId);
    setMenuOpen(false);
  }

  function handleShareWithMember() {
    openShareModal(threadId);
    setMenuOpen(false);
  }

  return {
    platform,
    menuOpen,
    closeMenu: () => setMenuOpen(false),
    handleShareClick,
    handleCopyLink,
    handleShareWithMember,
  };
}
