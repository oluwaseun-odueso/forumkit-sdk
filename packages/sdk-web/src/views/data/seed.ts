export type ReactionData = { key: string; glyph: string; label: string; count: number; on: boolean };
export type ReplyData = {
  id: number; author: string; time: string; body: string;
  votes: number; voted: boolean;
  reactions: ReactionData[];
  children: ReplyData[];
  accepted: boolean;
};
export type PostData = {
  id: string; author: string; time: string;
  title: string; tags: string[]; body: string;
  votes: number; voted: boolean;
};
export type ThreadData = { post: PostData; replies: ReplyData[] };

export type DirectoryEntry = {
  id: string; title: string; author: string; tags: string[];
  votes: number; replies: number; time: string; preview: string;
};

function mk(
  id: number, author: string, time: string, body: string, votes: number,
  reactions: Omit<ReactionData, "on">[], children: ReplyData[], accepted: boolean
): ReplyData {
  return {
    id, author, time, body, votes, voted: false,
    reactions: reactions.map(r => ({ ...r, on: false })),
    children,
    accepted: !!accepted,
  };
}

export const SEED_THREAD: ThreadData = {
  post: {
    id: "post", author: "Mara V.", time: "4h",
    title: "How do you keep a product voice warm without sounding precious?",
    tags: ["writing", "voice", "product"],
    body: "We rewrote our onboarding to feel more human, and now half the team says it reads as twee. Where is the line between genuine warmth and self-indulgence? I am after principles, not just 'it depends.'",
    votes: 47, voted: false,
  },
  replies: [
    mk(1, "Idris K.", "3h",
      "Warmth is specificity, not adjectives. 'We saved you four hours' lands warm; 'we lovingly crafted this experience' lands twee. Cut every word that names the feeling, and name the thing that causes it instead.",
      38,
      [{ key: "insightful", glyph: "\u{1F4A1}", label: "Insightful", count: 22 }, { key: "like", glyph: "\u{1F44D}", label: "Like", count: 14 }],
      [
        mk(2, "Mara V.", "2h", "This reframes it for me -- we were decorating, not pointing.", 9, [], [], false),
        mk(3, "Lena R.", "2h", "The 'describe the cause, not the feeling' rule is going on our wall.", 12, [], [], false),
      ],
      true),
    mk(4, "Sam T.", "2h",
      "Read it aloud. Anything you would be embarrassed to say to a stranger is too precious for a UI -- the mouth is a good twee-detector.",
      21,
      [{ key: "funny", glyph: "\u{1F602}", label: "Funny", count: 9 }, { key: "like", glyph: "\u{1F44D}", label: "Like", count: 12 }],
      [mk(5, "Idris K.", "1h", "The read-aloud test is underrated -- most 'delightful' copy dies out loud.", 6, [], [], false)],
      false),
    mk(6, "Priya N.", "1h",
      "Give the warmth a job. If a warm line is not reducing anxiety or clarifying the next step, it is ornament -- and ornament is where precious lives.",
      14,
      [{ key: "helpful", glyph: "\u{1F64C}", label: "Helpful", count: 11 }, { key: "insightful", glyph: "\u{1F4A1}", label: "Insightful", count: 7 }],
      [],
      false),
  ],
};

export const SUMMARY_POINTS = [
  "Warmth is specificity, not adjectives -- name the cause, not the feeling.",
  "Use the read-aloud test: copy you would be embarrassed to say out loud is too precious.",
  "Give every warm line a job -- reduce anxiety or clarify the next step, or cut it.",
];

export const SUGGESTED_REPLY =
  "Building on Idris and Priya -- a quick rule we could adopt: keep a warm line only if deleting it makes the next step less clear. Warmth that fails that test is ornament.";

export const REACTION_TYPES: { key: string; glyph: string; label: string }[] = [
  { key: "like", glyph: "\u{1F44D}", label: "Like" },
  { key: "helpful", glyph: "\u{1F64C}", label: "Helpful" },
  { key: "insightful", glyph: "\u{1F4A1}", label: "Insightful" },
  { key: "funny", glyph: "\u{1F602}", label: "Funny" },
];

export const DIRECTORY: DirectoryEntry[] = [
  { id: "d1", title: "How do you keep a product voice warm without sounding precious?", author: "Mara V.", tags: ["voice", "writing", "product"], votes: 47, replies: 6, time: "4h", preview: "We rewrote our onboarding to feel more human, and now half the team says it reads as twee." },
  { id: "d2", title: "Error messages that calm instead of scold", author: "Idris K.", tags: ["errors", "voice", "microcopy"], votes: 31, replies: 4, time: "1d", preview: "How do you write errors that explain what happened without making users feel blamed?" },
  { id: "d3", title: "Naming features without falling into the cute-name trap", author: "Priya N.", tags: ["naming", "product", "voice"], votes: 28, replies: 9, time: "2d", preview: "Every new feature needs a name. How do you stay descriptive without being boring or precious?" },
  { id: "d4", title: "Empty states that actually teach the user something", author: "Sam T.", tags: ["empty-states", "onboarding", "microcopy"], votes: 22, replies: 5, time: "3d", preview: "Empty states are prime real estate. What principles guide your approach to them?" },
  { id: "d5", title: "Onboarding copy -- how much is too much?", author: "Lena R.", tags: ["onboarding", "writing"], votes: 40, replies: 12, time: "5h", preview: "We keep adding context to our onboarding flow and users keep ignoring it. Where is the line?" },
  { id: "d6", title: "A house style for tone -- does anyone actually keep one?", author: "Theo M.", tags: ["tone", "voice", "writing"], votes: 19, replies: 7, time: "6d", preview: "We have a style guide nobody reads. How do you make tone rules stick across a team?" },
  { id: "d7", title: "Microcopy reviews inside PRs -- worth the friction?", author: "Nadia S.", tags: ["microcopy", "product", "process"], votes: 15, replies: 3, time: "1w", preview: "Should writers be required reviewers on every PR that touches user-facing strings?" },
  { id: "d8", title: "Accessibility and voice: writing for screen readers", author: "Owen B.", tags: ["accessibility", "voice", "writing"], votes: 26, replies: 8, time: "1w", preview: "Alt text and aria-labels have a voice too. How do you make them consistent with the product tone?" },
];
