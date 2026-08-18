import { useRef } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { authorAvatar, AVATAR_GRADIENT_ANGLE } from '@forumkit/shared';
import { linearGradientEndpoints, nextGradientId } from '../lib/svg-gradient';

// Circular author avatar — a real photo when avatarUrl is set, otherwise the
// deterministic gradient + initial from @forumkit/shared (same palette/hash as
// the web Avatar). Takes the raw author fields and derives the fallback
// internally, so call sites just pass what they have on a FeedRow.
export default function Avatar({ authorId, author, avatarUrl, size = 22 }: {
  authorId?: string | undefined;
  author: string;
  avatarUrl?: string | null | undefined;
  size?: number;
}) {
  const idRef = useRef<string | null>(null);
  if (!idRef.current) idRef.current = nextGradientId('fkAvatarGrad');

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  const { colors, letter } = authorAvatar(authorId, author);
  const dir = linearGradientEndpoints(AVATAR_GRADIENT_ANGLE);
  const id = idRef.current;

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} {...dir}>
            <Stop offset="0" stopColor={colors[0]} />
            <Stop offset="1" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: size * 0.5 }}>{letter}</Text>
    </View>
  );
}
