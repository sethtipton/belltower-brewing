import { useEffect, useMemo, useRef } from 'react';
import { createLogger } from '../logger';

const log = createLogger('workerPool');

/**
 * Lightweight worker pool for color calculation.
 * @param {string} path
 */
export function useWorkerPool(path = 'worker/colorWorker.js') {
  /** @type {import('react').MutableRefObject<Worker | null>} */
  const workerRef = useRef(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL(`../${path}`, import.meta.url), { type: 'module' });
    } catch (err) {
      log.warn('init.failed', { phase: 'workerPool', error: err instanceof Error ? err.message : String(err) });
      workerRef.current = null;
    }
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, [path]);

  const runJob = useMemo(() => {
    return (payload) =>
      new Promise((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          resolve(null); // fallback: do nothing if worker missing
          return;
        }

        /** @param {MessageEvent<unknown>} event */
        const handleMessage = (event) => {
          resolve(event.data ?? null);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
        };

        /** @param {ErrorEvent | Event | unknown} err */
        const handleError = (err) => {
          const message = err instanceof Error
            ? err
            : (err && typeof err === 'object' && 'message' in err)
              ? new Error(String((/** @type {Record<string, unknown>} */ (err)).message))
              : new Error('Worker error');
          reject(message);
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
        };

        worker.addEventListener('message', handleMessage);
        worker.addEventListener('error', handleError);
        worker.postMessage(payload ?? null);
      });
  }, []);

  return { runJob };
}
