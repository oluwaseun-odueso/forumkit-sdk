import { authorAvatar as sharedAuthorAvatar, AVATAR_GRADIENT_ANGLE } from '@forumkit/shared';

// Web adapter over the shared author-avatar palette (single source of the hash +
// colors in @forumkit/shared). Formats the shared color pair into the CSS
// `linear-gradient(...)` string its consumers already pass to <Avatar gradient=…>,
// so the return shape and every call site are unchanged.
export function authorAvatar(authorId: string | undefined, authorName: string): { gradient: string; letter: string } {
  const { colors, letter } = sharedAuthorAvatar(authorId, authorName);
  return { gradient: `linear-gradient(${AVATAR_GRADIENT_ANGLE}deg,${colors[0]},${colors[1]})`, letter };
}
