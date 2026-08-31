import { Image, type ImageStyle, type StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Post thumbnail — a real image with rounded corners. Only rendered when a post
// actually has an image (the feed row omits it otherwise, mirroring sdk-web's
// post-card), so there's no gradient placeholder path here. `square` renders a
// fixed NxN thumb (compact row, 78×78/r12); `aspectRatio` renders a full-width
// thumb (card view, 16:10/r14). A surface-2 backdrop shows while the image
// loads.
export default function Thumbnail({ imageUrl, radius, square, aspectRatio, style }: {
  imageUrl: string;
  radius: number;
  square?: number;
  aspectRatio?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const { tokens } = useTheme();
  // 4:5 (was 4:3, before that 16:10) — a portrait-leaning default crop so a
  // card's photo reads as an actual image rather than a landscape strip.
  const dims: ImageStyle = square != null
    ? { width: square, height: square }
    : { width: '100%', aspectRatio: aspectRatio ?? 4 / 5 };
  return (
    <Image
      source={{ uri: imageUrl }}
      resizeMode="cover"
      style={[dims, { borderRadius: radius, backgroundColor: tokens['surface-2'] }, style]}
    />
  );
}
