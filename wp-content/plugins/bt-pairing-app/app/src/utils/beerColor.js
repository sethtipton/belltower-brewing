import { getWPBase } from '../api';
import { createLogger } from '../logger';

const log = createLogger('beerColors');

/**
 * @param {string | null | undefined} hex
 * @returns {string}
 */
export function pickForeground(hex) {
  const cleaned = String(hex ?? '').replace('#', '');
  if (cleaned.length !== 6) return '#111';
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  const srgb = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  const contrastBlack = (L + 0.05) / 0.05;
  const contrastWhite = 1.05 / (L + 0.05);
  return contrastBlack >= contrastWhite ? '#111' : '#fff';
}

/**
 * @typedef {{ id?: string; style?: string; description?: string; abv?: number; ibu?: number }} BeerColorInput
 * @typedef {{ id?: string; hex?: string; hexColor?: string }} BeerColorResult
 * @typedef {{ colors?: BeerColorResult[] | Record<string, string>; results?: BeerColorResult[] }} BeerColorResponse
 * @param {BeerColorInput[]} items
 * @returns {Promise<Record<string, string>>}
 */
let nextBeerColorAllowedAt = 0;
let beerColorInFlight = null;

export async function fetchBeerColorsBatch(items = []) {
  if (!Array.isArray(items) || !items.length) return {};
  if (Date.now() < nextBeerColorAllowedAt || beerColorInFlight) return null;
  const url = `${getWPBase().replace(/\/$/, '')}/bt/v1/beer-colors`;
  beerColorInFlight = (async () => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        log.warn('response', { phase: 'beerColors', status: res.status, text });
        nextBeerColorAllowedAt = Date.now() + 60 * 1000;
        return null;
      }
      /** @type {BeerColorResponse | BeerColorResult[] | null | unknown} */
      const data = await res.json().catch(() => null);
      /** @type {BeerColorResult[]} */
      const entries = [];

      /** @param {unknown} entry */
      const addEntry = (entry) => {
        if (!entry || typeof entry !== 'object') return;
        const rec = /** @type {Record<string, unknown>} */ (entry);
        const id = 'id' in rec && (typeof rec.id === 'string' || typeof rec.id === 'number') ? String(rec.id) : undefined;
        const hex = 'hex' in rec && typeof rec.hex === 'string' ? rec.hex : undefined;
        const hexColor = 'hexColor' in rec && typeof rec.hexColor === 'string' ? rec.hexColor : undefined;
        if (id) {
          entries.push({ id, hex, hexColor });
        }
      };

      if (Array.isArray(data)) {
        data.forEach(addEntry);
      } else if (data && typeof data === 'object') {
        const colors = /** @type {unknown} */ (data.colors);
        if (Array.isArray(colors)) {
          colors.forEach(addEntry);
        } else if (colors && typeof colors === 'object' && !Array.isArray(colors)) {
          Object.entries(/** @type {Record<string, unknown>} */ (colors)).forEach(([id, hex]) => addEntry({ id, hex }));
        }
        const results = /** @type {unknown} */ (data.results);
        if (Array.isArray(results)) {
          results.forEach(addEntry);
        }
      }
      /** @type {Record<string, string>} */
      const map = {};
      entries.forEach((r) => {
        if (!r) return;
        const id = r.id ?? '';
        const hex = r.hex ?? r.hexColor ?? '';
        if (id && hex) {
          map[String(id)] = String(hex);
        }
      });
      return map;
    } catch (err) {
      log.warn('exception', { phase: 'beerColors', error: err instanceof Error ? err.message : String(err) });
      nextBeerColorAllowedAt = Date.now() + 60 * 1000;
      return null;
    } finally {
      beerColorInFlight = null;
    }
  })();
  return beerColorInFlight;
}

/**
 * @param {string} key
 * @returns {unknown}
 */
export function getCachedColors(key) {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? /** @type {unknown} */ (JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {Record<string, string>} map
 * @param {{ version?: string }} opts
 */
export function setCachedColors(key, map, { version = 'v1' } = {}) {
  if (typeof sessionStorage === 'undefined') return;
  const payload = {
    ts: Date.now(),
    version,
    colors: map ?? {},
  };
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

/**
 * @param {{ version?: string; ts?: number } | null | undefined} cached
 * @param {number} ttlDays
 */
export function isCacheStale(cached, ttlDays = 7) {
  if (!cached) return true;
  if (cached.version !== 'v1') return true;
  if (!cached.ts) return true;
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  return Date.now() - cached.ts > ttlMs;
}

/**
 * @param {{ current: Element | null } | null} listRef
 * @param {string[]} ids
 * @returns {Promise<string[]>}
 */
export function observeVisibleIds(listRef, ids = []) {
  return new Promise((resolve) => {
    if (!ids.length) {
      resolve([]);
      return;
    }
    if (typeof document === 'undefined') {
      resolve(ids);
      return;
    }

    const elements = ids
      .map((id) => {
        const safeId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id;
        const selector = `[data-beer-id="${safeId}"]`;
        return (listRef?.current ?? document).querySelector(selector);
      })
      .filter((el) => !!el);

    if (typeof window === 'undefined' || !('IntersectionObserver' in window) || !elements.length) {
      resolve(ids.slice(0, Math.min(ids.length, 20)));
      return;
    }

    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-beer-id');
            if (id) visible.add(id);
          }
        });
      },
      { root: null, rootMargin: '200px' }
    );

    elements.forEach((el) => observer.observe(el));

    const timeout = setTimeout(() => {
      observer.disconnect();
      resolve(Array.from(visible));
    }, 300);

    const finalize = () => {
      clearTimeout(timeout);
      observer.disconnect();
      resolve(Array.from(visible));
    };

    if (elements.length === visible.size) {
      finalize();
    } else {
      setTimeout(() => finalize(), 300);
    }
  });
}
