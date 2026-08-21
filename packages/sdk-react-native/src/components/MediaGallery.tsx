import { useState } from 'react';
import {
  View, Image, ScrollView, Pressable, StyleSheet, useWindowDimensions,
  type NativeSyntheticEvent, type NativeScrollEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { AttachmentSummary } from '@forumkit/types';
import { useTheme } from '../theme/ThemeContext';
import ImageLightbox from './ImageLightbox';

// Inline video with native controls (play/pause, scrubber, duration, and on
// iOS playback speed) — matches web's plain <video controls> element.
function GalleryVideo({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, p => { p.loop = false; });
  return <VideoView player={player} style={style} nativeControls contentFit="contain" />;
}

// Every image/video attached to a post, swipeable when there's more than
// one — mirrors sdk-web's Carousel (arrows/dots) + Lightbox (tap to view
// full-screen) combo, adapted to touch paging instead of click arrows. This
// used to only ever render the FIRST image (ThreadScreen's old `heroImage`),
// silently dropping every other attachment.
export default function MediaGallery({ attachments, radius = 14, aspectRatio = 4 / 5 }: {
  attachments: AttachmentSummary[];
  radius?: number;
  aspectRatio?: number;
}) {
  const { tokens } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  // Content area is the screen width minus the thread page's own horizontal
  // padding (16 on each side — see ThreadScreen's `content` style).
  const slideWidth = windowWidth - 32;

  if (attachments.length === 0) return null;

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / slideWidth));
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ borderRadius: radius, overflow: 'hidden' }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
        >
          {attachments.map(a => {
            const isVideo = a.mimeType.startsWith('video/');
            return (
              <Pressable
                key={a.id}
                disabled={isVideo}
                onPress={() => setPreviewUri(a.downloadUrl)}
                style={[styles.slide, { width: slideWidth, aspectRatio, backgroundColor: tokens['surface-2'] }]}
              >
                {isVideo ? (
                  <GalleryVideo uri={a.downloadUrl} style={styles.media} />
                ) : (
                  <Image source={{ uri: a.downloadUrl }} style={styles.media} resizeMode="cover" />
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {attachments.length > 1 && (
          <View style={styles.dots}>
            {attachments.map((a, i) => (
              <View key={a.id} style={[styles.dot, { backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.5)' }]} />
            ))}
          </View>
        )}
      </View>

      {previewUri && <ImageLightbox uri={previewUri} onClose={() => setPreviewUri(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {},
  media: { width: '100%', height: '100%' },
  dots: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
