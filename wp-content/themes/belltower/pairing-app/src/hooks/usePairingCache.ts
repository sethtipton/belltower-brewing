import { useCallback, useEffect, useRef, useState } from 'react';
import { getCachedPairing, refreshPairing, PairingResponse, PAIRING_STORAGE_KEY } from '../api/pairing';

interface CacheRecord {
  data: PairingResponse;
  fetchedAt: number;
}

function readSession(): CacheRecord | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PAIRING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CacheRecord) : null;
  } catch {
    return null;
  }
}

function writeSession(record: CacheRecord) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(PAIRING_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore quota errors
  }
}

export function usePairingCache() {
  const initialRecord = useRef<CacheRecord | null>(readSession()).current;
  const [pairing, setPairingState] = useState<PairingResponse | null>(initialRecord?.data ?? null);
  const [lastFetched, setLastFetched] = useState<number | null>(initialRecord?.fetchedAt ?? null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(initialRecord ? 'success' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(initialRecord ? true : false);
  const isMounted = useRef(true);

  useEffect(() => () => { isMounted.current = false; }, []);

  const setPairing = useCallback((data: PairingResponse | null) => {
    setPairingState(data);
    const fetchedAt = Date.now();
    setLastFetched(data ? fetchedAt : null);
    setAvailable(!!data);
    setStatus(data ? 'success' : 'idle');
    if (data) {
      writeSession({ data, fetchedAt });
    } else if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(PAIRING_STORAGE_KEY);
    }
  }, []);

  const refresh = useCallback(
    async (force = false) => {
      setStatus('loading');
      setError(null);
      try {
        const data = await refreshPairing(force);
        if (!isMounted.current) return null;
        const rec = { data, fetchedAt: Date.now() };
        writeSession(rec);
        setPairingState(data);
        setLastFetched(rec.fetchedAt);
        setAvailable(true);
        setStatus('success');
        return data;
      } catch (err) {
        if (!isMounted.current) return null;
        const msg = (err as Error).message || '';
        if (msg.includes('404')) {
          setAvailable(false);
          setStatus('idle');
          return null;
        }
        setAvailable(false);
        setStatus('error');
        setError(msg);
        throw err;
      }
    },
    []
  );

  const clear = useCallback(() => {
    setPairingState(null);
    setLastFetched(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(PAIRING_STORAGE_KEY);
    }
  }, []);

  // Initialize from sessionStorage, then try server if missing.
  useEffect(() => {
    if (initialRecord) return;
    void (async () => {
      setStatus('loading');
      try {
        const data = await getCachedPairing();
        if (!isMounted.current) return;
        if (data) {
          const rec = { data, fetchedAt: Date.now() };
          writeSession(rec);
          setPairingState(data);
          setLastFetched(rec.fetchedAt);
          setAvailable(true);
          setStatus('success');
        } else {
          setAvailable(false);
          setStatus('idle');
        }
      } catch (err) {
        if (!isMounted.current) return;
        const msg = (err as Error).message || '';
        if (msg.includes('404')) {
          setAvailable(false);
          setStatus('idle');
          return;
        }
        setAvailable(false);
        setStatus('error');
        setError(msg);
      }
    })();
  }, [initialRecord]);

  return { pairing, lastFetched, status, error, setPairing, refresh, clear, available };
}
