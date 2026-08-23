import { useVideoPlayer, VideoView } from 'expo-video';
import type { StyleProp, ViewStyle } from 'react-native';

// Small inline video preview with native playback controls (play/pause,
// scrubber, duration, and on iOS playback speed) — expo-video has no
// separate "extract a poster frame" API, so VideoView itself doubles as the
// static preview (it shows the first frame) plus the controls. Shared by
// the feed, the thread's media gallery, and the composer's attachment cells.
export default function InlineVideoThumb({ uri, style, contentFit = 'cover' }: {
  uri: string;
  style: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
}) {
  const player = useVideoPlayer(uri, p => { p.loop = false; });
  return <VideoView player={player} style={style} nativeControls contentFit={contentFit} />;
}
