import { useEffect, useRef } from 'react';

/**
 * Fires `onLoadMore` once whenever a sentinel element scrolls into view.
 * Returns the ref to attach to that sentinel (typically an empty div placed
 * right after the last item in a list).
 */
export function useInfiniteScroll(onLoadMore: () => void, enabled: boolean): React.RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!enabled) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) onLoadMoreRef.current();
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [enabled]);

  return sentinelRef;
}
