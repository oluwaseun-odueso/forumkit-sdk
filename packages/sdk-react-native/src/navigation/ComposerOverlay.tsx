import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createThread, createDraft } from '@forumkit/shared';
import type { DraftContent } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { useSession } from '../session/SessionContext';
import { CloseIcon, LinkIcon, ListIcon, ImageIcon } from '../components/icons';
import TabBar from '../composer/TabBar';
import Field from '../composer/Field';

// See navigation/Shell.tsx — Android's statusBarTranslucent inset still lands
// tighter than iOS, so nudge it down a bit further.
const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

type ComposerTab = 'text' | 'images' | 'link';
const TABS: ReadonlyArray<{ id: ComposerTab; label: string }> = [
  { id: 'text', label: 'Text' },
  { id: 'images', label: 'Images & Video' },
  { id: 'link', label: 'Link' },
];

// Create Post sheet per README §10 — overlay stopping 94px above the floating
// bar. Mirrors sdk-web composer-modal.tsx (tabs, title + tags fields, per-tab
// content, Save Draft/Post gating). Post/Save Draft are wired (createThread/
// createDraft); image upload + rich-text formatting are deferred (the toolbar
// and dropzone are UI only).
export default function ComposerOverlay({ onClose }: { onClose: () => void }) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const [tab, setTab] = useState<ComposerTab>('text');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTitle = title.trim().length > 0;
  const canPost = hasTitle && !submitting && (tab === 'link' ? linkUrl.trim().length > 0 : tab === 'text');
  const canSaveDraft = hasTitle && body.trim().length > 0 && !savingDraft;

  function tagNames(): string[] {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  async function handlePost() {
    if (!token || !canPost) return;
    setSubmitting(true);
    setError(null);
    const postBody = tab === 'link' ? (body.trim() ? `${body.trim()}\n${linkUrl.trim()}` : linkUrl.trim()) : body;
    try {
      await createThread(apiUrl, forumId, { title: title.trim(), body: postBody, tagIds: [], tagNames: tagNames() }, token);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveDraft() {
    if (!token || !canSaveDraft) return;
    setSavingDraft(true);
    setError(null);
    const content: DraftContent = { activeTab: tab, tags, body, linkUrl, attachments: [] };
    try {
      await createDraft(apiUrl, forumId, title.trim(), content, token);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <View style={[styles.overlay, { backgroundColor: tokens.bg }]}>
      <View style={{ paddingTop: insets.top + ANDROID_TOP_EXTRA }}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <CloseIcon size={18} color={tokens.text} />
          </Pressable>
          <Text style={[styles.heading, { color: tokens.text }]}>Create post</Text>
          <Text style={{ color: tokens.accent, fontSize: 14, fontWeight: '600' }}>Drafts</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <TabBar tabs={TABS} active={tab} onSelect={setTab} />

        <View style={{ marginTop: 14, gap: 12 }}>
          <Field value={title} onChangeText={setTitle} placeholder="Title" required />

          <View style={[styles.tagsWrap, { borderColor: tokens['border-strong'] }]}>
            <TextInput
              value={tags}
              onChangeText={setTags}
              placeholder="Add tags, comma separated"
              placeholderTextColor={tokens.muted}
              style={{ color: tokens.text, fontSize: 13, padding: 0 }}
            />
          </View>

          {tab === 'text' && (
            <View style={[styles.textBox, { borderColor: tokens['border-strong'] }]}>
              <View style={styles.toolbar}>
                <ToolbarText label="B" weight="800" color={tokens['text-2']} />
                <ToolbarText label="i" italic color={tokens['text-2']} />
                <ToolbarText label="S" strike color={tokens['text-2']} />
                <LinkIcon size={16} color={tokens['text-2']} />
                <ListIcon size={16} color={tokens['text-2']} />
                <ImageIcon size={16} color={tokens['text-2']} />
              </View>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Body text (optional)"
                placeholderTextColor={tokens.muted}
                multiline
                style={[styles.bodyInput, { color: tokens.text }]}
              />
            </View>
          )}

          {tab === 'images' && (
            <View style={[styles.dropzone, { borderColor: tokens['border-strong'] }]}>
              <Text style={{ color: tokens.muted, fontSize: 14 }}>Drag and Drop or upload media</Text>
            </View>
          )}

          {tab === 'link' && (
            <Field value={linkUrl} onChangeText={setLinkUrl} placeholder="Link URL" required />
          )}

          {error && <Text style={{ color: tokens.up, fontSize: 13 }}>{error}</Text>}

          <View style={styles.footer}>
            <Pressable
              onPress={handleSaveDraft}
              disabled={!canSaveDraft}
              style={[styles.btn, { backgroundColor: tokens['surface-2'], opacity: canSaveDraft ? 1 : 0.5 }]}
            >
              <Text style={{ color: tokens['text-2'], fontSize: 13.5, fontWeight: '700' }}>
                {savingDraft ? 'Saving…' : 'Save Draft'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handlePost}
              disabled={!canPost}
              style={[styles.btn, { backgroundColor: tokens.accent, opacity: canPost ? 1 : 0.5 }]}
            >
              <Text style={{ color: tokens['accent-fg'], fontSize: 13.5, fontWeight: '700' }}>
                {submitting ? 'Posting…' : 'Post'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ToolbarText({ label, weight, italic, strike, color }: {
  label: string; weight?: '800'; italic?: boolean; strike?: boolean; color: string;
}) {
  return (
    <Text style={{
      color, fontSize: 15, width: 20, textAlign: 'center',
      fontWeight: weight ?? '600',
      fontStyle: italic ? 'italic' : 'normal',
      textDecorationLine: strike ? 'line-through' : 'none',
    }}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 94, zIndex: 60 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  heading: { fontSize: 16, fontWeight: '800' },
  body: { paddingHorizontal: 16, paddingBottom: 24 },
  tagsWrap: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  textBox: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 12, paddingVertical: 10 },
  bodyInput: { minHeight: 120, fontSize: 14, paddingHorizontal: 12, paddingBottom: 12, textAlignVertical: 'top' },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btn: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
});
