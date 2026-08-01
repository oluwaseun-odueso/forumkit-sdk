// Deterministic hash-to-color fallback avatar for authors with no uploaded
// profile picture — same author always gets the same color/initial, computed
// purely client-side from data already present (no backend dependency).
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#3f7ee2,#5ee6d0)',
  'linear-gradient(135deg,#ff6a3d,#ff5b7f)',
  'linear-gradient(135deg,#8b5cf6,#3f7ee2)',
  'linear-gradient(135deg,#5ee6d0,#3f7ee2)',
  'linear-gradient(135deg,#f0521f,#ff8a5b)',
  'linear-gradient(135deg,#8360c3,#2ebf91)',
];

export function authorAvatar(authorId: string | undefined, authorName: string): { gradient: string; letter: string } {
  const key = authorId ?? authorName;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return {
    gradient: AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length] ?? 'linear-gradient(135deg,#3f7ee2,#5ee6d0)',
    letter: (authorName.trim()[0] ?? '?').toUpperCase(),
  };
}
