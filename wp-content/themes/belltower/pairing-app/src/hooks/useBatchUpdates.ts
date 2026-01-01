import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Debounce/coalesce incoming values before applying to state.
 */
export function useBatchUpdates<T>(value: T, delay = 300): [T, (next: T) => void] {
  const [state, setState] = useState<T>(value);
  type TimerHandle = ReturnType<typeof globalThis.setTimeout>;
  const timer = useRef<TimerHandle | null>(null);
  const prevArray = useRef<T | null>(value);
  const setTimer = typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout : undefined;
  const clearTimer = typeof globalThis.clearTimeout === 'function' ? globalThis.clearTimeout : undefined;

  useEffect(() => {
    // If arrays are equivalent, skip scheduling.
    if (Array.isArray(value) && Array.isArray(prevArray.current)) {
      const same = value.length === prevArray.current.length && value.every((v, idx) => v === (prevArray.current as unknown[])[idx]);
      if (same) return;
    }
    prevArray.current = value;
    if (timer.current && clearTimer) {
      clearTimer(timer.current);
    }
    timer.current = setTimer ? setTimer(() => {
      setState(value);
    }, delay) : null;
    return () => {
      if (timer.current && clearTimer) {
        clearTimer(timer.current);
      }
    };
  }, [value, delay]);

  const setImmediate = useCallback((next: T) => {
    if (timer.current && clearTimer) {
      clearTimer(timer.current);
    }
    setState(next);
  }, []);

  return [state, setImmediate];
}
