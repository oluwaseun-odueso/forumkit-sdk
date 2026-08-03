import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import {
  type FeedPost, type CommentNodeData, type RailItem,
} from '../data/fixtures';
import type { SimilarThread, Thread, Comment, VoteCounts, ForumConfig, RelatedThreadForRail, TopWindow } from '@forumkit/types';
import { callSummarise, callSuggest, callSuggestMetadata, callSurfaceRelated } from '../api/ai';
import { requestUploadUrl, putFile, confirmUpload } from '../api/attachments';
import { getMyProfile, updateMyProfile } from '../api/profile';
import { getForum } from '../api/forums';
import {
  createThread, updateThread, getThread as apiGetThread, listThreads as apiListThreads,
  getSimilarThreads, type ListThreadsParams,
} from '../api/threads';
import { createReply, updateReply } from '../api/comments';
import { voteOnThread, removeVoteFromThread, voteOnComment, removeVoteFromComment } from '../api/votes';
import { useSession } from './use-session';

// ─── Types ──────────────────────────────────────────────────────────────────

export type View = 'feed' | 'thread' | 'profile' | 'compose';
export type FeedView = 'card' | 'compact';
export type FeedSort = 'Best' | 'Hot' | 'New' | 'Top' | 'Rising';
export type FeedScope = 'home' | 'popular' | 'news';
export type CommentSort = 'Best' | 'Top' | 'Controversial' | 'Old';
export type ComposerTab = 'text' | 'images' | 'link';
export type VoteDir = -1 | 0 | 1;

export type AttachmentFile = {
  id: number;
  name: string;
  kind: 'image' | 'video' | 'file';
  sizeLabel: string;
  url: string | null;
  caption: string;
  attachmentUrl: string;
  attachmentId: string | null;
  uploadStatus: 'uploading' | 'uploaded' | 'error';
};

export type SocialLink = {
  id: number;
  platform: 'Website' | 'Portfolio' | 'GitHub' | 'LinkedIn' | 'Twitter/X' | 'Behance' | 'Dribbble' | 'Other';
  url: string;
};

type ComposeState = {
  open: boolean;
  activeTab: ComposerTab;
  title: string;
  tags: string;
  body: string;
  linkUrl: string;
  attachments: AttachmentFile[];
  genTitle: boolean;
  genTags: boolean;
  submitting: boolean;
  error: string | null;
};

type AsstState = {
  summarizing: boolean;
  summary: { points: string[]; note: string } | null;
  suggested: boolean;
  surfacing: boolean;
  related: SimilarThread[] | null;
};

type ThreadState = {
  activePostId: string | null;
  commentSort: CommentSort;
  collapsed: Record<string, boolean>;
  commentInput: string;
};

type FeedState = {
  view: FeedView;
  sort: FeedSort;
  scope: FeedScope;
  tagName: string | null;
  topWindow: TopWindow;
  page: number;
  hasMore: boolean;
  loadingMore: boolean;
  saved: Record<string, boolean>;
  openPostMenuId: string | null;
  sortMenuOpen: boolean;
  viewMenuOpen: boolean;
  topWindowMenuOpen: boolean;
};

type RailState = {
  latest: RailItem[];
  similar: RailItem[];
  featured: RailItem[];
};

type ProfileState = {
  activeTab: string;
  id: string | null;
  displayName: string;
  bio: string;
  socialLinks: SocialLink[];
  avatarUrl: string | null;
  bannerUrl: string | null;
};

type State = {
  view: View;
  posts: FeedPost[];
  comments: CommentNodeData[];
  sidebar: { pinned: boolean };
  accountMenu: { open: boolean };
  feed: FeedState;
  rail: RailState;
  forumConfig: ForumConfig | null;
  thread: ThreadState;
  composer: ComposeState;
  asst: AsstState;
  profile: ProfileState;
};

// ─── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_VIEW'; view: View }
  | { type: 'OPEN_THREAD'; postId: string }
  | { type: 'TOGGLE_SIDEBAR_PIN' }
  | { type: 'SET_ACCOUNT_MENU'; open: boolean }
  | { type: 'SET_FEED_VIEW'; view: FeedView }
  | { type: 'SET_FEED_SORT'; sort: FeedSort }
  | { type: 'SET_FEED_SCOPE'; scope: FeedScope }
  | { type: 'SET_TOP_WINDOW'; window: TopWindow }
  | { type: 'SET_LOADING_MORE'; loading: boolean }
  | { type: 'APPEND_POSTS'; posts: FeedPost[]; hasMore: boolean }
  | { type: 'SET_LATEST_RAIL'; items: RailItem[] }
  | { type: 'SET_SIMILAR_RAIL'; items: RailItem[] }
  | { type: 'SET_FEATURED_RAIL'; items: RailItem[] }
  | { type: 'SET_FORUM_CONFIG'; config: ForumConfig }
  | { type: 'TOGGLE_SORT_MENU' }
  | { type: 'TOGGLE_VIEW_MENU' }
  | { type: 'TOGGLE_TOP_WINDOW_MENU' }
  | { type: 'CLOSE_FEED_MENUS' }
  | { type: 'SET_POST_MENU'; postId: string | null }
  | { type: 'TOGGLE_SAVE_POST'; postId: string }
  | { type: 'SET_POST_VOTE'; postId: string; voteCounts: VoteCounts; myVote: 1 | -1 | null }
  | { type: 'SET_COMMENT_VOTE'; commentId: string; voteCounts: VoteCounts; myVote: 1 | -1 | null }
  | { type: 'SET_COMMENT_SORT'; sort: CommentSort }
  | { type: 'TOGGLE_COMMENT_COLLAPSED'; commentId: string }
  | { type: 'SET_COMMENT_INPUT'; value: string }
  | { type: 'THREAD_LOADED'; post: FeedPost; comments: CommentNodeData[] }
  | { type: 'REPLY_SUBMITTED'; parentId: string | null; comment: CommentNodeData }
  | { type: 'COMMENT_EDITED'; commentId: string; body: string }
  | { type: 'POST_EDITED'; postId: string; title: string; body: string }
  | { type: 'OPEN_COMPOSER' }
  | { type: 'CLOSE_COMPOSER' }
  | { type: 'SET_COMPOSER_TAB'; tab: ComposerTab }
  | { type: 'SET_COMPOSER_FIELD'; field: 'title' | 'tags' | 'body' | 'linkUrl'; value: string }
  | { type: 'SET_COMPOSER_GEN'; field: 'genTitle' | 'genTags'; value: boolean }
  | { type: 'ADD_FILE'; file: AttachmentFile }
  | { type: 'UPDATE_FILE_URL'; id: number; url: string }
  | { type: 'UPDATE_ATTACHMENT_META'; id: number; caption: string; attachmentUrl: string }
  | { type: 'SET_ATTACHMENT_UPLOAD'; id: number; status: AttachmentFile['uploadStatus']; attachmentId?: string | null }
  | { type: 'REMOVE_FILE'; id: number }
  | { type: 'SUBMIT_COMPOSER_START' }
  | { type: 'SUBMIT_COMPOSER_SUCCESS'; post: FeedPost }
  | { type: 'SUBMIT_COMPOSER_ERROR'; message: string }
  | { type: 'SET_POSTS'; posts: FeedPost[]; hasMore: boolean }
  | { type: 'SET_PROFILE_TAB'; tab: string }
  | { type: 'UPDATE_PROFILE'; id: string; displayName: string; bio: string; socialLinks: SocialLink[]; avatarUrl: string | null; bannerUrl: string | null }
  | { type: 'ASST_SUMMARIZING' }
  | { type: 'ASST_SUMMARY'; points: string[]; note: string }
  | { type: 'ASST_SUGGEST'; text: string }
  | { type: 'ASST_SURFACING' }
  | { type: 'ASST_RELATED'; threads: SimilarThread[] };

// ─── Reducer helpers ─────────────────────────────────────────────────────────

function mapComment(
  list: CommentNodeData[],
  id: string,
  fn: (c: CommentNodeData) => CommentNodeData,
): CommentNodeData[] {
  return list.map(c => {
    const next = c.id === id ? fn({ ...c }) : { ...c };
    if (next.replies.length > 0) next.replies = mapComment(next.replies, id, fn);
    return next;
  });
}

// Recursively inserts a new reply into the tree at parentId, or prepends it
// to the top level when parentId is null.
function insertReply(list: CommentNodeData[], parentId: string | null, node: CommentNodeData): CommentNodeData[] {
  if (parentId === null) return [node, ...list];
  return list.map(c => c.id === parentId
    ? { ...c, replies: [node, ...c.replies] }
    : { ...c, replies: insertReply(c.replies, parentId, node) });
}

function nextVote(current: VoteDir, clicked: VoteDir): VoteDir {
  return current === clicked ? 0 : clicked;
}

function netVotes(v?: VoteCounts): number {
  return (v?.up ?? 0) - (v?.down ?? 0);
}

// A comment needs both a close up/down split AND real volume to rank as
// controversial — a 1-up/1-down comment is technically "perfectly split"
// but meaningless next to a 50-up/50-down one.
function controversyScore(v?: VoteCounts): number {
  const up = v?.up ?? 0;
  const down = v?.down ?? 0;
  const total = up + down;
  if (total === 0) return -Infinity;
  const balance = 1 - Math.abs(up - down) / total;
  return balance * Math.log(total + 1);
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fmtRelativeTime(iso: string | Date): string {
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Backend Thread -> frontend FeedPost.
function threadToFeedPost(thread: Thread): FeedPost {
  const imageUrls = (thread.attachments ?? [])
    .filter(a => a.mimeType.startsWith('image/'))
    .map(a => a.downloadUrl);
  const videoUrl = (thread.attachments ?? []).find(a => a.mimeType.startsWith('video/'))?.downloadUrl ?? null;
  const voteCounts = thread.voteCounts ?? { up: 0, down: 0 };
  return {
    id: thread.id,
    authorId: thread.authorId,
    author: thread.authorDisplayName ?? 'Member',
    authorAvatarUrl: thread.authorAvatarUrl ?? null,
    time: fmtRelativeTime(thread.createdAt),
    title: thread.title,
    body: thread.body,
    thumbGradient: 'linear-gradient(135deg,#3f7ee2,#7b5cff)',
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    videoUrl,
    domain: null,
    votes: netVotes(voteCounts),
    voteCounts,
    myVote: thread.myVote ?? null,
    commentCount: thread.commentCount ?? 0,
    saved: false,
  };
}

// Backend Thread -> a right-rail RailItem (Latest/Featured cards). Real
// image only (first image attachment) — never a decorative placeholder;
// right-rail.tsx omits the thumbnail entirely when imageUrl is null.
function threadToRailItem(thread: Thread): RailItem {
  const voteCounts = thread.voteCounts ?? { up: 0, down: 0 };
  const firstImage = (thread.attachments ?? []).find(a => a.mimeType.startsWith('image/'));
  return {
    id: thread.id,
    title: thread.title,
    authorId: thread.authorId,
    author: thread.authorDisplayName ?? 'Member',
    authorAvatarUrl: thread.authorAvatarUrl ?? null,
    time: fmtRelativeTime(thread.createdAt),
    votes: netVotes(voteCounts),
    commentCount: thread.commentCount ?? 0,
    thumbGradient: 'linear-gradient(135deg,#3f7ee2,#7b5cff)',
    imageUrl: firstImage?.downloadUrl ?? null,
  };
}

// pgvector-similarity result -> a right-rail RailItem (Similar Posts card).
function relatedToRailItem(t: RelatedThreadForRail): RailItem {
  return {
    id: t.id,
    title: t.title,
    authorId: t.authorId,
    author: t.authorDisplayName ?? 'Member',
    authorAvatarUrl: t.authorAvatarUrl,
    time: fmtRelativeTime(t.createdAt),
    votes: netVotes(t.voteCounts),
    commentCount: t.commentCount,
    thumbGradient: 'linear-gradient(135deg,#3f7ee2,#7b5cff)',
    imageUrl: t.imageUrl,
  };
}

// Backend flat Comment[] (already created_at ASC) -> a nested CommentNodeData
// tree, built from parentCommentId. The server never builds this tree itself.
function commentsToCommentTree(comments: Comment[]): CommentNodeData[] {
  const byId = new Map<string, CommentNodeData>();
  const roots: CommentNodeData[] = [];

  for (const p of comments) {
    const voteCounts = p.voteCounts ?? { up: 0, down: 0 };
    byId.set(p.id, {
      id: p.id,
      authorId: p.authorId,
      author: p.authorDisplayName ?? 'Member',
      authorAvatarUrl: p.authorAvatarUrl ?? null,
      time: fmtRelativeTime(p.createdAt),
      body: p.body,
      votes: netVotes(voteCounts),
      voteCounts,
      myVote: p.myVote ?? null,
      replies: [],
    });
  }

  for (const p of comments) {
    const node = byId.get(p.id);
    if (!node) continue;
    const parent = p.parentCommentId ? byId.get(p.parentCommentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  return roots;
}

// Threads-per-page for the main feed list (both the initial fetch and each
// "load more" page). Reddit's own default Top window when first selected.
const FEED_PAGE_SIZE = 20;
const DEFAULT_TOP_WINDOW: TopWindow = 'day';

const FEED_SORT_TO_QUERY: Record<FeedSort, NonNullable<ListThreadsParams['sort']>> = {
  Best: 'best', Hot: 'hot', New: 'new', Top: 'top', Rising: 'rising',
};

// ─── Initial state ───────────────────────────────────────────────────────────

const initialState: State = {
  view: 'feed',
  posts: [], // populated from GET /forums/:forumId/threads once the session is ready
  comments: [], // populated per-thread from GET /forums/:forumId/threads/:threadId on open
  sidebar: { pinned: false },
  accountMenu: { open: false },
  feed: {
    view: 'compact', sort: 'Best', scope: 'home', tagName: null, topWindow: DEFAULT_TOP_WINDOW,
    page: 1, hasMore: false, loadingMore: false, saved: {},
    openPostMenuId: null, sortMenuOpen: false, viewMenuOpen: false, topWindowMenuOpen: false,
  },
  rail: { latest: [], similar: [], featured: [] },
  forumConfig: null,
  thread: {
    activePostId: null, commentSort: 'Best', collapsed: {}, commentInput: '',
  },
  composer: {
    open: false, activeTab: 'text', title: '', tags: '', body: '', linkUrl: '',
    attachments: [], genTitle: false, genTags: false, submitting: false, error: null,
  },
  asst: { summarizing: false, summary: null, suggested: false, surfacing: false, related: null },
  profile: { activeTab: 'Overview', id: null, displayName: '', bio: '', socialLinks: [], avatarUrl: null, bannerUrl: null },
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view, accountMenu: { open: false } };
    case 'OPEN_THREAD':
      return {
        ...state,
        view: 'thread',
        accountMenu: { open: false },
        thread: { ...state.thread, activePostId: action.postId },
      };
    case 'TOGGLE_SIDEBAR_PIN':
      return { ...state, sidebar: { pinned: !state.sidebar.pinned } };
    case 'SET_ACCOUNT_MENU':
      return { ...state, accountMenu: { open: action.open } };
    case 'SET_FEED_VIEW':
      return { ...state, feed: { ...state.feed, view: action.view, viewMenuOpen: false } };
    case 'SET_FEED_SORT':
      return { ...state, feed: { ...state.feed, sort: action.sort, sortMenuOpen: false } };
    case 'SET_FEED_SCOPE': {
      // Popular/News/Home are just parameterisations of the feed: Popular
      // forces Hot (Reddit's own convention for its Popular tab), News
      // filters to the forum's configured tag (falling back to "news"),
      // Home resets to the default sort with no filter. A manual sort-dropdown
      // change afterwards only touches `sort`, not `scope`/`tagName` — so
      // picking "Top" while on News keeps the News tag filter.
      const tagName = action.scope === 'news' ? (state.forumConfig?.newsTagName ?? 'news') : null;
      const sort =
        action.scope === 'popular' ? 'Hot' :
        action.scope === 'home' ? 'Best' :
        state.feed.sort;
      return { ...state, view: 'feed', feed: { ...state.feed, scope: action.scope, tagName, sort } };
    }
    case 'SET_TOP_WINDOW':
      return { ...state, feed: { ...state.feed, topWindow: action.window } };
    case 'SET_LOADING_MORE':
      return { ...state, feed: { ...state.feed, loadingMore: action.loading } };
    case 'APPEND_POSTS':
      return {
        ...state,
        posts: [...state.posts, ...action.posts],
        feed: { ...state.feed, page: state.feed.page + 1, hasMore: action.hasMore, loadingMore: false },
      };
    case 'SET_LATEST_RAIL':
      return { ...state, rail: { ...state.rail, latest: action.items } };
    case 'SET_SIMILAR_RAIL':
      return { ...state, rail: { ...state.rail, similar: action.items } };
    case 'SET_FEATURED_RAIL':
      return { ...state, rail: { ...state.rail, featured: action.items } };
    case 'SET_FORUM_CONFIG':
      return { ...state, forumConfig: action.config };
    case 'TOGGLE_SORT_MENU':
      return { ...state, feed: { ...state.feed, sortMenuOpen: !state.feed.sortMenuOpen, viewMenuOpen: false, topWindowMenuOpen: false } };
    case 'TOGGLE_VIEW_MENU':
      return { ...state, feed: { ...state.feed, viewMenuOpen: !state.feed.viewMenuOpen, sortMenuOpen: false, topWindowMenuOpen: false } };
    case 'TOGGLE_TOP_WINDOW_MENU':
      return { ...state, feed: { ...state.feed, topWindowMenuOpen: !state.feed.topWindowMenuOpen, sortMenuOpen: false, viewMenuOpen: false } };
    case 'CLOSE_FEED_MENUS':
      return { ...state, feed: { ...state.feed, sortMenuOpen: false, viewMenuOpen: false, topWindowMenuOpen: false, openPostMenuId: null } };
    case 'SET_POST_MENU':
      return { ...state, feed: { ...state.feed, openPostMenuId: action.postId } };
    case 'TOGGLE_SAVE_POST':
      return {
        ...state,
        feed: {
          ...state.feed,
          saved: { ...state.feed.saved, [action.postId]: !state.feed.saved[action.postId] },
          openPostMenuId: null,
        },
      };
    case 'SET_POST_VOTE':
      return {
        ...state,
        posts: state.posts.map(p => p.id === action.postId
          ? { ...p, voteCounts: action.voteCounts, myVote: action.myVote, votes: netVotes(action.voteCounts) }
          : p),
      };
    case 'SET_COMMENT_VOTE':
      return {
        ...state,
        comments: mapComment(state.comments, action.commentId, c => ({
          ...c, voteCounts: action.voteCounts, myVote: action.myVote, votes: netVotes(action.voteCounts),
        })),
      };
    case 'SET_COMMENT_SORT':
      return { ...state, thread: { ...state.thread, commentSort: action.sort } };
    case 'TOGGLE_COMMENT_COLLAPSED':
      return {
        ...state,
        thread: {
          ...state.thread,
          collapsed: { ...state.thread.collapsed, [action.commentId]: !state.thread.collapsed[action.commentId] },
        },
      };
    case 'SET_COMMENT_INPUT':
      return { ...state, thread: { ...state.thread, commentInput: action.value } };
    case 'THREAD_LOADED': {
      const exists = state.posts.some(p => p.id === action.post.id);
      return {
        ...state,
        posts: exists
          ? state.posts.map(p => p.id === action.post.id ? action.post : p)
          : [action.post, ...state.posts],
        comments: action.comments,
      };
    }
    case 'REPLY_SUBMITTED':
      return { ...state, comments: insertReply(state.comments, action.parentId, action.comment) };
    case 'COMMENT_EDITED':
      return { ...state, comments: mapComment(state.comments, action.commentId, c => ({ ...c, body: action.body })) };
    case 'POST_EDITED':
      return {
        ...state,
        posts: state.posts.map(p => p.id === action.postId
          ? { ...p, title: action.title, body: action.body }
          : p),
      };
    case 'OPEN_COMPOSER':
      return {
        ...state,
        view: 'compose',
        sidebar: { pinned: true },
        composer: {
          open: true, activeTab: 'text', title: '', tags: '', body: '', linkUrl: '',
          attachments: [], genTitle: false, genTags: false,
          submitting: false, error: null,
        },
      };
    case 'CLOSE_COMPOSER':
      return { ...state, view: 'feed', composer: { ...state.composer, open: false } };
    case 'SET_COMPOSER_TAB':
      return { ...state, composer: { ...state.composer, activeTab: action.tab } };
    case 'SET_COMPOSER_FIELD':
      return { ...state, composer: { ...state.composer, [action.field]: action.value } };
    case 'SET_COMPOSER_GEN':
      return { ...state, composer: { ...state.composer, [action.field]: action.value } };
    case 'ADD_FILE':
      return { ...state, composer: { ...state.composer, attachments: [...state.composer.attachments, action.file] } };
    case 'UPDATE_FILE_URL':
      return {
        ...state,
        composer: {
          ...state.composer,
          attachments: state.composer.attachments.map(a => a.id === action.id ? { ...a, url: action.url } : a),
        },
      };
    case 'UPDATE_ATTACHMENT_META':
      return {
        ...state,
        composer: {
          ...state.composer,
          attachments: state.composer.attachments.map(a =>
            a.id === action.id ? { ...a, caption: action.caption, attachmentUrl: action.attachmentUrl } : a
          ),
        },
      };
    case 'SET_ATTACHMENT_UPLOAD':
      return {
        ...state,
        composer: {
          ...state.composer,
          attachments: state.composer.attachments.map(a =>
            a.id === action.id
              ? { ...a, uploadStatus: action.status, attachmentId: action.attachmentId ?? a.attachmentId }
              : a
          ),
        },
      };
    case 'REMOVE_FILE':
      return {
        ...state,
        composer: { ...state.composer, attachments: state.composer.attachments.filter(a => a.id !== action.id) },
      };
    case 'SUBMIT_COMPOSER_START':
      return { ...state, composer: { ...state.composer, submitting: true, error: null } };
    case 'SUBMIT_COMPOSER_SUCCESS':
      return {
        ...state,
        view: 'feed',
        posts: [action.post, ...state.posts],
        composer: { ...state.composer, open: false, submitting: false, error: null },
      };
    case 'SUBMIT_COMPOSER_ERROR':
      return { ...state, composer: { ...state.composer, submitting: false, error: action.message } };
    case 'SET_POSTS':
      // Always the "sort/scope/filter changed" path (or the very first
      // load) — resets pagination to page 1 since it's a full replace, not
      // an append (see APPEND_POSTS for the "load more" case).
      return { ...state, posts: action.posts, feed: { ...state.feed, page: 1, hasMore: action.hasMore } };
    case 'SET_PROFILE_TAB':
      return { ...state, profile: { ...state.profile, activeTab: action.tab } };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: {
          ...state.profile, id: action.id, displayName: action.displayName, bio: action.bio,
          socialLinks: action.socialLinks, avatarUrl: action.avatarUrl, bannerUrl: action.bannerUrl,
        },
      };
    case 'ASST_SUMMARIZING':
      return { ...state, asst: { ...state.asst, summarizing: true, summary: null } };
    case 'ASST_SUMMARY':
      return { ...state, asst: { ...state.asst, summarizing: false, summary: { points: action.points, note: action.note } } };
    case 'ASST_SUGGEST':
      return { ...state, thread: { ...state.thread, commentInput: action.text }, asst: { ...state.asst, suggested: true } };
    case 'ASST_SURFACING':
      return { ...state, asst: { ...state.asst, surfacing: true, related: null } };
    case 'ASST_RELATED':
      return { ...state, asst: { ...state.asst, surfacing: false, related: action.threads } };
    default:
      return state;
  }
}

// ─── ID counters (module-level, stable across renders) ───────────────────────

let _nextFileId = 1;
function nextFileId(): number { return _nextFileId++; }

// ─── Hook ────────────────────────────────────────────────────────────────────

function useForumStateInternal() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const session = useSession();
  const forumId = session.forumId;
  const sessionToken = session.sessionToken ?? undefined;

  const setView = useCallback((view: View) => dispatch({ type: 'SET_VIEW', view }), []);
  const openThread = useCallback((postId: string) => dispatch({ type: 'OPEN_THREAD', postId }), []);
  const toggleSidebarPin = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR_PIN' }), []);
  const setAccountMenu = useCallback((open: boolean) => dispatch({ type: 'SET_ACCOUNT_MENU', open }), []);
  const setFeedView = useCallback((view: FeedView) => dispatch({ type: 'SET_FEED_VIEW', view }), []);
  const setFeedSort = useCallback((sort: FeedSort) => dispatch({ type: 'SET_FEED_SORT', sort }), []);
  const setFeedScope = useCallback((scope: FeedScope) => dispatch({ type: 'SET_FEED_SCOPE', scope }), []);
  const setTopWindow = useCallback((window: TopWindow) => dispatch({ type: 'SET_TOP_WINDOW', window }), []);

  // Infinite-scroll "load more" — appends the next page using the *current*
  // sort/scope/window, rather than replacing state.posts (see SET_POSTS,
  // used by the "sort/scope changed" effect below, which always replaces).
  const loadMorePosts = useCallback(async () => {
    if (!sessionToken || !forumId || state.feed.loadingMore || !state.feed.hasMore) return;
    dispatch({ type: 'SET_LOADING_MORE', loading: true });
    try {
      const nextPage = state.feed.page + 1;
      const result = await apiListThreads(forumId, sessionToken, {
        sort: FEED_SORT_TO_QUERY[state.feed.sort],
        tagName: state.feed.tagName ?? undefined,
        topWindow: state.feed.topWindow,
        page: nextPage,
        limit: FEED_PAGE_SIZE,
      });
      const posts = result.threads.map(t => threadToFeedPost(t));
      const hasMore = nextPage * result.limit < result.total;
      dispatch({ type: 'APPEND_POSTS', posts, hasMore });
    } catch {
      dispatch({ type: 'SET_LOADING_MORE', loading: false });
    }
  }, [
    forumId, sessionToken,
    state.feed.loadingMore, state.feed.hasMore, state.feed.page,
    state.feed.sort, state.feed.tagName, state.feed.topWindow,
  ]);
  const toggleSortMenu = useCallback(() => dispatch({ type: 'TOGGLE_SORT_MENU' }), []);
  const toggleViewMenu = useCallback(() => dispatch({ type: 'TOGGLE_VIEW_MENU' }), []);
  const toggleTopWindowMenu = useCallback(() => dispatch({ type: 'TOGGLE_TOP_WINDOW_MENU' }), []);
  const closeFeedMenus = useCallback(() => dispatch({ type: 'CLOSE_FEED_MENUS' }), []);
  const setPostMenu = useCallback((postId: string | null) => dispatch({ type: 'SET_POST_MENU', postId }), []);
  const toggleSavePost = useCallback((postId: string) => dispatch({ type: 'TOGGLE_SAVE_POST', postId }), []);

  const votePost = useCallback(async (postId: string, dir: VoteDir) => {
    const post = state.posts.find(p => p.id === postId);
    if (!post || dir === 0) return;
    const previousVoteCounts = post.voteCounts ?? { up: 0, down: 0 };
    const previousMyVote = post.myVote ?? null;
    const newMyVote = nextVote(previousMyVote ?? 0, dir) || null;

    try {
      const result = newMyVote === null
        ? await removeVoteFromThread(forumId, postId, sessionToken)
        : await voteOnThread(forumId, postId, newMyVote, sessionToken);
      dispatch({ type: 'SET_POST_VOTE', postId, voteCounts: result.voteCounts, myVote: result.myVote });
    } catch {
      dispatch({ type: 'SET_POST_VOTE', postId, voteCounts: previousVoteCounts, myVote: previousMyVote });
    }
  }, [state.posts, forumId, sessionToken]);

  const voteComment = useCallback(async (commentId: string, dir: VoteDir) => {
    const threadId = state.thread.activePostId;
    if (!threadId || dir === 0) return;

    function findComment(list: CommentNodeData[]): CommentNodeData | undefined {
      for (const c of list) {
        if (c.id === commentId) return c;
        const found = findComment(c.replies);
        if (found) return found;
      }
      return undefined;
    }
    const comment = findComment(state.comments);
    if (!comment) return;
    const previousVoteCounts = comment.voteCounts ?? { up: 0, down: 0 };
    const previousMyVote = comment.myVote ?? null;
    const newMyVote = nextVote(previousMyVote ?? 0, dir) || null;

    try {
      const result = newMyVote === null
        ? await removeVoteFromComment(threadId, commentId, sessionToken)
        : await voteOnComment(threadId, commentId, newMyVote, sessionToken);
      dispatch({ type: 'SET_COMMENT_VOTE', commentId, voteCounts: result.voteCounts, myVote: result.myVote });
    } catch {
      dispatch({ type: 'SET_COMMENT_VOTE', commentId, voteCounts: previousVoteCounts, myVote: previousMyVote });
    }
  }, [state.thread.activePostId, state.comments, sessionToken]);

  const setCommentSort = useCallback((sort: CommentSort) => dispatch({ type: 'SET_COMMENT_SORT', sort }), []);
  const toggleCommentCollapsed = useCallback((commentId: string) => dispatch({ type: 'TOGGLE_COMMENT_COLLAPSED', commentId }), []);
  const setCommentInput = useCallback((value: string) => dispatch({ type: 'SET_COMMENT_INPUT', value }), []);

  const submitReply = useCallback(async (parentId: string | null, body: string): Promise<void> => {
    const threadId = state.thread.activePostId;
    const trimmed = body.trim();
    if (!threadId || !trimmed) return;
    const raw = await createReply(threadId, { body: trimmed, parentCommentId: parentId ?? undefined }, sessionToken);
    const voteCounts = raw.voteCounts ?? { up: 0, down: 0 };
    const comment: CommentNodeData = {
      id: raw.id,
      authorId: raw.authorId,
      author: raw.authorDisplayName ?? 'You',
      authorAvatarUrl: raw.authorAvatarUrl ?? null,
      time: 'now',
      body: raw.body,
      votes: netVotes(voteCounts),
      voteCounts,
      myVote: raw.myVote ?? null,
      replies: [],
    };
    dispatch({ type: 'REPLY_SUBMITTED', parentId, comment });
  }, [state.thread.activePostId, sessionToken]);

  const submitComment = useCallback(async () => {
    const body = state.thread.commentInput;
    if (!body.trim()) return;
    await submitReply(null, body);
    dispatch({ type: 'SET_COMMENT_INPUT', value: '' });
  }, [state.thread.commentInput, submitReply]);

  const editComment = useCallback(async (commentId: string, body: string): Promise<void> => {
    const threadId = state.thread.activePostId;
    if (!threadId) return;
    const updated = await updateReply(threadId, commentId, body, sessionToken);
    dispatch({ type: 'COMMENT_EDITED', commentId, body: updated.body });
  }, [state.thread.activePostId, sessionToken]);

  const editPost = useCallback(async (title: string, body: string): Promise<void> => {
    const threadId = state.thread.activePostId;
    if (!threadId) return;
    const thread = await updateThread(forumId, threadId, { title, body }, sessionToken);
    dispatch({ type: 'POST_EDITED', postId: threadId, title: thread.title, body: thread.body });
  }, [state.thread.activePostId, forumId, sessionToken]);

  const openComposer = useCallback(() => dispatch({ type: 'OPEN_COMPOSER' }), []);
  const closeComposer = useCallback(() => dispatch({ type: 'CLOSE_COMPOSER' }), []);
  const setComposerTab = useCallback((tab: ComposerTab) => dispatch({ type: 'SET_COMPOSER_TAB', tab }), []);
  const setComposerField = useCallback(
    (field: 'title' | 'tags' | 'body' | 'linkUrl', value: string) => dispatch({ type: 'SET_COMPOSER_FIELD', field, value }),
    [],
  );
  const removeFile = useCallback((id: number) => dispatch({ type: 'REMOVE_FILE', id }), []);
  const updateAttachmentMeta = useCallback((id: number, caption: string, attachmentUrl: string) =>
    dispatch({ type: 'UPDATE_ATTACHMENT_META', id, caption, attachmentUrl }), []);
  const submitComposer = useCallback(async () => {
    const title = state.composer.title.trim();
    if (!title) return;
    const isLink = state.composer.activeTab === 'link';
    const linkUrl = state.composer.linkUrl.trim();
    const body = isLink && linkUrl ? `${state.composer.body.trim()}\n\n${linkUrl}`.trim() : state.composer.body.trim();

    // The browser already holds the full image bytes from when the file was
    // picked (used for the composer preview) — fall back to that if the real
    // upload hasn't confirmed yet by the time of submit.
    const previewImage = state.composer.attachments.find(a => a.kind === 'image' && a.url)?.url ?? null;
    const attachmentIds = state.composer.attachments
      .map(a => a.attachmentId)
      .filter((id): id is string => id !== null);

    const tagNames = state.composer.tags.split(',').map(t => t.trim()).filter(Boolean);

    dispatch({ type: 'SUBMIT_COMPOSER_START' });
    try {
      const thread = await createThread(forumId, { title, body, tagIds: [], tagNames, attachmentIds }, sessionToken);
      const newPost = threadToFeedPost(thread);
      if (!newPost.imageUrl && previewImage) {
        newPost.imageUrl = previewImage;
        newPost.imageUrls = [previewImage];
      }
      newPost.domain = isLink ? linkUrl || null : null;
      dispatch({ type: 'SUBMIT_COMPOSER_SUCCESS', post: newPost });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit post';
      dispatch({ type: 'SUBMIT_COMPOSER_ERROR', message });
    }
  }, [state.composer, forumId, sessionToken]);
  const setProfileTab = useCallback((tab: string) => dispatch({ type: 'SET_PROFILE_TAB', tab }), []);

  type SaveProfileFields = {
    displayName: string;
    bio: string;
    socialLinks: SocialLink[];
    avatarBlob: Blob | null;
    bannerBlob: Blob | null;
  };

  const saveProfile = useCallback(async (fields: SaveProfileFields): Promise<void> => {
    let avatarUrl: string | null = state.profile.avatarUrl;
    let bannerUrl: string | null = state.profile.bannerUrl;

    if (fields.avatarBlob) {
      const avatarFile = new File([fields.avatarBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const up = await requestUploadUrl(forumId, 'avatar.jpg', 'image/jpeg', avatarFile.size, sessionToken);
      await putFile(up.uploadUrl, up.uploadHeaders, avatarFile);
      const att = await confirmUpload(forumId, up.attachmentId, { width: 400, height: 400 }, sessionToken);
      avatarUrl = att.downloadUrl;
    }

    if (fields.bannerBlob) {
      const bannerFile = new File([fields.bannerBlob], 'banner.jpg', { type: 'image/jpeg' });
      const up = await requestUploadUrl(forumId, 'banner.jpg', 'image/jpeg', bannerFile.size, sessionToken);
      await putFile(up.uploadUrl, up.uploadHeaders, bannerFile);
      const att = await confirmUpload(forumId, up.attachmentId, { width: 1200, height: 300 }, sessionToken);
      bannerUrl = att.downloadUrl;
    }

    const serverLinks = fields.socialLinks.map(({ platform, url }) => ({ platform, url }));
    const profile = await updateMyProfile(forumId, {
      displayName: fields.displayName,
      bio: fields.bio || null,
      avatarUrl,
      bannerUrl,
      socialLinks: serverLinks,
    }, sessionToken);

    const clientLinks: SocialLink[] = profile.socialLinks.map((l, i) => ({
      id: Date.now() + i,
      platform: l.platform as SocialLink['platform'],
      url: l.url,
    }));

    dispatch({
      type: 'UPDATE_PROFILE',
      id: profile.id,
      displayName: profile.displayName,
      bio: profile.bio ?? '',
      socialLinks: clientLinks,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
    });
  }, [state.profile.avatarUrl, state.profile.bannerUrl, forumId, sessionToken]);

  const uploadAttachment = useCallback(async (id: number, file: File, kind: AttachmentFile['kind']) => {
    dispatch({ type: 'SET_ATTACHMENT_UPLOAD', id, status: 'uploading' });
    try {
      const upload = await requestUploadUrl(forumId, file.name, file.type, file.size, sessionToken);
      await putFile(upload.uploadUrl, upload.uploadHeaders, file);

      let width: number | null = null;
      let height: number | null = null;
      if (kind === 'image') {
        try {
          const bitmap = await createImageBitmap(file);
          width = bitmap.width;
          height = bitmap.height;
          bitmap.close();
        } catch {
          // dimensions are a display hint only — safe to skip if unsupported
        }
      }

      await confirmUpload(forumId, upload.attachmentId, { width, height }, sessionToken);
      dispatch({ type: 'SET_ATTACHMENT_UPLOAD', id, status: 'uploaded', attachmentId: upload.attachmentId });
    } catch {
      dispatch({ type: 'SET_ATTACHMENT_UPLOAD', id, status: 'error' });
    }
  }, [forumId, sessionToken]);

  const addFiles = useCallback((fileList: FileList) => {
    Array.from(fileList).forEach(file => {
      const id = nextFileId();
      const kind: AttachmentFile['kind'] = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video' : 'file';
      dispatch({
        type: 'ADD_FILE',
        file: {
          id, name: file.name, kind, sizeLabel: fmtSize(file.size), url: null, caption: '', attachmentUrl: '',
          attachmentId: null, uploadStatus: kind === 'file' ? 'error' : 'uploading',
        },
      });
      if (kind !== 'file') {
        const reader = new FileReader();
        reader.onload = e => {
          const url = e.target?.result;
          if (typeof url === 'string') dispatch({ type: 'UPDATE_FILE_URL', id, url });
        };
        reader.readAsDataURL(file);
        void uploadAttachment(id, file, kind);
      }
    });
  }, [uploadAttachment]);

  const summarize = useCallback(async () => {
    if (state.asst.summarizing || state.thread.activePostId === null) return;
    dispatch({ type: 'ASST_SUMMARIZING' });
    const points = await callSummarise(state.thread.activePostId, sessionToken);
    const note = `Synthesized from ${state.comments.length} comment${state.comments.length !== 1 ? 's' : ''}`;
    dispatch({ type: 'ASST_SUMMARY', points, note });
  }, [state.asst.summarizing, state.thread.activePostId, state.comments.length, sessionToken]);

  const suggest = useCallback(async () => {
    if (state.thread.activePostId === null) return;
    const text = await callSuggest(state.thread.activePostId, sessionToken);
    dispatch({ type: 'ASST_SUGGEST', text });
  }, [state.thread.activePostId, sessionToken]);

  const surfaceRelated = useCallback(async () => {
    if (state.asst.surfacing || state.thread.activePostId === null) return;
    dispatch({ type: 'ASST_SURFACING' });
    const threads = await callSurfaceRelated(state.thread.activePostId, sessionToken);
    dispatch({ type: 'ASST_RELATED', threads });
  }, [state.asst.surfacing, state.thread.activePostId, sessionToken]);

  const suggestComposeMeta = useCallback(async () => {
    dispatch({ type: 'SET_COMPOSER_GEN', field: 'genTitle', value: true });
    dispatch({ type: 'SET_COMPOSER_GEN', field: 'genTags', value: true });
    const { composer } = state;
    const result = await callSuggestMetadata(
      forumId,
      composer.title,
      composer.body,
      composer.tags.split(',').map(t => t.trim()).filter(Boolean),
      sessionToken,
    );
    if (result.title) dispatch({ type: 'SET_COMPOSER_FIELD', field: 'title', value: result.title });
    if (result.tags.length > 0) dispatch({ type: 'SET_COMPOSER_FIELD', field: 'tags', value: result.tags.join(', ') });
    dispatch({ type: 'SET_COMPOSER_GEN', field: 'genTitle', value: false });
    dispatch({ type: 'SET_COMPOSER_GEN', field: 'genTags', value: false });
  }, [state, forumId, sessionToken]);

  // ─── Profile init: seed state from server on first session ───────────────────

  useEffect(() => {
    if (!sessionToken || !forumId) return;
    void getMyProfile(forumId, sessionToken).then(profile => {
      if (!profile) return;
      const clientLinks: SocialLink[] = profile.socialLinks.map((l, i) => ({
        id: Date.now() + i,
        platform: l.platform as SocialLink['platform'],
        url: l.url,
      }));
      dispatch({
        type: 'UPDATE_PROFILE',
        id: profile.id,
        displayName: profile.displayName,
        bio: profile.bio ?? '',
        socialLinks: clientLinks,
        avatarUrl: profile.avatarUrl,
        bannerUrl: profile.bannerUrl,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  // ─── Feed init: (re)load real threads whenever the sort/scope/window changes ─
  // Ranking is now computed server-side (see repositories/thread.ts
  // SORT_CLAUSES) — this always fetches page 1 and replaces state.posts;
  // "load more" (loadMorePosts above) is a separate append-only path.

  useEffect(() => {
    if (!sessionToken || !forumId) return;
    void apiListThreads(forumId, sessionToken, {
      sort: FEED_SORT_TO_QUERY[state.feed.sort],
      tagName: state.feed.tagName ?? undefined,
      topWindow: state.feed.topWindow,
      page: 1,
      limit: FEED_PAGE_SIZE,
    }).then(result => {
      const posts = result.threads.map(t => threadToFeedPost(t));
      const hasMore = result.page * result.limit < result.total;
      dispatch({ type: 'SET_POSTS', posts, hasMore });
    });
  }, [sessionToken, forumId, state.feed.sort, state.feed.tagName, state.feed.topWindow]);

  // ─── Forum config init: needed to resolve the News scope's tag name ─────────

  useEffect(() => {
    if (!sessionToken || !forumId) return;
    void getForum(forumId, sessionToken).then(forum => {
      dispatch({ type: 'SET_FORUM_CONFIG', config: forum.config });
    });
  }, [sessionToken, forumId]);

  // ─── Featured rail: pinned threads, admin-curated so it rarely changes ──────

  useEffect(() => {
    if (!sessionToken || !forumId) return;
    void apiListThreads(forumId, sessionToken, { pinned: true, limit: 5 }).then(result => {
      const items = result.threads.map(t => threadToRailItem(t));
      dispatch({ type: 'SET_FEATURED_RAIL', items });
    });
  }, [sessionToken, forumId]);

  // ─── Latest rail: feed screens only ──────────────────────────────────────────

  useEffect(() => {
    if (!sessionToken || !forumId || state.view !== 'feed') return;
    void apiListThreads(forumId, sessionToken, { sort: 'new', limit: 5 }).then(result => {
      const items = result.threads.map(t => threadToRailItem(t));
      dispatch({ type: 'SET_LATEST_RAIL', items });
    });
  }, [sessionToken, forumId, state.view]);

  // ─── Similar rail: single-thread view only, keyed on the open thread ─────────

  useEffect(() => {
    const threadId = state.thread.activePostId;
    if (!threadId || !sessionToken || !forumId) return;
    void getSimilarThreads(forumId, threadId, sessionToken, 5).then(result => {
      const items = result.threads.map(t => relatedToRailItem(t));
      dispatch({ type: 'SET_SIMILAR_RAIL', items });
    });
  }, [state.thread.activePostId, sessionToken, forumId]);

  // ─── Thread init: load the real thread + its replies whenever one opens ──────

  useEffect(() => {
    const threadId = state.thread.activePostId;
    if (!threadId || !sessionToken || !forumId) return;
    void apiGetThread(forumId, threadId, sessionToken).then(({ thread, comments: rawComments }) => {
      const post = threadToFeedPost(thread);
      const comments = commentsToCommentTree(rawComments);
      dispatch({ type: 'THREAD_LOADED', post, comments });
    });
  }, [state.thread.activePostId, sessionToken, forumId]);

  // ─── Derived data ──────────────────────────────────────────────────────────

  // Ranking is computed server-side (repositories/thread.ts SORT_CLAUSES) —
  // state.posts already arrives in the correct order for the active sort/scope.
  const sortedPosts = state.posts;

  function sortComments(list: CommentNodeData[], mode: CommentSort): CommentNodeData[] {
    const sorted = list.slice();
    if (mode === 'Best' || mode === 'Top') sorted.sort((a, b) => netVotes(b.voteCounts) - netVotes(a.voteCounts));
    else if (mode === 'Controversial') sorted.sort((a, b) => controversyScore(b.voteCounts) - controversyScore(a.voteCounts));
    else sorted.reverse();
    return sorted.map(c => ({ ...c, replies: sortComments(c.replies, mode) }));
  }
  const sortedComments = sortComments(state.comments, state.thread.commentSort);

  const activePost = state.posts.find(p => p.id === state.thread.activePostId) ?? null;

  return {
    state,
    sortedPosts,
    sortedComments,
    activePost,
    currentUserId: state.profile.id,
    setView,
    openThread,
    toggleSidebarPin,
    setAccountMenu,
    setFeedView,
    setFeedSort,
    setFeedScope,
    setTopWindow,
    loadMorePosts,
    toggleSortMenu,
    toggleViewMenu,
    toggleTopWindowMenu,
    closeFeedMenus,
    setPostMenu,
    toggleSavePost,
    votePost,
    voteComment,
    setCommentSort,
    toggleCommentCollapsed,
    setCommentInput,
    submitComment,
    submitReply,
    editComment,
    editPost,
    openComposer,
    closeComposer,
    setComposerTab,
    setComposerField,
    addFiles,
    removeFile,
    updateAttachmentMeta,
    submitComposer,
    setProfileTab,
    saveProfile,
    summarize,
    suggest,
    surfaceRelated,
    suggestComposeMeta,
    forumId,
    sessionToken,
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

export type ForumStateValue = ReturnType<typeof useForumStateInternal>;

const ForumContext = createContext<ForumStateValue | null>(null);

export function ForumProvider({ children }: { children: ReactNode }) {
  const value = useForumStateInternal();
  return (
    <ForumContext.Provider value={value}>
      {children}
    </ForumContext.Provider>
  );
}

export function useForum(): ForumStateValue {
  const ctx = useContext(ForumContext);
  if (ctx === null) throw new Error('useForum must be used inside ForumProvider');
  return ctx;
}

export type { FeedPost, CommentNodeData, RailItem };
