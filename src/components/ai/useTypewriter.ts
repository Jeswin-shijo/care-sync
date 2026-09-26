import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from '../common/Motion';

/**
 * Word-by-word reveal for the newest AI answer ("streaming"). Returns the
 * visible slice plus `skip()` (tap-to-finish). Reduced motion — or
 * `enabled = false` — shows the full text immediately.
 */
export const useTypewriter = (text: string, enabled: boolean, msPerWord = 20, onDone?: () => void) => {
  const reduced = useReducedMotion();
  const active = enabled && !reduced;
  // Words and the whitespace after them, so line breaks and bullets survive.
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const [count, setCount] = useState(active ? 0 : tokens.length);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active) {
      setCount(tokens.length);
      return;
    }
    setCount(0);
    const id = setInterval(() => {
      setCount((c) => {
        const next = c + 2;
        if (next >= tokens.length) {
          clearInterval(id);
          return tokens.length;
        }
        return next;
      });
    }, msPerWord);
    return () => clearInterval(id);
  }, [tokens, active, msPerWord]);

  const done = count >= tokens.length;

  useEffect(() => {
    if (done && enabled) onDoneRef.current?.();
  }, [done, enabled]);

  const skip = useCallback(() => setCount(tokens.length), [tokens.length]);

  const shown = done ? text : tokens.slice(0, count).join('');
  return { shown, done, skip, streaming: !done };
};

/** Session memory of answers that already streamed, so re-mounts don't replay them. */
const streamed = new Set<string>();

export const hasStreamed = (id: string) => streamed.has(id);
export const markStreamed = (id: string) => {
  streamed.add(id);
};

/** Only brand-new answers stream; anything older than this just renders. */
export const STREAM_WINDOW_MS = 30000;

export const shouldStream = (id: string, createdAt?: number) =>
  !streamed.has(id) && (createdAt === undefined || Date.now() - createdAt < STREAM_WINDOW_MS);
