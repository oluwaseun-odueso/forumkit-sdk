import { useState, useCallback, useEffect, useRef } from 'react';

const PREFERRED_VOICE_RE = /samantha|karen|victoria|kate|fiona/i;

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => v.lang.startsWith('en') && v.localService && PREFERRED_VOICE_RE.test(v.name)) ??
    voices.find(v => v.lang.startsWith('en') && v.localService) ??
    voices.find(v => v.lang.startsWith('en')) ??
    voices[0] ??
    null
  );
}

export function useSpeech(): {
  speak: (text: string) => void;
  stop: () => void;
  speaking: boolean;
  supported: boolean;
} {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);
  // Forces a re-render when voices load in Chrome (async voiceschanged event)
  const [, setVoicesReady] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported) return;
    const onVoicesChanged = () => setVoicesReady(true);
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
  }, [supported]);

  useEffect(() => {
    return () => { if (supported) window.speechSynthesis.cancel(); };
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback((text: string) => {
    if (!supported || !text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.0;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  }, [supported]);

  return { speak, stop, speaking, supported };
}
