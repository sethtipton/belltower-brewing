import { useEffect, useState } from 'react';

export default function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);

  useEffect(() => {
    const mq = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    const handler = () => setPrefers(Boolean(mq?.matches));
    handler();

    if (mq?.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    if (mq?.addListener) {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
    return undefined;
  }, []);

  return prefers;
}
