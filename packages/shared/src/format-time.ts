// Relative timestamp formatter — the single source of truth shared by the web
// and mobile SDKs. (sdk-web's views/lib/format-time.ts now re-exports this;
// sdk-web's use-forum-state.tsx no longer keeps its own private copy.)
export function fmtRelativeTime(iso: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
