import { useRef } from 'react';

export default function usePerfMarks(prefix = 'pairing') {
  const lastMeasure = useRef(null);

  const markStart = () => {
    try {
      performance.mark(`${prefix}-start`);
    } catch {
      // ignore
    }
  };

  const markEnd = () => {
    try {
      performance.mark(`${prefix}-end`);
      performance.measure(`${prefix}-dur`, `${prefix}-start`, `${prefix}-end`);
      const [entry] = performance.getEntriesByName(`${prefix}-dur`).slice(-1);
      lastMeasure.current = entry ? entry.duration : null;
    } catch {
      // ignore
    }
  };

  return { markStart, markEnd, lastMeasure };
}
