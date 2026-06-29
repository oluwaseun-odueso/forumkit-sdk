import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import {
  SEED_THREAD, REACTION_TYPES, DIRECTORY,
  type ThreadData, type ReplyData, type DirectoryEntry,
} from '../data/seed';
import { callSummarise, callSuggest } from '../api/ai';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Sort = 'top' | 'new' | 'old';

export type AttachmentFile = {
  id: number;
  name: string;
  kind: 'image' | 'video' | 'file';
  sizeLabel: string;
  url: string | null;
};

type ComposeState = {
  open: boolean;
  title: string;
  tags: string;
  body: string;
  attachments: AttachmentFile[];
  genTitle: boolean;
  genTags: boolean;
};

type AsstState = {
  summarizing: boolean;
  summary: string[] | null;
  suggested: boolean;
};

type NavState = {
  mode: 'search' | 'tag' | null;
  tag: string;
  query: string;
};

type ReplyInProgress = { id: number; text: string };

type State = {
  thread: ThreadData;
  input: string;
  reply: ReplyInProgress | null;
  reactPicker: number | null;
  sort: Sort;
  sidebar: boolean;
  nav: NavState;
  compose: ComposeState;
  asst: AsstState;
  directory: DirectoryEntry[];
};

// ─── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'UPVOTE_POST' }
  | { type: 'UPVOTE_REPLY'; id: number }
  | { type: 'TOGGLE_REACTION'; id: number; key: string }
  | { type: 'TOGGLE_PICKER'; id: number }
  | { type: 'OPEN_REPLY'; id: number }
  | { type: 'SET_REPLY_TEXT'; text: string }
  | { type: 'CANCEL_REPLY' }
  | { type: 'SUBMIT_REPLY'; newId: number }
  | { type: 'SET_INPUT'; value: string }
  | { type: 'POST_REPLY'; newId: number }
  | { type: 'ACCEPT_REPLY'; id: number }
  | { type: 'SET_SIDEBAR'; open: boolean }
  | { type: 'OPEN_SEARCH' }
  | { type: 'OPEN_TAG'; tag: string }
  | { type: 'CLOSE_NAV' }
  | { type: 'SET_NAV_QUERY'; query: string }
  | { type: 'OPEN_COMPOSE' }
  | { type: 'CLOSE_COMPOSE' }
  | { type: 'SET_COMPOSE_FIELD'; field: 'title' | 'tags' | 'body'; value: string }
  | { type: 'SET_COMPOSE_GEN'; field: 'genTitle' | 'genTags'; value: boolean }
  | { type: 'ADD_FILE'; file: AttachmentFile }
  | { type: 'UPDATE_FILE_URL'; id: number; url: string }
  | { type: 'REMOVE_FILE'; id: number }
  | { type: 'SUBMIT_COMPOSE' }
  | { type: 'SET_SORT'; sort: Sort }
  | { type: 'ASST_SUMMARIZING' }
  | { type: 'ASST_SUMMARY'; points: string[] }
  | { type: 'ASST_SUGGEST'; text: string };

// ─── Reducer helpers ─────────────────────────────────────────────────────────

function mapReplies(
  list: ReplyData[],
  id: number,
  fn: (r: ReplyData) => ReplyData,
): ReplyData[] {
  return list.map(x => {
    const y = x.id === id ? fn({ ...x }) : { ...x };
    if (y.children.length > 0) {
      y.children = mapReplies(y.children, id, fn);
    }
    return y;
  });
}

function mapEvery(list: ReplyData[], fn: (r: ReplyData) => ReplyData): ReplyData[] {
  return list.map(x => {
    const y = fn({ ...x });
    if (y.children.length > 0) {
      y.children = mapEvery(y.children, fn);
    }
    return y;
  });
}

function findReply(list: ReplyData[], id: number): ReplyData | null {
  for (const x of list) {
    if (x.id === id) return x;
    const found = findReply(x.children, id);
    if (found !== null) return found;
  }
  return null;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Initial state ───────────────────────────────────────────────────────────

const initialState: State = {
  thread: JSON.parse(JSON.stringify(SEED_THREAD)) as ThreadData,
  input: '',
  reply: null,
  reactPicker: null,
  sort: 'top',
  sidebar: false,
  nav: { mode: null, tag: '', query: '' },
  compose: {
    open: false, title: '', tags: '', body: '',
    attachments: [], genTitle: false, genTags: false,
  },
  asst: { summarizing: false, summary: null, suggested: false },
  directory: DIRECTORY.slice(),
};

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'UPVOTE_POST': {
      const post = { ...state.thread.post };
      post.voted = !post.voted;
      post.votes += post.voted ? 1 : -1;
      return { ...state, thread: { ...state.thread, post } };
    }
    case 'UPVOTE_REPLY':
      return {
        ...state,
        thread: {
          ...state.thread,
          replies: mapReplies(state.thread.replies, action.id, r => {
            r.voted = !r.voted;
            r.votes += r.voted ? 1 : -1;
            return r;
          }),
        },
      };
    case 'TOGGLE_REACTION': {
      const meta = REACTION_TYPES.find(r => r.key === action.key);
      return {
        ...state,
        reactPicker: null,
        thread: {
          ...state.thread,
          replies: mapReplies(state.thread.replies, action.id, r => {
            const rxs = r.reactions.slice();
            const idx = rxs.findIndex(x => x.key === action.key);
            if (idx < 0) {
              rxs.push({ key: action.key, glyph: meta?.glyph ?? '', label: meta?.label ?? '', count: 1, on: true });
            } else {
              const cur = rxs[idx];
              if (cur !== undefined) {
                const on = !cur.on;
                const count = cur.count + (on ? 1 : -1);
                if (count <= 0) rxs.splice(idx, 1);
                else rxs[idx] = { ...cur, on, count };
              }
            }
            r.reactions = rxs;
            return r;
          }),
        },
      };
    }
    case 'TOGGLE_PICKER':
      return {
        ...state,
        reactPicker: state.reactPicker === action.id ? null : action.id,
      };
    case 'OPEN_REPLY':
      return { ...state, reply: { id: action.id, text: '' }, reactPicker: null };
    case 'SET_REPLY_TEXT':
      return state.reply !== null
        ? { ...state, reply: { ...state.reply, text: action.text } }
        : state;
    case 'CANCEL_REPLY':
      return { ...state, reply: null };
    case 'SUBMIT_REPLY': {
      if (state.reply === null) return state;
      const { id, text } = state.reply;
      const body = text.trim();
      if (!body) return state;
      const newReply: ReplyData = {
        id: action.newId, author: 'You', time: 'now', body,
        votes: 0, voted: false, reactions: [], children: [], accepted: false,
      };
      return {
        ...state,
        reply: null,
        thread: {
          ...state.thread,
          replies: mapReplies(state.thread.replies, id, r => {
            r.children = [...r.children, newReply];
            return r;
          }),
        },
      };
    }
    case 'SET_INPUT':
      return { ...state, input: action.value };
    case 'POST_REPLY': {
      const body = state.input.trim();
      if (!body) return state;
      const newReply: ReplyData = {
        id: action.newId, author: 'You', time: 'now', body,
        votes: 0, voted: false, reactions: [], children: [], accepted: false,
      };
      return {
        ...state,
        input: '',
        asst: { ...state.asst, suggested: false },
        thread: { ...state.thread, replies: [...state.thread.replies, newReply] },
      };
    }
    case 'ACCEPT_REPLY': {
      const cur = findReply(state.thread.replies, action.id);
      const willAccept = cur === null || !cur.accepted;
      return {
        ...state,
        thread: {
          ...state.thread,
          replies: mapEvery(state.thread.replies, r => ({
            ...r, accepted: r.id === action.id ? willAccept : false,
          })),
        },
      };
    }
    case 'SET_SIDEBAR':
      return { ...state, sidebar: action.open };
    case 'OPEN_SEARCH':
      return { ...state, sidebar: false, nav: { mode: 'search', tag: '', query: '' } };
    case 'OPEN_TAG':
      return { ...state, sidebar: false, nav: { mode: 'tag', tag: action.tag, query: '' } };
    case 'CLOSE_NAV':
      return { ...state, nav: { mode: null, tag: '', query: '' } };
    case 'SET_NAV_QUERY':
      return { ...state, nav: { ...state.nav, query: action.query } };
    case 'OPEN_COMPOSE':
      return {
        ...state,
        sidebar: false,
        compose: { open: true, title: '', tags: '', body: '', attachments: [], genTitle: false, genTags: false },
      };
    case 'CLOSE_COMPOSE':
      return { ...state, compose: { ...state.compose, open: false } };
    case 'SET_COMPOSE_FIELD':
      return { ...state, compose: { ...state.compose, [action.field]: action.value } };
    case 'SET_COMPOSE_GEN':
      return { ...state, compose: { ...state.compose, [action.field]: action.value } };
    case 'ADD_FILE':
      return { ...state, compose: { ...state.compose, attachments: [...state.compose.attachments, action.file] } };
    case 'UPDATE_FILE_URL':
      return {
        ...state,
        compose: {
          ...state.compose,
          attachments: state.compose.attachments.map(a =>
            a.id === action.id ? { ...a, url: action.url } : a,
          ),
        },
      };
    case 'REMOVE_FILE':
      return {
        ...state,
        compose: {
          ...state.compose,
          attachments: state.compose.attachments.filter(a => a.id !== action.id),
        },
      };
    case 'SUBMIT_COMPOSE': {
      const title = state.compose.title.trim();
      if (!title) return state;
      const tags = state.compose.tags
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);
      const entry: DirectoryEntry = {
        id: `u${Date.now()}`,
        title,
        author: 'You',
        tags: tags.length > 0 ? tags : ['general'],
        votes: 0,
        replies: 0,
        time: 'now',
        preview: state.compose.body.trim().slice(0, 120) || title,
      };
      return {
        ...state,
        directory: [entry, ...state.directory],
        compose: { open: false, title: '', tags: '', body: '', attachments: [], genTitle: false, genTags: false },
      };
    }
    case 'SET_SORT':
      return { ...state, sort: action.sort };
    case 'ASST_SUMMARIZING':
      return { ...state, asst: { ...state.asst, summarizing: true, summary: null } };
    case 'ASST_SUMMARY':
      return { ...state, asst: { ...state.asst, summarizing: false, summary: action.points } };
    case 'ASST_SUGGEST':
      return { ...state, input: action.text, asst: { ...state.asst, suggested: true } };
    default:
      return state;
  }
}

// ─── ID counter (module-level, stable across renders) ────────────────────────

let _nextId = 100;
function nextId(): number { return _nextId++; }

// ─── Hook ────────────────────────────────────────────────────────────────────

function useForumStateInternal() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const upvotePost = useCallback(() => dispatch({ type: 'UPVOTE_POST' }), []);
  const upvoteReply = useCallback((id: number) => dispatch({ type: 'UPVOTE_REPLY', id }), []);
  const toggleReaction = useCallback((id: number, key: string) => dispatch({ type: 'TOGGLE_REACTION', id, key }), []);
  const togglePicker = useCallback((id: number) => dispatch({ type: 'TOGGLE_PICKER', id }), []);
  const openReply = useCallback((id: number) => dispatch({ type: 'OPEN_REPLY', id }), []);
  const setReplyText = useCallback((text: string) => dispatch({ type: 'SET_REPLY_TEXT', text }), []);
  const cancelReply = useCallback(() => dispatch({ type: 'CANCEL_REPLY' }), []);
  const submitReply = useCallback(() => dispatch({ type: 'SUBMIT_REPLY', newId: nextId() }), []);
  const setInput = useCallback((value: string) => dispatch({ type: 'SET_INPUT', value }), []);
  const postReply = useCallback(() => dispatch({ type: 'POST_REPLY', newId: nextId() }), []);
  const acceptReply = useCallback((id: number) => dispatch({ type: 'ACCEPT_REPLY', id }), []);
  const setSidebar = useCallback((open: boolean) => dispatch({ type: 'SET_SIDEBAR', open }), []);
  const openSearch = useCallback(() => dispatch({ type: 'OPEN_SEARCH' }), []);
  const openTag = useCallback((tag: string) => dispatch({ type: 'OPEN_TAG', tag }), []);
  const closeNav = useCallback(() => dispatch({ type: 'CLOSE_NAV' }), []);
  const setNavQuery = useCallback((query: string) => dispatch({ type: 'SET_NAV_QUERY', query }), []);
  const openCompose = useCallback(() => dispatch({ type: 'OPEN_COMPOSE' }), []);
  const closeCompose = useCallback(() => dispatch({ type: 'CLOSE_COMPOSE' }), []);
  const setComposeField = useCallback((field: 'title' | 'tags' | 'body', value: string) => dispatch({ type: 'SET_COMPOSE_FIELD', field, value }), []);
  const removeFile = useCallback((id: number) => dispatch({ type: 'REMOVE_FILE', id }), []);
  const submitCompose = useCallback(() => dispatch({ type: 'SUBMIT_COMPOSE' }), []);
  const setSort = useCallback((sort: Sort) => dispatch({ type: 'SET_SORT', sort }), []);

  const addFiles = useCallback((fileList: FileList) => {
    Array.from(fileList).forEach(file => {
      const id = nextId();
      const kind: AttachmentFile['kind'] = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video' : 'file';
      dispatch({ type: 'ADD_FILE', file: { id, name: file.name, kind, sizeLabel: fmtSize(file.size), url: null } });
      if (kind !== 'file') {
        const reader = new FileReader();
        reader.onload = e => {
          const url = e.target?.result;
          if (typeof url === 'string') dispatch({ type: 'UPDATE_FILE_URL', id, url });
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const summarize = useCallback(async () => {
    if (state.asst.summarizing) return;
    dispatch({ type: 'ASST_SUMMARIZING' });
    const [points] = await Promise.all([
      callSummarise('demo'),
      new Promise<void>(resolve => setTimeout(resolve, 1400)),
    ]);
    dispatch({ type: 'ASST_SUMMARY', points });
  }, [state.asst.summarizing]);

  const suggest = useCallback(async () => {
    const text = await callSuggest('demo');
    dispatch({ type: 'ASST_SUGGEST', text });
  }, []);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const sortedReplies = state.thread.replies.slice();
  if (state.sort === 'top') {
    sortedReplies.sort((a, b) =>
      (b.accepted ? 1 : 0) - (a.accepted ? 1 : 0) || b.votes - a.votes,
    );
  } else if (state.sort === 'new') {
    sortedReplies.sort((a, b) => b.id - a.id);
  } else {
    sortedReplies.sort((a, b) => a.id - b.id);
  }

  function countAll(replies: ReplyData[]): number {
    return replies.reduce((n, r) => n + 1 + countAll(r.children), 0);
  }
  const totalReplies = countAll(state.thread.replies);

  const tagCounts: Record<string, number> = {};
  for (const t of state.directory) {
    for (const g of t.tags) {
      tagCounts[g] = (tagCounts[g] ?? 0) + 1;
    }
  }
  const tagNames = Object.keys(tagCounts).sort((a, b) => (tagCounts[b] ?? 0) - (tagCounts[a] ?? 0));

  const navResults = (() => {
    const { mode, tag, query } = state.nav;
    if (mode === 'tag') return state.directory.filter(t => t.tags.includes(tag));
    if (mode === 'search') {
      const q = query.trim().toLowerCase();
      if (!q) return state.directory.slice();
      return state.directory.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q) ||
        t.tags.some(g => g.toLowerCase().includes(q)),
      );
    }
    return [];
  })();

  return {
    state,
    sortedReplies,
    totalReplies,
    tagNames,
    tagCounts,
    navResults,
    upvotePost,
    upvoteReply,
    toggleReaction,
    togglePicker,
    openReply,
    setReplyText,
    cancelReply,
    submitReply,
    setInput,
    postReply,
    acceptReply,
    setSidebar,
    openSearch,
    openTag,
    closeNav,
    setNavQuery,
    openCompose,
    closeCompose,
    setComposeField,
    addFiles,
    removeFile,
    submitCompose,
    setSort,
    summarize,
    suggest,
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

export type { AttachmentFile as Attachment, Sort as SortOrder };
