import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Boolean on/off switch — mirrors sdk-web's .fk-edit-modal-switch (40×24
// track, 18×18 knob) rather than RN's native Switch, which renders at a
// fixed, much wider OS size that can't be resized to match without also
// distorting the touch target and platform-native look.
export default function Toggle({ value, onValueChange }: { value: boolean; onValueChange: () => void }) {
  const { tokens } = useTheme();
  return (
    <Pressable
      onPress={onValueChange}
      hitSlop={6}
      style={[
        styles.track,
        { backgroundColor: value ? tokens.accent : tokens['surface-2'], borderColor: value ? tokens.accent : tokens['border-strong'] },
      ]}
    >
      <View style={[styles.knob, { backgroundColor: value ? '#fff' : tokens.text }, value && styles.knobOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 40, height: 24, borderRadius: 999, borderWidth: 1, padding: 2, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9 },
  knobOn: { transform: [{ translateX: 16 }] },
});
