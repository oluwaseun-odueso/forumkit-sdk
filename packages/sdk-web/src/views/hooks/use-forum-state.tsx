import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import {
  FEED_POSTS, COMMENTS, COMMUNITIES, LATEST_ITEMS, SIMILAR_ITEMS, TRENDING_ITEMS,
  type FeedPost, type CommentNodeData, type Community, type RailItem,
} from '../data/fixtures';
import type { SimilarThread } from '@forumkit/types';
import { callSummarise, callSuggest, callSuggestMetadata, callSurfaceRelated } from '../api/ai';
import { requestUploadUrl, putFile, confirmUpload } from '../api/attachments';
import { getMyProfile, updateMyProfile } from '../api/profile';
import { createThread } from '../api/threads';
import { useSession } from './use-session';

// ─── Types ──────────────────────────────────────────────────────────────────

export type View = 'feed' | 'thread' | 'profile' | 'compose';
export type FeedView = 'card' | 'compact';
export type FeedSort = 'Best' | 'Hot' | 'New' | 'Top' | 'Rising';
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
  communityId: string | null;
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
  collapsed: Record<number, boolean>;
  commentVotes: Record<number, VoteDir>;
  commentInput: string;
};

type FeedState = {
  view: FeedView;
  sort: FeedSort;
  votes: Record<string, VoteDir>;
  saved: Record<string, boolean>;
  openPostMenuId: string | null;
  sortMenuOpen: boolean;
  viewMenuOpen: boolean;
};

type State = {
  view: View;
  posts: FeedPost[];
  comments: CommentNodeData[];
  sidebar: { pinned: boolean };
  accountMenu: { open: boolean };
  feed: FeedState;
  thread: ThreadState;
  composer: ComposeState;
  asst: AsstState;
  profile: { activeTab: string; displayName: string; bio: string; socialLinks: SocialLink[]; avatarUrl: string | null; bannerUrl: string | null };
};

// ─── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_VIEW'; view: View }
  | { type: 'OPEN_THREAD'; postId: string }
  | { type: 'TOGGLE_SIDEBAR_PIN' }
  | { type: 'SET_ACCOUNT_MENU'; open: boolean }
  | { type: 'SET_FEED_VIEW'; view: FeedView }
  | { type: 'SET_FEED_SORT'; sort: FeedSort }
  | { type: 'TOGGLE_SORT_MENU' }
  | { type: 'TOGGLE_VIEW_MENU' }
  | { type: 'CLOSE_FEED_MENUS' }
  | { type: 'SET_POST_MENU'; postId: string | null }
  | { type: 'TOGGLE_SAVE_POST'; postId: string }
  | { type: 'VOTE_POST'; postId: string; dir: VoteDir }
  | { type: 'VOTE_COMMENT'; commentId: number; dir: VoteDir }
  | { type: 'SET_COMMENT_SORT'; sort: CommentSort }
  | { type: 'TOGGLE_COMMENT_COLLAPSED'; commentId: number }
  | { type: 'SET_COMMENT_INPUT'; value: string }
  | { type: 'SUBMIT_COMMENT'; newId: number }
  | { type: 'OPEN_COMPOSER' }
  | { type: 'CLOSE_COMPOSER' }
  | { type: 'SET_COMPOSER_TAB'; tab: ComposerTab }
  | { type: 'SET_COMPOSER_FIELD'; field: 'title' | 'tags' | 'body' | 'linkUrl'; value: string }
  | { type: 'SET_COMPOSER_COMMUNITY'; communityId: string }
  | { type: 'SET_COMPOSER_GEN'; field: 'genTitle' | 'genTags'; value: boolean }
  | { type: 'ADD_FILE'; file: AttachmentFile }
  | { type: 'UPDATE_FILE_URL'; id: number; url: string }
  | { type: 'UPDATE_ATTACHMENT_META'; id: number; caption: string; attachmentUrl: string }
  | { type: 'SET_ATTACHMENT_UPLOAD'; id: number; status: AttachmentFile['uploadStatus']; attachmentId?: string | null }
  | { type: 'REMOVE_FILE'; id: number }
  | { type: 'SUBMIT_COMPOSER_START' }
  | { type: 'SUBMIT_COMPOSER_SUCCESS'; post: FeedPost }
  | { type: 'SUBMIT_COMPOSER_ERROR'; message: string }
  | { type: 'SET_PROFILE_TAB'; tab: string }
  | { type: 'UPDATE_PROFILE'; displayName: string; bio: string; socialLinks: SocialLink[]; avatarUrl: string | null; bannerUrl: string | null }
  | { type: 'ASST_SUMMARIZING' }
  | { type: 'ASST_SUMMARY'; points: string[]; note: string }
  | { type: 'ASST_SUGGEST'; text: string }
  | { type: 'ASST_SURFACING' }
  | { type: 'ASST_RELATED'; threads: SimilarThread[] };

// ─── Reducer helpers ─────────────────────────────────────────────────────────

function mapComment(
  list: CommentNodeData[],
  id: number,
  fn: (c: CommentNodeData) => CommentNodeData,
): CommentNodeData[] {
  return list.map(c => {
    const next = c.id === id ? fn({ ...c }) : { ...c };
    if (next.replies.length > 0) next.replies = mapComment(next.replies, id, fn);
    return next;
  });
}

function nextVote(current: VoteDir, clicked: VoteDir): VoteDir {
  return current === clicked ? 0 : clicked;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Initial state ───────────────────────────────────────────────────────────

const initialState: State = {
  view: 'feed',
  posts: FEED_POSTS.slice(),
  comments: JSON.parse(JSON.stringify(COMMENTS)) as CommentNodeData[],
  sidebar: { pinned: false },
  accountMenu: { open: false },
  feed: {
    view: 'compact', sort: 'Best', votes: {}, saved: {},
    openPostMenuId: null, sortMenuOpen: false, viewMenuOpen: false,
  },
  thread: {
    activePostId: null, commentSort: 'Best', collapsed: {}, commentVotes: {}, commentInput: '',
  },
  composer: {
    open: false, activeTab: 'text', title: '', tags: '', body: '', linkUrl: '',
    communityId: null, attachments: [], genTitle: false, genTags: false, submitting: false, error: null,
  },
  asst: { summarizing: false, summary: null, suggested: false, surfacing: false, related: null },
  profile: { activeTab: 'Overview', displayName: '', bio: '', socialLinks: [], avatarUrl: null, bannerUrl: null },
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
    case 'TOGGLE_SORT_MENU':
      return { ...state, feed: { ...state.feed, sortMenuOpen: !state.feed.sortMenuOpen, viewMenuOpen: false } };
    case 'TOGGLE_VIEW_MENU':
      return { ...state, feed: { ...state.feed, viewMenuOpen: !state.feed.viewMenuOpen, sortMenuOpen: false } };
    case 'CLOSE_FEED_MENUS':
      return { ...state, feed: { ...state.feed, sortMenuOpen: false, viewMenuOpen: false, openPostMenuId: null } };
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
    case 'VOTE_POST': {
      const current = state.feed.votes[action.postId] ?? 0;
      const dir = nextVote(current, action.dir);
      const delta = dir - current;
      return {
        ...state,
        posts: state.posts.map(p => p.id === action.postId ? { ...p, votes: p.votes + delta } : p),
        feed: { ...state.feed, votes: { ...state.feed.votes, [action.postId]: dir } },
      };
    }
    case 'VOTE_COMMENT': {
      const current = state.thread.commentVotes[action.commentId] ?? 0;
      const dir = nextVote(current, action.dir);
      const delta = dir - current;
      return {
        ...state,
        comments: mapComment(state.comments, action.commentId, c => ({ ...c, votes: c.votes + delta })),
        thread: { ...state.thread, commentVotes: { ...state.thread.commentVotes, [action.commentId]: dir } },
      };
    }
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
    case 'SUBMIT_COMMENT': {
      const body = state.thread.commentInput.trim();
      if (!body) return state;
      const newComment: CommentNodeData = { id: action.newId, author: 'You', time: 'now', body, votes: 0, replies: [] };
      return {
        ...state,
        comments: [newComment, ...state.comments],
        thread: { ...state.thread, commentInput: '' },
      };
    }
    case 'OPEN_COMPOSER':
      return {
        ...state,
        view: 'compose',
        sidebar: { pinned: true },
        composer: {
          open: true, activeTab: 'text', title: '', tags: '', body: '', linkUrl: '',
          communityId: state.composer.communityId, attachments: [], genTitle: false, genTags: false,
          submitting: false, error: null,
        },
      };
    case 'CLOSE_COMPOSER':
      return { ...state, view: 'feed', composer: { ...state.composer, open: false } };
    case 'SET_COMPOSER_TAB':
      return { ...state, composer: { ...state.composer, activeTab: action.tab } };
    case 'SET_COMPOSER_FIELD':
      return { ...state, composer: { ...state.composer, [action.field]: action.value } };
    case 'SET_COMPOSER_COMMUNITY':
      return { ...state, composer: { ...state.composer, communityId: action.communityId } };
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
    case 'SET_PROFILE_TAB':
      return { ...state, profile: { ...state.profile, activeTab: action.tab } };
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, displayName: action.displayName, bio: action.bio, socialLinks: action.socialLinks, avatarUrl: action.avatarUrl, bannerUrl: action.bannerUrl } };
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

// ─── API base URL (module-level, safe for SSR) ───────────────────────────────

const FK_API_BASE = typeof window !== 'undefined'
  ? (window as Window & { FK_API_URL?: string }).FK_API_URL ?? ''
  : '';

// ─── ID counters (module-level, stable across renders) ───────────────────────

let _nextCommentId = 100;
function nextCommentId(): number { return _nextCommentId++; }
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
  const toggleSortMenu = useCallback(() => dispatch({ type: 'TOGGLE_SORT_MENU' }), []);
  const toggleViewMenu = useCallback(() => dispatch({ type: 'TOGGLE_VIEW_MENU' }), []);
  const closeFeedMenus = useCallback(() => dispatch({ type: 'CLOSE_FEED_MENUS' }), []);
  const setPostMenu = useCallback((postId: string | null) => dispatch({ type: 'SET_POST_MENU', postId }), []);
  const toggleSavePost = useCallback((postId: string) => dispatch({ type: 'TOGGLE_SAVE_POST', postId }), []);
  const votePost = useCallback((postId: string, dir: VoteDir) => dispatch({ type: 'VOTE_POST', postId, dir }), []);
  const voteComment = useCallback((commentId: number, dir: VoteDir) => dispatch({ type: 'VOTE_COMMENT', commentId, dir }), []);
  const setCommentSort = useCallback((sort: CommentSort) => dispatch({ type: 'SET_COMMENT_SORT', sort }), []);
  const toggleCommentCollapsed = useCallback((commentId: number) => dispatch({ type: 'TOGGLE_COMMENT_COLLAPSED', commentId }), []);
  const setCommentInput = useCallback((value: string) => dispatch({ type: 'SET_COMMENT_INPUT', value }), []);
  const submitComment = useCallback(() => dispatch({ type: 'SUBMIT_COMMENT', newId: nextCommentId() }), []);
  const openComposer = useCallback(() => dispatch({ type: 'OPEN_COMPOSER' }), []);
  const closeComposer = useCallback(() => dispatch({ type: 'CLOSE_COMPOSER' }), []);
  const setComposerTab = useCallback((tab: ComposerTab) => dispatch({ type: 'SET_COMPOSER_TAB', tab }), []);
  const setComposerField = useCallback(
    (field: 'title' | 'tags' | 'body' | 'linkUrl', value: string) => dispatch({ type: 'SET_COMPOSER_FIELD', field, value }),
    [],
  );
  const setComposerCommunity = useCallback((communityId: string) => dispatch({ type: 'SET_COMPOSER_COMMUNITY', communityId }), []);
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
    // picked (used for the composer preview) — reuse that directly as the
    // post's image rather than waiting on a separate fetch of the uploaded
    // copy. The real upload to storage still happens in the background via
    // uploadAttachment; this only decides what gets rendered.
    const previewImage = state.composer.attachments.find(a => a.kind === 'image' && a.url)?.url ?? null;

    dispatch({ type: 'SUBMIT_COMPOSER_START' });
    try {
      const thread = await createThread(forumId, { title, body, tagIds: [] }, sessionToken);
      const newPost: FeedPost = {
        id: thread.id,
        communityId: state.composer.communityId ?? COMMUNITIES[0]?.id ?? forumId,
        author: 'You',
        time: 'now',
        title: thread.title,
        snippet: thread.body.slice(0, 160) || thread.title,
        body: thread.body,
        thumbGradient: 'linear-gradient(135deg,#3f7ee2,#7b5cff)',
        imageUrl: previewImage,
        domain: isLink ? linkUrl || null : null,
        votes: 0,
        commentCount: 0,
        saved: false,
      };
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
      avatarUrl = `${FK_API_BASE}/storage/local/download/${att.storageKey}`;
    }

    if (fields.bannerBlob) {
      const bannerFile = new File([fields.bannerBlob], 'banner.jpg', { type: 'image/jpeg' });
      const up = await requestUploadUrl(forumId, 'banner.jpg', 'image/jpeg', bannerFile.size, sessionToken);
      await putFile(up.uploadUrl, up.uploadHeaders, bannerFile);
      const att = await confirmUpload(forumId, up.attachmentId, { width: 1200, height: 300 }, sessionToken);
      bannerUrl = `${FK_API_BASE}/storage/local/download/${att.storageKey}`;
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
        displayName: profile.displayName,
        bio: profile.bio ?? '',
        socialLinks: clientLinks,
        avatarUrl: profile.avatarUrl,
        bannerUrl: profile.bannerUrl,
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const sortedPosts = state.posts.slice();
  if (state.feed.sort === 'New') {
    sortedPosts.reverse();
  } else if (state.feed.sort === 'Top') {
    sortedPosts.sort((a, b) => b.votes - a.votes);
  }
  // Best/Hot/Rising fall back to the fixture's natural order (no live signals to rank by yet).

  function sortComments(list: CommentNodeData[], mode: CommentSort): CommentNodeData[] {
    const sorted = list.slice();
    if (mode === 'Best' || mode === 'Top') sorted.sort((a, b) => b.votes - a.votes);
    else if (mode === 'Controversial') sorted.sort((a, b) => Math.abs(a.votes) - Math.abs(b.votes));
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
    communities: COMMUNITIES,
    latestItems: LATEST_ITEMS,
    similarItems: SIMILAR_ITEMS,
    trendingItems: TRENDING_ITEMS,
    setView,
    openThread,
    toggleSidebarPin,
    setAccountMenu,
    setFeedView,
    setFeedSort,
    toggleSortMenu,
    toggleViewMenu,
    closeFeedMenus,
    setPostMenu,
    toggleSavePost,
    votePost,
    voteComment,
    setCommentSort,
    toggleCommentCollapsed,
    setCommentInput,
    submitComment,
    openComposer,
    closeComposer,
    setComposerTab,
    setComposerField,
    setComposerCommunity,
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

export type { FeedPost, CommentNodeData, Community, RailItem };
