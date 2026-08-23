import { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Image, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createThread, createDraft, deleteAttachment } from '@forumkit/shared';
import type { DraftContent } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { useSession } from '../session/SessionContext';
import { pickMedia, uploadPickedAssets, makeLocalAttachment, type ComposerAttachment } from '../lib/upload';
import { CloseIcon, SparkleIcon, PlusIcon, PencilIcon } from '../components/icons';
import TabBar from '../composer/TabBar';
import Field from '../composer/Field';
import RichComposer from '../composer/RichComposer';
import ImageLightbox from '../components/ImageLightbox';
import InlineVideoThumb from '../components/InlineVideoThumb';

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
export default function ComposerOverlay({ onClose, onOpenDrafts, onPosted, initialDraft }: {
  onClose: () => void;
  onOpenDrafts?: (() => void) | undefined;
  // Called instead of onClose once a new thread has actually been created,
  // so the caller can close the overlay AND take the user straight to it.
  onPosted: (threadId: string) => void;
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
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const isUploading = attachments.some(a => a.status === 'uploading');
  // "Suggest title & tags" mirrors sdk-web's composer-modal.tsx button, but per
  // the standing decision to keep AI UI-only (see thread/AiRow.tsx), it isn't
  // wired to a backend — it just reveals the same placeholder note that pattern
  // uses elsewhere.
  const [showAiNote, setShowAiNote] = useState(false);

  const hasTitle = title.trim().length > 0;
  const canPost = hasTitle && !submitting && !isUploading
    && (tab === 'link' ? linkUrl.trim().length > 0 : tab === 'images' ? attachments.some(a => a.status === 'uploaded') : true);
  const canSaveDraft = hasTitle && body.trim().length > 0 && !savingDraft;

  function tagNames(): string[] {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  function cleanupAttachments() {
    if (!token) return;
    for (const a of attachments) {
      if (a.attachmentId) void deleteAttachment(apiUrl, forumId, a.attachmentId, token).catch(() => { /* best effort */ });
    }
  }

  function handleCancel() {
    cleanupAttachments();
    onClose();
  }

  async function addMedia() {
    if (!token) return;
    setError(null);
    const assets = await pickMedia({ videos: true, allowsMultipleSelection: true });
    if (assets.length === 0) return;
    const placeholders = assets.map(makeLocalAttachment);
    setAttachments(prev => [...prev, ...placeholders]);
    uploadPickedAssets(apiUrl, forumId, 'attachment', token, assets, placeholders.map(p => p.localId), (localId, result) => {
      setAttachments(prev => prev.map(a => (a.localId !== localId ? a : (
        result.ok
          ? { ...a, status: 'uploaded', attachmentId: result.media.attachmentId, downloadUrl: result.media.downloadUrl }
          : { ...a, status: 'error' }
      ))));
      if (!result.ok) setError('An upload failed — remove it and try again');
    });
  }

  function removeMedia(localId: string) {
    const target = attachments.find(a => a.localId === localId);
    setAttachments(a => a.filter(x => x.localId !== localId));
    if (token && target?.attachmentId) void deleteAttachment(apiUrl, forumId, target.attachmentId, token).catch(() => { /* best effort */ });
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
      const thread = await createThread(apiUrl, forumId, {
        title: title.trim(),
        body: postBody,
        tagIds: [],
        tagNames: tagNames(),
        attachmentIds: attachments.filter(a => a.attachmentId).map(a => a.attachmentId as string),
      }, token);
      onPosted(thread.id); // attachments are now part of the thread — don't clean up
    } catch (e) {
      console.error('[composer] createThread failed:', e);
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
                <Text style={{ color: tokens.muted, fontSize: 14 }}>Tap to upload image or video</Text>
              </Pressable>
            ) : (
              // A horizontally-sliding strip rather than sdk-web's 3-column
              // grid — the trailing tile re-opens the picker, so adding more
              // doesn't need a separate control. Each cell shows its local
              // picked image immediately (via localUri) rather than waiting
              // for the upload to finish, with a spinner overlay while it's
              // still in flight.
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaRow}
              >
                {attachments.map(a => (
                  <View key={a.localId} style={[styles.mediaCell, { backgroundColor: tokens['surface-2'] }]}>
                    <Pressable
                      disabled={a.kind !== 'image'}
                      onPress={() => setPreviewUri(a.localUri)}
                      style={styles.mediaCellImg}
                    >
                      {a.kind === 'video' ? (
                        <InlineVideoThumb uri={a.localUri} style={[styles.mediaCellImg, a.status === 'error' && { opacity: 0.4 }]} />
                      ) : (
                        <Image
                          source={{ uri: a.localUri }}
                          style={[styles.mediaCellImg, a.status === 'error' && { opacity: 0.4 }]}
                          resizeMode="cover"
                        />
                      )}
                      {a.status === 'uploading' && (
                        <View style={styles.mediaCellOverlay}><ActivityIndicator color="#fff" /></View>
                      )}
                    </Pressable>
                    <Pressable onPress={() => removeMedia(a.localId)} style={styles.mediaCellDelete} hitSlop={6}>
                      <CloseIcon size={12} color="#fff" />
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  onPress={addMedia}
                  style={[styles.mediaCell, styles.mediaAddCell, { borderColor: tokens['border-strong'] }]}
                >
                  <PlusIcon size={20} color={tokens['text-2']} />
                  <Text style={{ color: tokens['text-2'], fontSize: 11, marginTop: 4, fontWeight: '600' }}>Add</Text>
                </Pressable>
              </ScrollView>
            )
          )}
          {tab === 'link' && <Field value={linkUrl} onChangeText={setLinkUrl} placeholder="Link URL" required />}

          {error && <Text style={{ color: tokens.up, fontSize: 13 }}>{error}</Text>}

          <View style={styles.footer}>
            <Pressable onPress={handleSaveDraft} disabled={!canSaveDraft} style={[styles.btn, { backgroundColor: tokens['surface-2'], opacity: canSaveDraft ? 1 : 0.5 }]}>
              <Text style={{ color: tokens['text-2'], fontSize: 13.5, fontWeight: '700' }}>{savingDraft ? 'Saving…' : 'Save as Draft'}</Text>
            </Pressable>
            <Pressable onPress={handlePost} disabled={!canPost} style={[styles.btn, { backgroundColor: tokens.accent, opacity: canPost ? 1 : 0.5 }]}>
              <Text style={{ color: tokens['accent-fg'], fontSize: 13.5, fontWeight: '700' }}>{submitting ? 'Posting…' : isUploading ? 'Uploading…' : 'Post'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </View>
      {previewUri && <ImageLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />}
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
  mediaRow: { flexDirection: 'row', gap: 10 },
  mediaCell: { width: 240, height: 240, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  mediaCellImg: { width: '100%', height: '100%' },
  mediaCellOverlay: {
    ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  mediaCellDelete: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  mediaAddCell: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  btn: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
});
