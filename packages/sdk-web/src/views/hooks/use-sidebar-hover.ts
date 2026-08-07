import { useEffect, useRef, useState } from 'react';

const LEAVE_DEBOUNCE_MS = 140;

/**
 * Tracks hover-preview state across two elements (a hamburger toggle and the
 * sidebar itself) using native listeners rather than React's synthetic hover
 * props, so mouse handoff between the two elements doesn't flicker.
 */
export function useSidebarHover(): {
  hoverPreview: boolean;
  hamburgerRef: React.RefObject<HTMLButtonElement | null>;
  asideRef: React.RefObject<HTMLElement | null>;
} {
  const [hoverPreview, setHoverPreview] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hamburger = hamburgerRef.current;
    const aside = asideRef.current;
    if (!hamburger || !aside) return;

    const handleEnter = () => {
      if (leaveTimer.current !== null) {
        clearTimeout(leaveTimer.current);
        leaveTimer.current = null;
      }
      setHoverPreview(true);
    };

    const handleLeave = () => {
      leaveTimer.current = setTimeout(() => setHoverPreview(false), LEAVE_DEBOUNCE_MS);
    };

    hamburger.addEventListener('mouseenter', handleEnter);
    hamburger.addEventListener('mouseleave', handleLeave);
    aside.addEventListener('mouseenter', handleEnter);
    aside.addEventListener('mouseleave', handleLeave);

    return () => {
      hamburger.removeEventListener('mouseenter', handleEnter);
      hamburger.removeEventListener('mouseleave', handleLeave);
      aside.removeEventListener('mouseenter', handleEnter);
      aside.removeEventListener('mouseleave', handleLeave);
      if (leaveTimer.current !== null) clearTimeout(leaveTimer.current);
    };
  }, []);

  return { hoverPreview, hamburgerRef, asideRef };
}
