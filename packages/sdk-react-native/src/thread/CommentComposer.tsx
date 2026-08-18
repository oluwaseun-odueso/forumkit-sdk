import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import RichComposer from '../composer/RichComposer';
import type { UploadedMedia } from '../lib/upload';

// Self-contained comment composer — the rich editor (formatting + media + GIF)
// plus a submit button, mirroring sdk-web's comment-composer. Reused for the
// top-level "Add a comment" box and for nested reply boxes (with onCancel).
export default function CommentComposer({
  apiUrl, forumId, token, onSubmit, onCancel, placeholder = 'Add a comment', submitLabel = 'Comment',
}: {
  apiUrl: string;
  forumId: string;
  token: string | undefined;
  onSubmit: (body: string, attachmentIds: string[]) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
}) {
  const { tokens } = useTheme();
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<UploadedMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Block submit while a media upload is still in flight, so a comment never
  // ships before its attachment finishes confirming.
  const canSubmit = (body.trim().length > 0 || attachments.length > 0) && !submitting && !uploading;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(body.trim(), attachments.map(a => a.attachmentId));
      setBody('');
      setAttachments([]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={{ marginTop: 12 }}>
      <RichComposer
        apiUrl={apiUrl}
        forumId={forumId}
        token={token}
        value={body}
        onChangeText={setBody}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        onUploadingChange={setUploading}
        placeholder={placeholder}
        minHeight={64}
      />
      <View style={styles.actions}>
        {onCancel && (
          <Pressable onPress={onCancel} style={[styles.btn, { backgroundColor: tokens['surface-2'] }]}>
            <Text style={{ color: tokens['text-2'], fontWeight: '700', fontSize: 13 }}>Cancel</Text>
          </Pressable>
        )}
        <Pressable onPress={submit} disabled={!canSubmit} style={[styles.btn, { backgroundColor: tokens.accent, opacity: canSubmit ? 1 : 0.5 }]}>
          <Text style={{ color: tokens['accent-fg'], fontWeight: '700', fontSize: 13 }}>{submitting ? '…' : uploading ? 'Uploading…' : submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  btn: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
});
