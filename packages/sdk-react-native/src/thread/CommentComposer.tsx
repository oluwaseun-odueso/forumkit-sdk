import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Comment composer pill — mirrors sdk-web's comment-composer (README §8): an
// outlined pill with the input + an accent "Comment" button. Controlled by the
// Thread screen (value/onChangeText/onSubmit).
export default function CommentComposer({ value, onChangeText, onSubmit, submitting, placeholder = 'Add a comment' }: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  placeholder?: string;
}) {
  const { tokens } = useTheme();
  const canSubmit = value.trim().length > 0 && !submitting;
  return (
    <View style={[styles.pill, { borderColor: tokens['border-strong'] }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.muted}
        style={[styles.input, { color: tokens.text }]}
        multiline
      />
      <Pressable
        onPress={onSubmit}
        disabled={!canSubmit}
        style={[styles.btn, { backgroundColor: tokens.accent, opacity: canSubmit ? 1 : 0.5 }]}
      >
        <Text style={{ color: tokens['accent-fg'], fontWeight: '700', fontSize: 13.5 }}>
          {submitting ? '…' : 'Comment'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
    marginTop: 16,
  },
  input: { flex: 1, fontSize: 14, padding: 0, maxHeight: 100 },
  btn: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
});
