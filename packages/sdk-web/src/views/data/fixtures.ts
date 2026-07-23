export type Community = { id: string; name: string; letter: string; gradient: string };

export type FeedPost = {
  id: string;
  communityId: string;
  author: string;
  time: string;
  title: string;
  snippet: string;
  body: string;
  thumbGradient: string;
  imageUrl?: string | null;
  domain: string | null;
  votes: number;
  commentCount: number;
  saved: boolean;
};

export type CommentNodeData = {
  id: number;
  author: string;
  time: string;
  body: string;
  votes: number;
  replies: CommentNodeData[];
};

export type RailItem = {
  id: string;
  title: string;
  communityId: string;
  time: string;
  votes: number;
  commentCount: number;
  thumbGradient: string;
};

export type ProfilePost = {
  id: string;
  title: string;
  time: string;
  votes: number;
  commentCount: number;
};

function mkComment(
  id: number,
  author: string,
  time: string,
  body: string,
  votes: number,
  replies: CommentNodeData[] = [],
): CommentNodeData {
  return { id, author, time, body, votes, replies };
}

export const COMMUNITIES: Community[] = [
  { id: 'c1', name: 'r/productdesign', letter: 'P', gradient: 'linear-gradient(135deg,#3f7ee2,#7b5cff)' },
  { id: 'c2', name: 'r/webdev', letter: 'W', gradient: 'linear-gradient(135deg,#ff6a3d,#ff5b7f)' },
  { id: 'c3', name: 'r/writing', letter: 'W', gradient: 'linear-gradient(135deg,#5ee6d0,#3f7ee2)' },
  { id: 'c4', name: 'r/opensource', letter: 'O', gradient: 'linear-gradient(135deg,#8b5cf6,#3f7ee2)' },
];

export const FEED_POSTS: FeedPost[] = [
  {
    id: 'p1', communityId: 'c1', author: 'Mara V.', time: '4h',
    title: 'How do you keep a product voice warm without sounding precious?',
    snippet: 'We rewrote our onboarding to feel more human, and now half the team says it reads as twee. Where is the line between genuine warmth and self-indulgence?',
    body: 'We rewrote our onboarding to feel more human, and now half the team says it reads as twee. Where is the line between genuine warmth and self-indulgence? I am after principles, not just "it depends."',
    thumbGradient: 'linear-gradient(135deg,#ff8a5b,#ff5b7f)', domain: null, votes: 47, commentCount: 6, saved: false,
  },
  {
    id: 'p2', communityId: 'c2', author: 'Idris K.', time: '1d',
    title: 'Error messages that calm instead of scold',
    snippet: 'How do you write errors that explain what happened without making users feel blamed?',
    body: 'How do you write errors that explain what happened without making users feel blamed? Looking for concrete before/after examples.',
    thumbGradient: 'linear-gradient(135deg,#3f7ee2,#5ee6d0)', domain: 'medium.com', votes: 31, commentCount: 4, saved: false,
  },
  {
    id: 'p3', communityId: 'c1', author: 'Priya N.', time: '2d',
    title: 'Naming features without falling into the cute-name trap',
    snippet: 'Every new feature needs a name. How do you stay descriptive without being boring or precious?',
    body: 'Every new feature needs a name. How do you stay descriptive without being boring or precious? Curious how other teams run this process.',
    thumbGradient: 'linear-gradient(135deg,#8b5cf6,#3f7ee2)', domain: null, votes: 28, commentCount: 9, saved: false,
  },
  {
    id: 'p4', communityId: 'c3', author: 'Sam T.', time: '3d',
    title: 'Empty states that actually teach the user something',
    snippet: 'Empty states are prime real estate. What principles guide your approach to them?',
    body: 'Empty states are prime real estate. What principles guide your approach to them? Sharing a few examples we shipped recently.',
    thumbGradient: 'linear-gradient(135deg,#f0521f,#ff8a5b)', domain: 'notion.so', votes: 22, commentCount: 5, saved: false,
  },
  {
    id: 'p5', communityId: 'c3', author: 'Lena R.', time: '5h',
    title: 'Onboarding copy — how much is too much?',
    snippet: 'We keep adding context to our onboarding flow and users keep ignoring it. Where is the line?',
    body: 'We keep adding context to our onboarding flow and users keep ignoring it. Where is the line? Would love a framework, not just vibes.',
    thumbGradient: 'linear-gradient(135deg,#5ee6d0,#3f7ee2)', domain: null, votes: 40, commentCount: 12, saved: false,
  },
  {
    id: 'p6', communityId: 'c4', author: 'Owen B.', time: '1w',
    title: 'Accessibility and voice: writing for screen readers',
    snippet: 'Alt text and aria-labels have a voice too. How do you make them consistent with the product tone?',
    body: 'Alt text and aria-labels have a voice too. How do you make them consistent with the product tone? Looking for a lightweight review process.',
    thumbGradient: 'linear-gradient(135deg,#3f7ee2,#8b5cf6)', domain: 'github.com', votes: 26, commentCount: 8, saved: false,
  },
];

export const COMMENTS: CommentNodeData[] = [
  mkComment(1, 'Idris K.', '3h',
    'Warmth is specificity, not adjectives. "We saved you four hours" lands warm; "we lovingly crafted this experience" lands twee. Cut every word that names the feeling, and name the thing that causes it instead.',
    38,
    [
      mkComment(2, 'Mara V.', '2h', 'This reframes it for me — we were decorating, not pointing.', 9),
      mkComment(3, 'Lena R.', '2h', 'The "describe the cause, not the feeling" rule is going on our wall.', 12),
    ]),
  mkComment(4, 'Sam T.', '2h',
    'Read it aloud. Anything you would be embarrassed to say to a stranger is too precious for a UI — the mouth is a good twee-detector.',
    21,
    [mkComment(5, 'Idris K.', '1h', 'The read-aloud test is underrated — most "delightful" copy dies out loud.', 6)]),
  mkComment(6, 'Priya N.', '1h',
    'Give the warmth a job. If a warm line is not reducing anxiety or clarifying the next step, it is ornament — and ornament is where precious lives.',
    14),
];

export const LATEST_ITEMS: RailItem[] = [
  { id: 'l1', title: 'A house style for tone — does anyone actually keep one?', communityId: 'c3', time: '6d', votes: 19, commentCount: 7, thumbGradient: 'linear-gradient(135deg,#3f7ee2,#5ee6d0)' },
  { id: 'l2', title: 'Microcopy reviews inside PRs — worth the friction?', communityId: 'c2', time: '1w', votes: 15, commentCount: 3, thumbGradient: 'linear-gradient(135deg,#ff6a3d,#ff5b7f)' },
  { id: 'l3', title: 'Should design systems own tone-of-voice too?', communityId: 'c1', time: '2w', votes: 24, commentCount: 5, thumbGradient: 'linear-gradient(135deg,#8b5cf6,#3f7ee2)' },
];

export const SIMILAR_ITEMS: RailItem[] = [
  { id: 's1', title: 'Writing empty states people actually read', communityId: 'c3', time: '4d', votes: 33, commentCount: 6, thumbGradient: 'linear-gradient(135deg,#f0521f,#ff8a5b)' },
  { id: 's2', title: 'How specific is too specific in error copy?', communityId: 'c2', time: '5d', votes: 18, commentCount: 4, thumbGradient: 'linear-gradient(135deg,#3f7ee2,#8b5cf6)' },
  { id: 's3', title: 'The "read it aloud" test for UI copy', communityId: 'c1', time: '1w', votes: 27, commentCount: 9, thumbGradient: 'linear-gradient(135deg,#5ee6d0,#3f7ee2)' },
];

export const TRENDING_ITEMS: RailItem[] = [
  { id: 't1', title: 'Naming features without falling into the cute-name trap', communityId: 'c1', time: '2d', votes: 28, commentCount: 9, thumbGradient: 'linear-gradient(135deg,#8b5cf6,#3f7ee2)' },
  { id: 't2', title: 'Onboarding copy — how much is too much?', communityId: 'c3', time: '5h', votes: 40, commentCount: 12, thumbGradient: 'linear-gradient(135deg,#5ee6d0,#3f7ee2)' },
  { id: 't3', title: 'Accessibility and voice: writing for screen readers', communityId: 'c4', time: '1w', votes: 26, commentCount: 8, thumbGradient: 'linear-gradient(135deg,#3f7ee2,#8b5cf6)' },
  { id: 't4', title: 'Error messages that calm instead of scold', communityId: 'c2', time: '1d', votes: 31, commentCount: 4, thumbGradient: 'linear-gradient(135deg,#3f7ee2,#5ee6d0)' },
];

export const PROFILE_POSTS: ProfilePost[] = [];

export const SUMMARY_POINTS = [
  'Warmth is specificity, not adjectives — name the cause, not the feeling.',
  'Use the read-aloud test: copy you would be embarrassed to say out loud is too precious.',
  'Give every warm line a job — reduce anxiety or clarify the next step, or cut it.',
];

export const SUGGESTED_REPLY =
  'Building on Idris and Priya — a quick rule we could adopt: keep a warm line only if deleting it makes the next step less clear. Warmth that fails that test is ornament.';
