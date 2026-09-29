import { useEffect, useRef, useState } from 'react';

// Reveals each item one at a time — item 0 finishes before item 1 begins.
export function useSequentialTyping(items: string[], speed = 18): string[] {
  const [displayed, setDisplayed] = useState<string[]>(() => items.map(() => ''));
  const itemsRef = useRef(items);
  const activeIdxRef = useRef(0);
  itemsRef.current = items;

  useEffect(() => {
    const intervalId = { current: 0 as ReturnType<typeof setInterval> };
    intervalId.current = setInterval(() => {
      const idx = activeIdxRef.current;
      const targets = itemsRef.current;
      if (idx >= targets.length) { clearInterval(intervalId.current); return; }
      setDisplayed(prev => {
        const currentShown = prev[idx] ?? '';
        const target = targets[idx] ?? '';
        if (currentShown.length >= target.length) {
          activeIdxRef.current = idx + 1;
          return prev;
        }
        const next = [...prev];
        next[idx] = target.slice(0, currentShown.length + 1);
        return next;
      });
    }, speed);
    return () => clearInterval(intervalId.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return displayed;
}

export function useTypingEffect(target: string | null, speed = 18): string {
  const [displayed, setDisplayed] = useState('');
  const targetRef = useRef('');

  targetRef.current = target ?? '';

  useEffect(() => {
    if (!target) { setDisplayed(''); return; }

    const id = setInterval(() => {
      setDisplayed(prev => {
        const full = targetRef.current;
        if (prev.length >= full.length) return prev;
        return full.slice(0, prev.length + 1);
      });
    }, speed);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!target, speed]);

  return displayed;
}
