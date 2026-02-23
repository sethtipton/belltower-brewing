import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export default function usePrefersReducedMotion() {
  // framer hook covers most cases
  const framerPref = useReducedMotion();
  const [prefers, setPrefers] = useState(framerPref);

  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    const handler = () => setPrefers(mq?.matches ?? framerPref);
    handler();
    if (mq?.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq?.removeEventListener('change', handler);
    }
    return undefined;
  }, [framerPref]);

  return prefers;
}
