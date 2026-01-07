export interface PairingBeer {
  name?: string;
  style?: string;
  abv?: string;
  ibu?: string;
  description?: string;
}

export interface PairingMatch {
  beer?: PairingBeer | null;
  score?: number;
  confidence?: string;
  top_tags?: string[];
  match_sentence?: string;
  learn_more?: string;
  history_fun?: string;
}

export interface PairingResponse {
  matches?: PairingMatch[];
  canonical_tag_set?: string[];
  tag_synonyms?: Record<string, string[]>;
  explainers?: Record<string, unknown>;
}

export const PAIRING_STORAGE_KEY = 'bt_pairing_cache_v1';

export function getPairingStorageKey(hash?: string | null): string {
  const safe = typeof hash === 'string' && hash ? hash : '';
  return safe ? `${PAIRING_STORAGE_KEY}_${safe}` : PAIRING_STORAGE_KEY;
}

function getGlobals(): { restUrl?: string; nonce?: string } {
  if (typeof window === 'undefined') return {};
  const win = window as unknown as Record<string, unknown>;
  const candidate = (win.PAIRING_APP ?? win.PAIRINGAPP) as Record<string, unknown> | undefined;
  if (!candidate || typeof candidate !== 'object') return {};
  const restUrl = typeof candidate.restUrl === 'string' ? candidate.restUrl : undefined;
  const nonce = typeof candidate.nonce === 'string' ? candidate.nonce : undefined;
  return { restUrl, nonce };
}

function getBase(): string {
  const g = getGlobals();
  return g.restUrl ?? (typeof window !== 'undefined' ? `${window.location.origin}/wp-json` : '/wp-json');
}

function getNonce(): string {
  const g = getGlobals();
  return g.nonce ?? '';
}

function readInlineBeerData(): unknown {
  const win = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
  const inline = win.__BT_BEER_DATA
    ?? (typeof win.__BT_DATA === 'object' && win.__BT_DATA
      ? (win.__BT_DATA as { beer?: unknown }).beer
      : undefined);
  if (inline) return inline;
  const script = typeof document !== 'undefined' ? document.getElementById('bt-beer-data') : null;
  if (script?.textContent) {
    try {
      const parsed = JSON.parse(script.textContent) as { items?: unknown[] };
      return (parsed as { items?: unknown[] }).items ?? parsed;
    } catch {
      // ignore parse errors
    }
  }
  return null;
}

async function wpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${getBase().replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': getNonce(),
      ...(init.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    const message = text ?? 'Request failed';
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function getCachedPairing(hash?: string | null): Promise<PairingResponse | null> {
  const suffix = typeof hash === 'string' && hash ? `?hash=${encodeURIComponent(hash)}` : '';
  const url = `/bt/v1/pairing${suffix}`;
  const res = await fetch(url.startsWith('http') ? url : `${getBase().replace(/\/$/, '')}${url}`, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': getNonce(),
    },
  }).catch(() => null);
  if (!res) return null;
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text ?? 'Request failed');
  }
  const data = (await res.json().catch(() => null)) as unknown;
  if (!data || typeof data !== 'object') return data as PairingResponse | null;
  if ('data' in data) {
    const wrapped = data as { data?: PairingResponse | null };
    return wrapped.data ?? null;
  }
  return data as PairingResponse;
}

export async function refreshPairing(force = false): Promise<PairingResponse> {
  const beerData = readInlineBeerData();
  return wpFetch<PairingResponse>('/bt/v1/pairing', {
    method: 'POST',
    body: JSON.stringify({ force, beerData }),
  });
}
