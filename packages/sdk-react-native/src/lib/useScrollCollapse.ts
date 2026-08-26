import { useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useShell } from '../navigation/Shell';

const COLLAPSE_THRESHOLD = 14; // px scrolled down before collapsing
const EXPAND_THRESHOLD = 48;   // px scrolled up before expanding — larger than
                                // COLLAPSE_THRESHOLD so a small upward wobble
                                // (e.g. list bounce/overscroll) doesn't reopen it.
const TOP_SNAP_Y = 24;         // near the top, always force-expand

// Returns an onScroll handler that collapses/expands the bottom bar via
// Shell's setBottomBarCollapsed as the user scrolls. Threshold-based (not a
// live 1:1 follow) since BottomBar's own withTiming already smooths the
// visual transition — this only needs to decide the boolean.
export function useScrollCollapse() {
  const { setBottomBarCollapsed } = useShell();
  const state = useRef({ lastY: 0, downAccum: 0, upAccum: 0, collapsed: false });

  return (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, e.nativeEvent.contentOffset.y);
    const s = state.current;
    const dy = y - s.lastY;
    s.lastY = y;

    if (y <= TOP_SNAP_Y) {
      if (s.collapsed) { s.collapsed = false; setBottomBarCollapsed(false); }
      s.downAccum = 0;
      s.upAccum = 0;
      return;
    }

    if (dy > 0) {
      s.downAccum += dy;
      s.upAccum = 0;
      if (!s.collapsed && s.downAccum > COLLAPSE_THRESHOLD) {
        s.collapsed = true;
        setBottomBarCollapsed(true);
        s.downAccum = 0;
      }
    } else if (dy < 0) {
      s.upAccum += -dy;
      s.downAccum = 0;
      if (s.collapsed && s.upAccum > EXPAND_THRESHOLD) {
        s.collapsed = false;
        setBottomBarCollapsed(false);
        s.upAccum = 0;
      }
    }
  };
}
