import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Image, ScrollView, ActivityIndicator, StyleSheet, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from 'react-native';
import { searchGifs, GifSearchNotConfiguredError, deleteAttachment } from '@forumkit/shared';
import type { GifResult } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import { pickAndUploadMedia, type UploadedMedia } from '../lib/upload';
import { LinkIcon, ListIcon, ImageIcon, CloseIcon } from '../components/icons';

// The mobile rich composer — the RN counterpart to sdk-web's comment-composer
// (TipTap can't run in RN, so this is a TextInput + markdown-insertion toolbar).
// Reused by the post composer's Text tab and the thread comment composer.
// Controlled: parent owns `value` + `attachments`. Formatting wraps/inserts
// markdown at the current selection; the media button uploads via lib/upload;
// the GIF button inserts a markdown image from the GIPHY proxy.
export default function RichComposer({
  apiUrl, forumId, token, value, onChangeText, attachments, onAttachmentsChange,
  placeholder = 'Body text (optional)', minHeight = 120,
}: {
  apiUrl: string;
  forumId: string;
  token: string | undefined;
  value: string;
  onChangeText: (v: string) => void;
  attachments: UploadedMedia[];
  onAttachmentsChange: (a: UploadedMedia[]) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const { tokens } = useTheme();
  const selection = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const [uploading, setUploading] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifNotConfigured, setGifNotConfigured] = useState(false);

  function onSelectionChange(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) {
    selection.current = e.nativeEvent.selection;
  }

  function wrap(before: string, after: string) {
    const { start, end } = selection.current;
    const sel = value.slice(start, end);
    onChangeText(value.slice(0, start) + before + sel + after + value.slice(end));
  }

  function insert(text: string) {
    const { start } = selection.current;
    onChangeText(value.slice(0, start) + text + value.slice(start));
  }

  async function addMedia() {
    if (!token || uploading) return;
    setUploading(true);
    try {
      const uploaded = await pickAndUploadMedia(apiUrl, forumId, 'attachment', token, { videos: true, allowsMultipleSelection: true });
      if (uploaded.length) onAttachmentsChange([...attachments, ...uploaded]);
    } catch {
      /* surfaced by the composer's own error line if needed */
    } finally {
      setUploading(false);
    }
  }

  function removeMedia(attachmentId: string) {
    onAttachmentsChange(attachments.filter(a => a.attachmentId !== attachmentId));
    if (token) void deleteAttachment(apiUrl, forumId, attachmentId, token).catch(() => { /* best effort */ });
  }

  useEffect(() => {
    if (!gifOpen || gifNotConfigured || !token) return;
    const q = gifQuery.trim();
    const handle = setTimeout(() => {
      setGifLoading(true);
      searchGifs(apiUrl, forumId, q || 'trending', token)
        .then(setGifResults)
        .catch(err => { if (err instanceof GifSearchNotConfiguredError) setGifNotConfigured(true); })
        .finally(() => setGifLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [gifOpen, gifQuery, gifNotConfigured, apiUrl, forumId, token]);

  return (
    <View style={[styles.box, { borderColor: tokens['border-strong'] }]}>
      <View style={styles.toolbar}>
        <TBtn onPress={() => wrap('**', '**')}><Glyph weight="800" color={tokens['text-2']}>B</Glyph></TBtn>
        <TBtn onPress={() => wrap('*', '*')}><Glyph italic color={tokens['text-2']}>i</Glyph></TBtn>
        <TBtn onPress={() => wrap('~~', '~~')}><Glyph strike color={tokens['text-2']}>S</Glyph></TBtn>
        <TBtn onPress={() => wrap('[', '](https://)')}><LinkIcon size={16} color={tokens['text-2']} /></TBtn>
        <TBtn onPress={() => insert('\n- ')}><ListIcon size={16} color={tokens['text-2']} /></TBtn>
        <TBtn onPress={() => insert('\n> ')}><Glyph color={tokens['text-2']}>❝</Glyph></TBtn>
        <TBtn onPress={() => wrap('`', '`')}><Glyph color={tokens['text-2']} mono>{'</>'}</Glyph></TBtn>
        <TBtn onPress={addMedia}>{uploading ? <ActivityIndicator size="small" color={tokens['text-2']} /> : <ImageIcon size={16} color={tokens['text-2']} />}</TBtn>
        <TBtn onPress={() => setGifOpen(o => !o)}><Glyph weight="800" color={gifOpen ? tokens.accent : tokens['text-2']} small>GIF</Glyph></TBtn>
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={onSelectionChange}
        placeholder={placeholder}
        placeholderTextColor={tokens.muted}
        multiline
        style={[styles.input, { color: tokens.text, minHeight }]}
      />

      {attachments.length > 0 && (
        <View style={styles.thumbs}>
          {attachments.map(a => (
            <View key={a.attachmentId} style={styles.thumbWrap}>
              <Image source={{ uri: a.downloadUrl }} style={[styles.thumb, { backgroundColor: tokens['surface-2'] }]} />
              <Pressable onPress={() => removeMedia(a.attachmentId)} style={[styles.thumbX, { backgroundColor: tokens.elev }]} hitSlop={6}>
                <CloseIcon size={12} color={tokens.text} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {gifOpen && (
        <View style={[styles.gifPanel, { borderTopColor: tokens.border }]}>
          <TextInput
            value={gifQuery}
            onChangeText={setGifQuery}
            placeholder="Search GIFs"
            placeholderTextColor={tokens.muted}
            style={[styles.gifSearch, { color: tokens.text, backgroundColor: tokens['surface-2'] }]}
          />
          {gifNotConfigured ? (
            <Text style={{ color: tokens.muted, fontSize: 12, padding: 8 }}>GIF search isn’t set up for this forum yet.</Text>
          ) : gifLoading ? (
            <ActivityIndicator color={tokens.accent} style={{ padding: 12 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 8 }}>
              {gifResults.map(g => (
                <Pressable key={g.id} onPress={() => { insert(`\n![gif](${g.url})\n`); setGifOpen(false); }}>
                  <Image source={{ uri: g.previewUrl }} style={{ width: 90, height: 90, borderRadius: 8, backgroundColor: tokens['surface-2'] }} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

function TBtn({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return <Pressable onPress={onPress} hitSlop={6} style={styles.tbtn}>{children}</Pressable>;
}

function Glyph({ children, color, weight, italic, strike, mono, small }: {
  children: React.ReactNode; color: string; weight?: '800'; italic?: boolean; strike?: boolean; mono?: boolean; small?: boolean;
}) {
  return (
    <Text style={{
      color, fontSize: small ? 11 : 15, fontWeight: weight ?? '600',
      fontStyle: italic ? 'italic' : 'normal',
      textDecorationLine: strike ? 'line-through' : 'none',
      fontFamily: mono ? 'Courier' : undefined,
    }}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 10, flexWrap: 'wrap' },
  tbtn: { minWidth: 20, alignItems: 'center', justifyContent: 'center' },
  input: { fontSize: 14, paddingHorizontal: 12, paddingBottom: 12, textAlignVertical: 'top' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  thumbX: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gifPanel: { borderTopWidth: 1, paddingHorizontal: 12, paddingBottom: 8 },
  gifSearch: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, marginTop: 8 },
});
