import { useState, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ChevronDownIcon } from './icons';
import { DropdownMenu, DropdownMenuItem, useAnchor } from './DropdownMenu';

// A surface-2 pill that opens an anchored dropdown of options — the shared
// shell behind both the feed's Sort pill (text label) and its Card/Compact View
// toggle (leading layout icon, no label). Per README §6. Each instance owns its
// own open state; the DropdownMenu's full-screen modal scrim naturally enforces
// "only one open at a time" (an open menu covers the other trigger).
export function SelectPill<T extends string>({
  value, options, onChange, label, leadingIcon, optionLabel, optionIcon, menuWidth = 150,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  label?: string;
  leadingIcon?: ReactNode;
  optionLabel?: (value: T) => string;
  optionIcon?: (value: T) => ReactNode;
  menuWidth?: number;
}) {
  const { tokens } = useTheme();
  const { ref, anchor, measure } = useAnchor();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        ref={ref}
        onPress={() => measure(() => setOpen(true))}
        style={[styles.pill, { backgroundColor: tokens['surface-2'] }]}
      >
        {leadingIcon}
        {label != null && <Text style={[styles.label, { color: tokens.text }]}>{label}</Text>}
        <ChevronDownIcon size={14} color={tokens['text-2']} />
      </Pressable>
      <DropdownMenu visible={open} onClose={() => setOpen(false)} anchor={anchor} width={menuWidth}>
        {options.map(opt => (
          <DropdownMenuItem
            key={opt}
            icon={optionIcon?.(opt)}
            label={optionLabel ? optionLabel(opt) : opt}
            active={opt === value}
            onPress={() => { onChange(opt); setOpen(false); }}
          />
        ))}
      </DropdownMenu>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
