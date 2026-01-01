import React, { useState, type ReactElement } from 'react';
import { PairingMatch, PairingResponse } from '../api/pairing';
import { usePairingCache } from '../hooks/usePairingCache';

interface PairingFetcherProps {
  onPairing?: (data: PairingResponse | null) => void;
  onFetch?: () => Promise<PairingResponse | null | undefined> | PairingResponse | null | undefined;
  status?: 'idle' | 'loading' | 'success' | 'error';
  errorMessage?: string | null;
  lastFetched?: number | null;
  pairingsReady?: boolean;
}

function parseHistory(text?: string | null): string[] {
  if (!text) return [];
  if (typeof document !== 'undefined' && text.includes('<p')) {
    const div = document.createElement('div');
    div.innerHTML = text;
    return Array.from(div.querySelectorAll('p'))
      .map((p) => p.textContent || '')
      .filter(Boolean)
      .slice(0, 3);
  }
  return text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function PairingFetcher({
  onPairing,
  onFetch,
  status: upstreamStatus,
  errorMessage,
  lastFetched,
  pairingsReady = false,
}: PairingFetcherProps): ReactElement {
  const { pairing, lastFetched: cacheFetched, status, error, refresh } = usePairingCache();
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const mergedStatus = upstreamStatus ?? status;
  const mergedError = errorMessage ?? error;
  const mergedFetched = lastFetched ?? cacheFetched;

  const doFetch = async () => {
    if (typeof onFetch === 'function') {
      const data = await onFetch();
      if (typeof onPairing === 'function') {
        onPairing(data ?? null);
      }
      return;
    }
    try {
      const data = await refresh(true);
      if (typeof onPairing === 'function') {
        onPairing(data ?? null);
      }
    } catch {
      // handled in hook
    }
  };

  const matches: PairingMatch[] = Array.isArray(pairing?.matches) ? pairing.matches : [];

  return (
    <div className="pairing-fetcher">
      <div className="pairing-fetcher-row">
        <button type="button" onClick={() => void doFetch()} disabled={mergedStatus === 'loading'}>
          {mergedStatus === 'loading' ? 'Fetching…' : 'Fetch Data'}
        </button>
        {pairingsReady ? <span className="muted small">Food pairings ready</span> : null}
      </div>
      {mergedStatus === 'success' && mergedFetched && (
        <div className="muted small">Last fetched: {new Date(mergedFetched).toLocaleString()}</div>
      )}
      {mergedStatus === 'error' && mergedError && (
        <div role="alert" className="pairing-error">
          {mergedError}
        </div>
      )}
      {matches.length > 0 && (
        <div className="pairing-results">
          {matches.map((m, idx) => {
            const history = parseHistory(m.history_fun);
            const open = historyOpen[String(idx)];
            return (
              <section key={idx} className="pairing-match">
                <h4>{m.beer?.name ?? 'Unknown beer'}</h4>
                {m.beer?.style && <div className="muted small">{m.beer.style}</div>}
                {m.beer?.description && <p>{m.beer.description}</p>}
                {history.length > 0 && (
                  <div className="history-block">
                    <button
                      type="button"
                      onClick={() => setHistoryOpen((prev) => ({ ...prev, [String(idx)]: !open }))}
                      aria-expanded={open ?? false}
                    >
                      {open ? 'Hide history' : 'Read history'}
                    </button>
                    {open && (
                      <div className="history-content">
                        {history.map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PairingFetcher;
