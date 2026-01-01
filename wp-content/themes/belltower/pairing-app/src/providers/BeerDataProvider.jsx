import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { normalizeBeer } from '../schemas/beerSchema';
import { getBeerColors, getPairing } from '../api';

/**
 * @typedef {{ id: string | number; name: string; style?: string | null; abv?: number | null; ibu?: number | null; description?: string | null; hexColor?: string | null; srm?: number | null }} Beer
 * @typedef {{ hex?: string | null; srm?: number | null }} BeerColorEntry
 */

const BeerDataContext = createContext(null);

/** @returns {unknown[]} */
function readSnapshot() {
  if (typeof window === 'undefined') return [];
  const win = /** @type {Window & { __BT_BEER_DATA?: unknown; __BT_DATA?: { beer?: unknown } }} */ (window);
  const inline = win.__BT_BEER_DATA ?? win.__BT_DATA?.beer ?? null;
  if (Array.isArray(inline)) return /** @type {unknown[]} */ (inline);
  const script = typeof document !== 'undefined' ? document.getElementById('bt-beer-data') : null;
  const scriptText = script?.textContent ?? '';
  if (!scriptText) return [];
  try {
    const parsed = /** @type {unknown} */ (JSON.parse(scriptText));
    if (parsed && typeof parsed === 'object') {
      if ('items' in parsed && Array.isArray(parsed.items)) {
        return /** @type {unknown[]} */ (parsed.items);
      }
      if (Array.isArray(parsed)) {
        return /** @type {unknown[]} */ (parsed);
      }
    }
  } catch (err) {
    console.warn('Could not parse bt-beer-data script JSON', err instanceof Error ? err.message : err);
  }
  return [];
}

export function BeerDataProvider({ children }) {
  const colorCacheKey = 'bt_beer_color_map';

  /**
   * @param {unknown} rawData
   * @returns {Beer[]}
   */
  const normalizeRaw = useCallback(
    /** @type {(rawData: unknown) => Beer[]} */
    (rawData) => {
      const isObject = rawData && typeof rawData === 'object';
      const rawRecord = isObject ? /** @type {Record<string, unknown>} */ (rawData) : null;
      const rawItems = rawRecord && 'items' in rawRecord && Array.isArray(rawRecord.items)
        ? /** @type {unknown[]} */ (rawRecord.items)
        : Array.isArray(rawData)
        ? /** @type {unknown[]} */ (rawData)
        : [];
    /** @type {Beer[]} */
    const normalized = [];
      rawItems.forEach((it) => {
        try {
          normalized.push(/** @type {Beer} */ (normalizeBeer(it)));
        } catch (err) {
          console.warn('Skipping invalid beer', it, err instanceof Error ? err.message : err);
        }
      });
      return normalized;
    },
    []
  );

  /**
   * @param {Beer[]} current
   * @param {Record<string, BeerColorEntry> | null | undefined} map
   * @returns {Beer[]}
   */
  const applyColorMapToArray = useCallback(
    /** @type {(current: Beer[], map?: Record<string, BeerColorEntry> | null) => Beer[]} */
    (current, map) => {
      if (!map) return current;
      return current.map((b) => {
        const id = String(b.id);
        const next = map[id];
        if (!next) return b;
        const hex = next.hex ?? b.hexColor ?? null;
        const srm = next.srm ?? b.srm ?? null;
        return { ...b, hexColor: hex, srm };
      });
    },
    []
  );

  const initialLoad = useMemo(() => {
    const initialRaw = readSnapshot();
    let normalized = normalizeRaw(initialRaw);
    if (!normalized.length) {
      /** @type {{ env?: { DEV?: boolean } } | undefined} */
      const meta = typeof import.meta !== 'undefined' ? import.meta : undefined;
      const isDev = Boolean(meta?.env?.DEV);
      if (isDev) {
        normalized = normalizeRaw([
          { id: 'mock-1', name: 'Test Lager', style: 'Pilsner', abv: '5%', ibu: '20', description: 'Crisp and clean.' },
          { id: 'mock-2', name: 'Mock Stout', style: 'Stout', abv: '6.5%', ibu: '40', description: 'Roasty and smooth.' },
        ]);
      }
    }
    let colorLoadedInit = false;
    try {
      const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(colorCacheKey) : null;
      if (cached) {
        const parsed = /** @type {unknown} */ (JSON.parse(cached));
        if (parsed && typeof parsed === 'object') {
          const safeMap = /** @type {Record<string, BeerColorEntry>} */ (parsed);
          normalized = applyColorMapToArray(normalized, safeMap);
          colorLoadedInit = true;
        }
      }
    } catch {
      // ignore cache errors
    }
    return { items: normalized, ready: true, colorLoaded: colorLoadedInit };
  }, [applyColorMapToArray, normalizeRaw, colorCacheKey]);

  /** @type {[Beer[], React.Dispatch<React.SetStateAction<Beer[]>>]} */
  const [items, setItems] = useState(/** @type {Beer[]} */(initialLoad.items));
  const [ready, setReady] = useState(initialLoad.ready);
  const [colorLoaded, setColorLoaded] = useState(initialLoad.colorLoaded);
  const colorFetchInFlight = React.useRef(false);

  /** @type {(map: Record<string, BeerColorEntry> | null | undefined) => void} */
  const applyColorMap = useCallback((map) => {
    if (!map) return;
    setItems((prev) =>
      prev.map((b) => {
        const id = String(b.id);
        const next = map[id];
        if (!next) return b;
        const hex = next.hex ?? b.hexColor ?? null;
        const srm = next.srm ?? b.srm ?? null;
        return { ...b, hexColor: hex, srm };
      })
    );
  }, []);

  useEffect(() => {
    /**
     * @param {CustomEvent<{ items?: unknown[] }> | Event} event
     */
    const handler = (event) => {
      const detail = 'detail' in event ? event.detail : undefined;
      const payload = detail && typeof detail === 'object' && 'items' in detail ? detail.items : readSnapshot();
      const normalized = normalizeRaw(payload);
      if (normalized.length) {
        setItems(normalized);
        try {
          const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(colorCacheKey) : null;
          if (cached) {
            const parsed = /** @type {unknown} */ (JSON.parse(cached));
            if (parsed && typeof parsed === 'object') {
              const safeMap = /** @type {Record<string, BeerColorEntry>} */ (parsed);
              applyColorMap(safeMap);
              setColorLoaded(true);
            }
          }
        } catch {
          // ignore cache errors
        }
      }
      setReady(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('btBeerDataReady', handler);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('btBeerDataReady', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('btBeerDataReady', handler);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('btBeerDataReady', handler);
      }
    };
  }, []);

  const byId = useMemo(() => {
    /** @type {Record<string, Beer>} */
    const map = {};
    items.forEach((b) => {
      map[String(b.id)] = b;
    });
    return map;
  }, [items]);

  const refreshColors = useCallback(
    async (force = false) => {
      if (!items.length || colorLoaded || colorFetchInFlight.current) return;
      if (!force) return; // only run when explicitly triggered
      colorFetchInFlight.current = true;
      try {
        const nextMap = await getBeerColors(items);
        if (!nextMap) return;
        applyColorMap(nextMap);
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(colorCacheKey, JSON.stringify(nextMap));
          }
        } catch {
          // ignore storage errors
        }
        setColorLoaded(true);
      } catch (err) {
        console.warn('refreshColors failed', err);
      } finally {
        colorFetchInFlight.current = false;
      }
    },
    [items, applyColorMap, colorLoaded]
  );

  const fetchPairing = useCallback(
    async (answers = {}) => getPairing(answers, items),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      byId,
      ready,
      refreshColors,
      fetchPairing,
    }),
    [items, byId, ready, refreshColors, fetchPairing]
  );

  return <BeerDataContext.Provider value={value}>{children}</BeerDataContext.Provider>;
}

export function useBeerDataContext() {
  const ctx = useContext(BeerDataContext);
  if (!ctx) throw new Error('useBeerData must be used within BeerDataProvider');
  return ctx;
}
