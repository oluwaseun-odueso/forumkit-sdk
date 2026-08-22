import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Modal, View, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Measures a trigger's on-screen position so an anchored DropdownMenu can be
// placed just below it. Attach `ref` to the trigger and call `measure(cb)` on
// press — it records the window rect, then runs cb (typically opening the menu).
export function useAnchor() {
  const ref = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const measure = useCallback((cb?: () => void) => {
    ref.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      cb?.();
    });
  }, []);
  return { ref, anchor, measure };
}

// Anchored dropdown card per design_handoff README §6 — an `elev` card
// (150px, border, radius 12, padding 6, big soft shadow) with a full-screen
// transparent scrim that closes on outside tap. Rendered in a Modal so the
// scrim covers the whole screen regardless of where the trigger sits; the card
// is positioned from the trigger's measured window coords (see useAnchor).
// Reused by the feed Sort/View pills and the post ellipsis menu.

export type Anchor = { x: number; y: number; width: number; height: number };

export function DropdownMenu({ visible, onClose, anchor, width = 150, align = 'left', children }: {
  visible: boolean;
  onClose: () => void;
  anchor: Anchor | null;
  width?: number;
  align?: 'left' | 'right';
  children: ReactNode;
}) {
  const { tokens } = useTheme();
  if (!anchor) return null;
  const top = anchor.y + anchor.height + 4;
  const left = align === 'left' ? anchor.x : anchor.x + anchor.width - width;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        {/* Inner Pressable swallows taps on the card so they don't reach the
            scrim and close it (rows handle their own presses). */}
        <Pressable
          onPress={() => {}}
          style={[
            styles.card,
            { top, left, width, backgroundColor: tokens.elev, borderColor: tokens.border },
          ]}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DropdownMenuItem({ label, active, icon, labelColor, onPress }: {
  label: string;
  active?: boolean;
  icon?: ReactNode;
  // Overrides the label's default tokens.text color — e.g. a menu item that
  // reflects an active/toggled state (CommentRow's "Unaccept", once a
  // comment is the accepted answer, renders in tokens.success).
  labelColor?: string | undefined;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.item, active ? { backgroundColor: tokens['hover-2'] } : null]}>
      {icon}
      <Text style={{ color: labelColor ?? tokens.text, fontSize: 13.5, fontWeight: active ? '600' : '400' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 20,
    elevation: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
});
