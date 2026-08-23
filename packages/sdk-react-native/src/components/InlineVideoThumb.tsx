import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { PlayIcon } from './icons';

// Small inline video preview with native playback controls (play/pause,
// scrubber, duration, and on iOS playback speed) — expo-video has no
// separate "extract a poster frame" API, so VideoView itself doubles as the
// static preview (it shows the first frame) plus the controls. Shared by
// the feed, the thread's media gallery, and the composer's attachment cells.
//
// The native controls only reveal themselves once real playback has
// actually started — a core AVPlayerViewController/ExoPlayer behavior, not
// something a prop can override — and this player never autoplays, so that
// transition never happens on its own. Without help, a video just sits
// there with no visible controls (or even a hint it's a video) until an
// exploratory tap happens to reveal them. This small always-visible play
// button is the deliberate tap target that actually calls player.play(),
// which reliably triggers the native controls; it disappears once tapped
// and hands off to them from there.
export default function InlineVideoThumb({ uri, style, contentFit = 'cover' }: {
  uri: string;
  style: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
}) {
  const player = useVideoPlayer(uri, p => { p.loop = false; });
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const sub = player.addListener('playingChange', ({ isPlaying }) => {
      if (isPlaying) setStarted(true);
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View style={[style, styles.wrap]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit={contentFit} />
      {!started && (
        <Pressable onPress={() => { player.play(); setStarted(true); }} style={styles.overlay}>
          <View style={styles.badge}>
            <PlayIcon size={20} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
