import { useEffect, useRef, useState } from 'react';

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
