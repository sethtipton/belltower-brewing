// Minimal API helpers that respect WP localization data.

/**
 * @typedef {{ restUrl?: string; nonce?: string }} PairingGlobals
 * @typedef {Window & { PAIRING_APP?: PairingGlobals; PAIRINGAPP?: PairingGlobals }} PairingWindow
 */

/**
 * @returns {PairingGlobals}
 */
function getGlobals() {
  if (typeof window === 'undefined') return {};
  const win = /** @type {PairingWindow} */ (window);
  const source = win.PAIRING_APP ?? win.PAIRINGAPP;
  if (!source || typeof source !== 'object') return {};
  const restUrl = typeof source.restUrl === 'string' ? source.restUrl : undefined;
  const nonce = typeof source.nonce === 'string' ? source.nonce : undefined;
  return { restUrl, nonce };
}

export function getWPBase() {
  const g = getGlobals();
  return g.restUrl ?? (typeof window !== 'undefined' ? `${window.location.origin}/wp-json` : '/wp-json');
}

function getNonce() {
  const g = getGlobals();
  return g.nonce ?? '';
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 * @template T
 * @returns {Promise<T>}
 */
async function wpFetch(path, options = {}) {
  const base = getWPBase().replace(/\/$/, '');
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const startedAt = Date.now();
  console.log('[API] fetch →', url, options);
  try {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        'X-WP-Nonce': getNonce(),
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    });
    const duration = Date.now() - startedAt;
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      console.warn('[API] fetch failed', { url, status: res.status, duration, text });
      throw new Error(`Request failed: ${res.status} ${text}`);
    }
    console.log('[API] fetch ok', { url, status: res.status, duration });
    const json = /** @type {unknown} */ (await res.json().catch(() => null));
    return /** @type {T} */ (json);
  } catch (err) {
    console.error('[API] fetch exception', { url, err });
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export function fetchPosts() {
  return wpFetch('/wp/v2/posts?per_page=5');
}

/**
 * @param {Array<{ id?: string | number; name?: string; description?: string }> | Array<string | number>} items
 * @returns {Promise<Record<string, { hex: string | null; srm: number | null }> | null>}
 */
export async function getBeerColors(items = []) {
  if (!items.length) return null;
  const normalized = items.map((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      return { id: item };
    }
    return { id: item?.id ?? item?.name ?? '', description: item?.description ?? '' };
  });

  /** @type {Array<Record<string, unknown>> | null} */
  const data = await wpFetch('/bt/v1/beer-colors', {
    method: 'POST',
    body: JSON.stringify({ items: normalized }),
  });
  if (!Array.isArray(data)) return null;
  const entries = data.filter((entry) => entry && typeof entry === 'object');
  /** @type {Record<string, { hex: string | null; srm: number | null }>} */
  const map = {};
  /** @type {Array<Record<string, unknown>>} */
  const safeEntries = /** @type {Array<Record<string, unknown>>} */ (entries);
  safeEntries.forEach((entry) => {
    const id = 'id' in entry && (typeof entry.id === 'string' || typeof entry.id === 'number') ? String(entry.id) : '';
    const hex = 'hex' in entry && typeof entry.hex === 'string' ? entry.hex : ('hexColor' in entry && typeof entry.hexColor === 'string' ? entry.hexColor : null);
    const srm = 'srm' in entry && typeof entry.srm === 'number' ? entry.srm : null;
    if (!id) return;
    map[id] = { hex, srm };
  });
  return map;
}

/**
 * @param {Record<string, unknown>} answers
 * @param {unknown[]} beerItems
 * @param {{ force?: boolean }} options
 * @returns {Promise<unknown>}
 */
export function getPairing(answers = {}, beerItems = [], options = {}) {
  console.log('[API] getPairing', { answers, beerItems });
  return /** @type {Promise<unknown>} */ (wpFetch('/bt/v1/pairing', {
    method: 'POST',
    body: JSON.stringify({ answers, beerData: beerItems, force: options.force ? true : false }),
  }));
}

/**
 * @param {unknown[]} beerItems
 * @param {Record<string, unknown>} answers
 * @returns {Promise<unknown>}
 */
export async function preloadPairing(beerItems = [], answers = {}) {
  return /** @type {Promise<unknown>} */ (wpFetch('/bt/v1/pairing', {
    method: 'POST',
    body: JSON.stringify({ beerData: beerItems, preload: true, answers }),
  }));
}

/**
 * @param {Array<string | { slug?: string; name?: string; description?: string }>} items
 * @param {{ force?: boolean }} options
 * @returns {Promise<{ histories: Record<string, unknown>; partial: boolean; cached: unknown[] }>}
 */
export function getHistories(items = [], options = {}) {
  if (!Array.isArray(items) || !items.length) {
    return Promise.resolve({ histories: {}, partial: false, cached: [] });
  }
  /** @type {{ force: boolean; slugs?: string[]; items?: Array<{ slug: string; name: string; description: string }> }} */
  const payload = {
    force: options.force ? true : false,
  };
  if (typeof items[0] === 'string') {
    payload.slugs = /** @type {string[]} */ (items);
  } else {
    const rawItems = /** @type {Array<{ slug?: string; name?: string; description?: string }>} */ (items);
    /** @type {Array<{ slug: string; name: string; description: string }> } */
    const itemObjects = rawItems.map((it) => ({
      slug: it.slug ?? it.name ?? '',
      name: it.name ?? '',
      description: it.description ?? '',
    }));
    payload.items = itemObjects;
    payload.slugs = itemObjects.map((it) => it.slug).filter(Boolean);
  }
  return /** @type {Promise<{ histories: Record<string, unknown>; partial: boolean; cached: unknown[] }>} */ (
    wpFetch('/bt/v1/pairing/history', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  );
}

/**
 * @param {{ beerData: unknown; foodData: unknown; force?: boolean; promptVersion?: number }} input
 * @returns {Promise<unknown>}
 */
export function fetchStaticPairings(input = {}) {
  const payload = {
    beerData: input.beerData ?? null,
    foodData: input.foodData ?? null,
    force: input.force ? true : false,
    promptVersion: typeof input.promptVersion === 'number' ? input.promptVersion : undefined,
  };
  return /** @type {Promise<unknown>} */ (
    wpFetch('/bt/v1/pairings/static', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  );
}
