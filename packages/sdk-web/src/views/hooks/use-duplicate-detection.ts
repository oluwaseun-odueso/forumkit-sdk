import { useCallback, useEffect, useState } from 'react';
import type { SimilarThread } from '@forumkit/types';
import { findDuplicateThreads } from '../api/threads';

export function useDuplicateDetection(
  title: string,
  body: string,
  forumId: string,
  sessionToken: string | undefined,
  open: boolean,
): { duplicates: SimilarThread[]; checking: boolean; dismiss: () => void } {
  const [duplicates, setDuplicates] = useState<SimilarThread[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const trimmedTitle = title.trim();
    if (!open || trimmedTitle.length < 10 || !forumId) {
      setDuplicates([]);
      setChecking(false);
      return;
    }
    setChecking(true);
    const trimmedBody = body.trim().slice(0, 2000) || undefined;
    const timer = window.setTimeout(() => {
      findDuplicateThreads(forumId, trimmedTitle, trimmedBody, sessionToken)
        .then(items => { setDuplicates(items); setChecking(false); })
        .catch(() => { setDuplicates([]); setChecking(false); });
    }, 600);
    return () => { window.clearTimeout(timer); setChecking(false); };
  }, [title, body, open, forumId, sessionToken]);

  const dismiss = useCallback(() => setDuplicates([]), []);

  return { duplicates, checking, dismiss };
}
