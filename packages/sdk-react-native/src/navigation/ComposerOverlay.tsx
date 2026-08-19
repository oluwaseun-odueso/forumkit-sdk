import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Image, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createThread, createDraft, deleteAttachment } from '@forumkit/shared';
import type { DraftContent } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { useSession } from '../session/SessionContext';
import { pickAndUploadMedia, type UploadedMedia } from '../lib/upload';
import { CloseIcon, SparkleIcon, PlusIcon, PencilIcon } from '../components/icons';
import TabBar from '../composer/TabBar';
import Field from '../composer/Field';
import RichComposer from '../composer/RichComposer';

const ANDROID_TOP_EXTRA = Platform.OS === 'android' ? 12 : 0;

type ComposerTab = 'text' | 'images' | 'link';
const TABS: ReadonlyArray<{ id: ComposerTab; label: string }> = [
  { id: 'text', label: 'Text' },
  { id: 'images', label: 'Images & Video' },
  { id: 'link', label: 'Link' },
];

// Create Post sheet per README §10, mirroring sdk-web composer-modal.tsx. Text
// tab uses the RichComposer (formatting + media + GIF); the Images tab uploads
// via the same presigned flow; Post sends attachmentIds. Cancelling or saving a
// draft cleans up unposted attachments (matching web's orphan cleanup) — media
// isn't persisted into drafts (banner note).
export default function ComposerOverlay({ onClose, onOpenDrafts, initialDraft }: {
  onClose: () => void;
  onOpenDrafts?: (() => void) | undefined;
  initialDraft?: { title: string; content: DraftContent } | undefined;
}) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const { apiUrl, forumId } = session;
  const token = session.status === 'ready' ? session.sessionToken : undefined;

  const [tab, setTab] = useState<ComposerTab>(initialDraft?.content.activeTab ?? 'text');
  const [title, setTitle] = useState(initialDraft?.title ?? '');
  const [tags, setTags] = useState(initialDraft?.content.tags ?? '');
  const [body, setBody] = useState(initialDraft?.content.body ?? '');
  const [linkUrl, setLinkUrl] = useState(initialDraft?.content.linkUrl ?? '');
  const [attachments, setAttachments] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "Suggest title & tags" mirrors sdk-web's composer-modal.tsx button, but per
  // the standing decision to keep AI UI-only (see thread/AiRow.tsx), it isn't
  // wired to a backend — it just reveals the same placeholder note that pattern
  // uses elsewhere.
  const [showAiNote, setShowAiNote] = useState(false);

  const hasTitle = title.trim().length > 0;
  const canPost = hasTitle && !submitting && !uploading
    && (tab === 'link' ? linkUrl.trim().length > 0 : tab === 'images' ? attachments.length > 0 : true);
  const canSaveDraft = hasTitle && body.trim().length > 0 && !savingDraft;

  function tagNames(): string[] {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  function cleanupAttachments() {
    if (!token) return;
    for (const a of attachments) void deleteAttachment(apiUrl, forumId, a.attachmentId, token).catch(() => { /* best effort */ });
  }

  function handleCancel() {
    cleanupAttachments();
    onClose();
  }

  async function addMedia() {
    if (!token || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const up = await pickAndUploadMedia(apiUrl, forumId, 'attachment', token, { videos: true, allowsMultipleSelection: true });
      if (up.length) setAttachments(a => [...a, ...up]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(attachmentId: string) {
    setAttachments(a => a.filter(x => x.attachmentId !== attachmentId));
    if (token) void deleteAttachment(apiUrl, forumId, attachmentId, token).catch(() => { /* best effort */ });
  }

  async function handlePost() {
    if (!token || !canPost) return;
    setSubmitting(true);
    setError(null);
    const rawBody = tab === 'link' ? (body.trim() ? `${body.trim()}\n${linkUrl.trim()}` : linkUrl.trim()) : body;
    // The backend requires a non-empty body always (title + media alone
    // aren't enough) — web never hits this because its rich-text editor
    // serializes an "empty" doc as non-empty markup (e.g. `<p></p>`), but
    // mobile's plain TextInput is a genuinely empty string when nothing's
    // typed. Posting straight from the Images & Video tab without ever
    // touching the Text tab was hitting the 400 this avoids.
    const postBody = rawBody.trim().length > 0 ? rawBody : ' ';
    try {
      await createThread(apiUrl, forumId, {
        title: title.trim(),
        body: postBody,
        tagIds: [],
        tagNames: tagNames(),
        attachmentIds: attachments.map(a => a.attachmentId),
      }, token);
      onClose(); // attachments are now part of the thread — don't clean up
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
    // Media isn't persisted into drafts (see banner) — save empty attachments
    // and clean up any uploaded ones.
    const content: DraftContent = { activeTab: tab, tags, body, linkUrl, attachments: [] };
    try {
      await createDraft(apiUrl, forumId, title.trim(), content, token);
      cleanupAttachments();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <>
      <View style={[styles.bottomBackdrop, { height: 94 + insets.bottom, backgroundColor: tokens.bg }]} />
      <View style={[styles.overlay, { bottom: 94 + insets.bottom, backgroundColor: tokens.bg }]}>
      <View style={{ paddingTop: insets.top + ANDROID_TOP_EXTRA }}>
        <View style={styles.header}>
          <Pressable onPress={handleCancel} hitSlop={8}>
            <CloseIcon size={18} color={tokens.text} />
          </Pressable>
          <Text style={[styles.heading, { color: tokens.text }]}>Create post</Text>
          <Pressable onPress={onOpenDrafts} hitSlop={8}>
            <Text style={{ color: tokens.accent, fontSize: 14, fontWeight: '600' }}>Drafts</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.draftNote, { color: tokens.muted }]}>Media isn’t saved in drafts.</Text>

        <TabBar tabs={TABS} active={tab} onSelect={setTab} />

        <View style={{ marginTop: 14, gap: 12 }}>
          <Field value={title} onChangeText={setTitle} placeholder="Title" required />

          <Pressable onPress={() => setShowAiNote(s => !s)} style={styles.suggestRow} hitSlop={6}>
            <SparkleIcon size={14} />
            <Text style={{ color: tokens.accent, fontSize: 13, fontWeight: '600' }}>Suggest title & tags</Text>
          </Pressable>
          {showAiNote && (
            <Text style={{ color: tokens.muted, fontSize: 12, marginTop: -6 }}>
              Suggestions will appear here once the AI service is connected.
            </Text>
          )}

          <View style={[styles.tagsWrap, { backgroundColor: tokens['surface-2'] }]}>
            <PencilIcon size={12} color={tokens.muted} />
            <TextInput
              value={tags}
              onChangeText={setTags}
              placeholder="Add tags, comma separated"
              placeholderTextColor={tokens.muted}
              style={{ color: tokens.text, fontSize: 13, fontWeight: '500', padding: 0, minWidth: 160 }}
            />
          </View>

          {tab === 'text' && (
            <RichComposer
              apiUrl={apiUrl}
              forumId={forumId}
              token={token}
              value={body}
              onChangeText={setBody}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              allowMedia={false}
            />
          )}

          {tab === 'images' && (
            attachments.length === 0 ? (
              <Pressable onPress={addMedia} style={[styles.dropzone, { borderColor: tokens['border-strong'] }]}>
                {uploading
                  ? <ActivityIndicator color={tokens.accent} />
                  : <Text style={{ color: tokens.muted, fontSize: 14 }}>Tap to upload image or video</Text>}
              </Pressable>
            ) : (
              // Mirrors sdk-web's media-gallery.css grid (3-column, rounded
              // container + thumbs) rather than the old bare dropzone-above-
              // a-row-of-thumbs layout — the trailing tile re-opens the
              // picker, so adding more doesn't need a separate control.
              <View style={[styles.mediaGrid, { borderColor: tokens['border-strong'] }]}>
                {attachments.map(a => (
                  <View key={a.attachmentId} style={[styles.mediaCell, { backgroundColor: tokens['surface-2'] }]}>
                    <Image source={{ uri: a.downloadUrl }} style={styles.mediaCellImg} resizeMode="cover" />
                    <Pressable onPress={() => removeMedia(a.attachmentId)} style={styles.mediaCellDelete} hitSlop={6}>
                      <CloseIcon size={12} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={addMedia}
                  style={[styles.mediaCell, styles.mediaAddCell, { borderColor: tokens['border-strong'] }]}
                >
                  {uploading
                    ? <ActivityIndicator color={tokens.accent} />
                    : (
                      <>
                        <PlusIcon size={20} color={tokens['text-2']} />
                        <Text style={{ color: tokens['text-2'], fontSize: 11, marginTop: 4, fontWeight: '600' }}>Add</Text>
                      </>
                    )}
                </Pressable>
              </View>
            )
          )}
          {tab === 'link' && <Field value={linkUrl} onChangeText={setLinkUrl} placeholder="Link URL" required />}

          {error && <Text style={{ color: tokens.up, fontSize: 13 }}>{error}</Text>}

          <View style={styles.footer}>
            <Pressable onPress={handleSaveDraft} disabled={!canSaveDraft} style={[styles.btn, { backgroundColor: tokens['surface-2'], opacity: canSaveDraft ? 1 : 0.5 }]}>
              <Text style={{ color: tokens['text-2'], fontSize: 13.5, fontWeight: '700' }}>{savingDraft ? 'Saving…' : 'Save as Draft'}</Text>
            </Pressable>
            <Pressable onPress={handlePost} disabled={!canPost} style={[styles.btn, { backgroundColor: tokens.accent, opacity: canPost ? 1 : 0.5 }]}>
              <Text style={{ color: tokens['accent-fg'], fontSize: 13.5, fontWeight: '700' }}>{submitting ? 'Posting…' : uploading ? 'Uploading…' : 'Post'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // bottom is set dynamically (94 + the device's safe-area bottom inset) so
  // the sheet's own content stops short of the floating bottom bar, which
  // stays visible/tappable in that gap — see `bottomBackdrop` below for why
  // the gap itself doesn't show the feed through.
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 60 },
  // Fills exactly the gap `overlay` leaves at the bottom with an opaque
  // backdrop, so the feed's own posts don't show through behind the
  // composer — BottomBar (higher zIndex, see BottomBar.tsx) still renders on
  // top of this, in the same reserved strip.
  bottomBackdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 55 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  heading: { fontSize: 16, fontWeight: '800' },
  body: { paddingHorizontal: 16, paddingBottom: 24 },
  draftNote: { fontSize: 12, marginBottom: 10 },
  suggestRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Matches sdk-web's fk-composer-tags-wrap — a filled, fully-rounded,
  // content-hugging pill (not a full-width bordered box).
  tagsWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
  },
  dropzone: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  // 3-column grid, mirrors sdk-web's fk-media-gallery-grid proportions.
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderWidth: 1, borderRadius: 18, padding: 10 },
  mediaCell: { width: '31%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  mediaCellImg: { width: '100%', height: '100%' },
  mediaCellDelete: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  mediaAddCell: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btn: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
});
