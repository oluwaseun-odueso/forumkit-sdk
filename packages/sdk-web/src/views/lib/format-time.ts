// Re-export from the shared single source of truth. Kept as a local module so
// the existing `../lib/format-time` import sites don't need to change.
export { fmtRelativeTime } from '@forumkit/shared';
