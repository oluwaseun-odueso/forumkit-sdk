import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// A bordered surface-2 input box — mirrors sdk-web's composer title/link fields
// (README §10). `required` shows a red asterisk (the `*` the web appends to the
// label). `multiline` grows for body-style fields.
export default function Field({ value, onChangeText, placeholder, required, multiline, minHeight }: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  minHeight?: number;
}) {
  const { tokens } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: tokens['surface-2'], borderColor: tokens['border-strong'] }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.muted}
        multiline={multiline}
        style={[styles.input, { color: tokens.text }, minHeight != null && { minHeight }]}
      />
      {required && <Text style={[styles.required, { color: tokens.up }]}>*</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: { flex: 1, fontSize: 14, padding: 0 },
  required: { fontSize: 15, fontWeight: '700', marginLeft: 6 },
});
