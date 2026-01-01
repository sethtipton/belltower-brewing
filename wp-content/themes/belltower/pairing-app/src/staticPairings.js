import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchStaticPairings } from './api';

/**
 * @typedef {{ btKey?: string; id?: string | number; slug?: string; name?: string; category?: string; style?: string; pairingProfile?: unknown }} MenuItem
 * @typedef {{ items: MenuItem[]; generatedAt?: string; pairingProfileVersion?: number }} MenuPayload
 * @typedef {{ foodKey?: string; why?: string }} PairingEntry
 * @typedef {{ mains?: PairingEntry[]; side?: PairingEntry | null }} BeerPairings
 * @typedef {Record<string, BeerPairings>} PairingsByBeerKey
 * @typedef {{ pairingsByBeerKey?: PairingsByBeerKey; source?: string | null }} StaticPairingsResponse
 */

const STATIC_PAIRINGS_CACHE_VERSION = 1;
const STATIC_PAIRINGS_PROMPT_VERSION = 1;
/** @type {Promise<StaticPairingsResponse | null> | null} */
let inflightPromise = null;

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is MenuItem}
 */
function isMenuItem(value) {
  return isRecord(value);
}

/**
 * @param {unknown} payload
 * @returns {MenuPayload | null}
 */
function toMenuPayload(payload) {
  if (Array.isArray(payload)) {
    return { items: payload.filter(isMenuItem) };
  }
  if (!isRecord(payload)) return null;
  const itemsRaw = payload.items;
  if (!Array.isArray(itemsRaw)) return null;
  const items = itemsRaw.filter(isMenuItem);
  const generatedAt = typeof payload.generatedAt === 'string' ? payload.generatedAt : undefined;
  const pairingProfileVersion = typeof payload.pairingProfileVersion === 'number' ? payload.pairingProfileVersion : undefined;
  return { items, generatedAt, pairingProfileVersion };
}

/**
 * @param {unknown} value
 * @returns {value is PairingsByBeerKey}
 */
function isPairingsByBeerKey(value) {
  return isRecord(value);
}

/**
 * @param {unknown} value
 * @returns {value is StaticPairingsResponse}
 */
function isStaticPairingsResponse(value) {
  if (!isRecord(value)) return false;
  if ('pairingsByBeerKey' in value && value.pairingsByBeerKey !== undefined) {
    return isPairingsByBeerKey(value.pairingsByBeerKey);
  }
  return true;
}

/**
 * @param {string} id
 * @returns {unknown | null}
 */
export function readJsonScript(id) {
  if (typeof document === 'undefined') return null;
  const script = document.getElementById(id);
  const raw = script?.textContent ?? '';
  if (!raw) return null;
  try {
    return /** @type {unknown} */ (JSON.parse(raw));
  } catch (err) {
    console.warn(`Could not parse ${id}`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * @param {unknown} payload
 * @returns {MenuPayload | null}
 */
function normalizePayload(payload) {
  if (!payload) return null;
  return toMenuPayload(payload);
}

/** @returns {MenuPayload | null} */
export function getCanonicalFoodData() {
  if (typeof window !== 'undefined') {
    const win = /** @type {Window & { __BT_FOOD_DATA?: unknown; __BT_DATA?: { food?: unknown } }} */ (window);
    const direct = normalizePayload(win.__BT_FOOD_DATA);
    if (direct) return direct;
    const nested = normalizePayload(win.__BT_DATA?.food);
    if (nested) return nested;
  }
  const fromScript = normalizePayload(readJsonScript('bt-food-data'));
  if (fromScript) return fromScript;
  return normalizePayload(readJsonScript('bt-menu-data'));
}

/** @returns {MenuPayload | null} */
export function getCanonicalBeerDataFallback() {
  if (typeof window !== 'undefined') {
    const win = /** @type {Window & { __BT_BEER_DATA?: unknown; __BT_DATA?: { beer?: unknown } }} */ (window);
    const direct = normalizePayload(win.__BT_BEER_DATA);
    if (direct) return direct;
    const nested = normalizePayload(win.__BT_DATA?.beer);
    if (nested) return nested;
  }
  return normalizePayload(readJsonScript('bt-beer-data'));
}

/**
 * @param {MenuPayload | null} foodData
 * @returns {Record<string, MenuItem>}
 */
export function buildFoodByKey(foodData) {
  const map = /** @type {Record<string, MenuItem>} */ ({});
  if (!foodData || !Array.isArray(foodData.items)) return map;
  foodData.items.forEach((item) => {
    if (!item) return;
    const key = typeof item.btKey === 'string' ? item.btKey : '';
    if (!key) return;
    map[key] = item;
  });
  return map;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function toSafeString(value) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function sanitizeCacheKey(value) {
  return toSafeString(value)
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function hashString(value) {
  const str = toSafeString(value);
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * @param {MenuItem[]} items
 * @returns {string}
 */
function getBeerFingerprintFromItems(items) {
  if (!Array.isArray(items)) return 'empty';
  const normalized = items
    .slice()
    .map((item) => {
      const key = typeof item.btKey === 'string'
        ? item.btKey
        : typeof item.id === 'string' || typeof item.id === 'number'
        ? String(item.id)
        : typeof item.slug === 'string'
        ? item.slug
        : typeof item.name === 'string'
        ? item.name
        : '';
      const profile = item.pairingProfile ? JSON.stringify(item.pairingProfile) : '';
      const style = typeof item.style === 'string' ? item.style : '';
      return `${key}|${style}|${profile}`;
    })
    .sort()
    .join('||');
  return normalized ? hashString(normalized) : 'empty';
}

/**
 * @param {MenuItem[]} items
 * @returns {string}
 */
function getFoodFingerprintFromItems(items) {
  if (!Array.isArray(items)) return 'empty';
  const normalized = items
    .slice()
    .map((item) => {
      const key = typeof item.btKey === 'string'
        ? item.btKey
        : typeof item.id === 'string' || typeof item.id === 'number'
        ? String(item.id)
        : typeof item.slug === 'string'
        ? item.slug
        : typeof item.name === 'string'
        ? item.name
        : '';
      const category = typeof item.category === 'string' ? item.category : '';
      return `${key}|${category}`;
    })
    .sort()
    .join('||');
  return normalized ? hashString(normalized) : 'empty';
}

/**
 * @param {Array<{ btKey?: string; style?: string; pairingProfile?: unknown }>} items
 * @returns {string}
 */
function getDerivedBeerFingerprint(items) {
  const normalized = items
    .slice()
    .sort((a, b) => String(a?.btKey ?? '').localeCompare(String(b?.btKey ?? '')))
    .map((item) => {
      const profile = item?.pairingProfile ? JSON.stringify(item.pairingProfile) : '';
      return `${item?.btKey ?? ''}|${item?.style ?? ''}|${profile}`;
    })
    .join('||');
  return normalized ? hashString(normalized) : 'empty';
}

/**
 * @param {{ beerData?: MenuPayload | null; foodData?: MenuPayload | null }} input
 * @returns {string}
 */
export function getStaticPairingsCacheKey({ beerData, foodData }) {
  const beerGen = beerData?.items?.length
    ? `beer-${getBeerFingerprintFromItems(beerData.items)}`
    : beerData?.generatedAt ?? 'unknown';
  const foodGen = foodData?.items?.length
    ? `food-${getFoodFingerprintFromItems(foodData.items)}`
    : foodData?.generatedAt ?? 'unknown';
  const profileV = beerData?.pairingProfileVersion ?? foodData?.pairingProfileVersion ?? 1;
  const parts = [
    STATIC_PAIRINGS_CACHE_VERSION,
    profileV,
    STATIC_PAIRINGS_PROMPT_VERSION,
    beerGen,
    foodGen,
  ].map(sanitizeCacheKey);
  return `bt_static_pairings_${parts.join('_')}`;
}

/**
 * @param {string} key
 * @returns {unknown | null}
 */
function readSession(key) {
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
 * @returns {unknown | null}
 */
function readLocal(key) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? /** @type {unknown} */ (JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 */
function writeSession(key, value) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

/**
 * @param {string} key
 * @param {unknown} value
 */
function writeLocal(key, value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

/**
 * @param {PairingsByBeerKey | null | undefined} map
 * @returns {boolean}
 */
function hasPairings(map) {
  return map && typeof map === 'object' && Object.keys(map).length > 0;
}

/**
 * @param {{ beerData?: MenuPayload | null; foodData?: MenuPayload | null; force?: boolean; promptVersion?: number }} [input]
 * @returns {Promise<StaticPairingsResponse | null>}
 */
export function loadStaticPairings({ beerData, foodData, force = false, promptVersion } = {}) {
  if (inflightPromise) return inflightPromise;
  inflightPromise = (async () => {
    const payload = {
      beerData,
      foodData,
      force: force ? true : false,
      promptVersion: typeof promptVersion === 'number' ? promptVersion : undefined,
    };
    console.log('[Static pairings] fetch start', {
      beerGeneratedAt: beerData?.generatedAt ?? null,
      foodGeneratedAt: foodData?.generatedAt ?? null,
    });
    const responseRaw = await fetchStaticPairings(payload);
    const response = isStaticPairingsResponse(responseRaw) ? responseRaw : null;
    console.log('[Static pairings] fetch ok', response?.source ?? null);
    return response;
  })();
  void inflightPromise.finally(() => {
    inflightPromise = null;
  });
  return inflightPromise;
}

/**
 * @param {{ beers?: Array<MenuItem & { btKey?: string; style?: string; pairingProfile?: unknown }> }} [input]
 */
export function useStaticPairings({ beers = [] } = {}) {
  const [status, setStatus] = useState('idle');
  const [pairingsByBeerKey, setPairingsByBeerKey] = useState(/** @type {PairingsByBeerKey} */ ({}));
  const [foodByKey, setFoodByKey] = useState(/** @type {Record<string, MenuItem>} */ ({}));
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(false);
  const hasLoadedRef = useRef(false);

  const [foodData, setFoodData] = useState(/** @type {MenuPayload | null} */ (getCanonicalFoodData()));
  const foodIndex = useMemo(() => buildFoodByKey(foodData), [foodData]);

  const beerData = useMemo(/** @returns {MenuPayload | null} */ () => {
    const fallback = getCanonicalBeerDataFallback();
    if (fallback) return fallback;
    const derivedItems = beers
      .filter((beer) => beer && typeof beer === 'object' && typeof beer.btKey === 'string')
      .map((beer) => ({
        btKey: beer.btKey,
        style: typeof beer.style === 'string' ? beer.style : '',
        pairingProfile: beer.pairingProfile ?? undefined,
      }));
    return derivedItems.length
      ? { generatedAt: `derived-${getDerivedBeerFingerprint(derivedItems)}`, items: derivedItems, pairingProfileVersion: 1 }
      : null;
  }, [beers]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateFoodData = () => {
      const next = getCanonicalFoodData();
      if (next) {
        setFoodData(next);
      }
    };
    const onFoodReady = () => updateFoodData();
    document.addEventListener('btFoodDataReady', onFoodReady);

    let observer = null;
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => updateFoodData());
      observer.observe(document.head || document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      document.removeEventListener('btFoodDataReady', onFoodReady);
      if (observer) observer.disconnect();
    };
  }, []);

  const cacheKey = useMemo(
    () => getStaticPairingsCacheKey({ beerData, foodData }),
    [beerData, foodData]
  );

  const cachedSnapshot = useMemo(/** @returns {StaticPairingsResponse | null} */ () => {
    const fromLocal = readLocal(cacheKey);
    if (isStaticPairingsResponse(fromLocal) && fromLocal.pairingsByBeerKey) return fromLocal;
    const fromSession = readSession(cacheKey);
    if (isStaticPairingsResponse(fromSession) && fromSession.pairingsByBeerKey) return fromSession;
    return null;
  }, [cacheKey]);

  const cacheAvailable = Boolean(cachedSnapshot && hasPairings(cachedSnapshot.pairingsByBeerKey));

  const cachedPairings = cacheAvailable ? cachedSnapshot?.pairingsByBeerKey ?? null : null;
  const cachedReady = Boolean(cacheAvailable && foodData);
  const effectivePairingsByBeerKey = cachedReady && !hasLoadedRef.current
    ? cachedPairings ?? /** @type {PairingsByBeerKey} */ ({})
    : pairingsByBeerKey;
  const effectiveFoodByKey = cachedReady && !hasLoadedRef.current ? foodIndex : foodByKey;
  const effectiveStatus = cachedReady && !hasLoadedRef.current ? 'ready' : status;
  const effectiveAvailable = cachedReady && !hasLoadedRef.current ? true : available;

  const ensureLoaded = useCallback(
    async (force = false) => {
      if (hasLoadedRef.current && !force) return;
      let currentFood = foodData;
      if (!currentFood) {
        const nextFood = getCanonicalFoodData();
        if (nextFood) {
          setFoodData(nextFood);
          currentFood = nextFood;
        }
      }
      if (!currentFood) {
        setStatus('no-food-data');
        setAvailable(false);
        console.log('[Static pairings] no food data available');
        return;
      }
      if (!beerData) {
        setStatus('error');
        setError('Beer data not available.');
        setAvailable(false);
        return;
      }
      setFoodByKey(foodIndex);
      const localCached = !force ? readLocal(cacheKey) : null;
      const sessionCached = !force ? readSession(cacheKey) : null;
      const cached = isStaticPairingsResponse(localCached)
        ? localCached
        : isStaticPairingsResponse(sessionCached)
        ? sessionCached
        : null;
      if (cached && hasPairings(cached.pairingsByBeerKey)) {
        setPairingsByBeerKey(cached.pairingsByBeerKey ?? {});
        setStatus('ready');
        setAvailable(true);
        hasLoadedRef.current = true;
        console.log('[Static pairings] cache hit', cacheKey);
        return;
      }
      setStatus('loading');
      setError('');
      try {
        const response = await loadStaticPairings({
          beerData,
          foodData: currentFood,
          force,
          promptVersion: STATIC_PAIRINGS_PROMPT_VERSION,
        });
        const map = response?.pairingsByBeerKey ?? /** @type {PairingsByBeerKey} */ ({});
        if (hasPairings(map)) {
          setPairingsByBeerKey(map);
          setStatus('ready');
          setAvailable(true);
          hasLoadedRef.current = true;
          writeSession(cacheKey, { pairingsByBeerKey: map, source: response?.source ?? null });
          writeLocal(cacheKey, { pairingsByBeerKey: map, source: response?.source ?? null });
        } else {
          setPairingsByBeerKey(/** @type {PairingsByBeerKey} */ ({}));
          setStatus('idle');
          setAvailable(false);
          console.log('[Static pairings] empty response, not enabling UI');
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unable to load pairings.');
        setAvailable(false);
        console.log('[Static pairings] fetch error', err);
      }
    },
    [beerData, foodData, foodIndex]
  );

  return {
    status: effectiveStatus,
    error,
    pairingsByBeerKey: effectivePairingsByBeerKey,
    foodByKey: effectiveFoodByKey,
    ensureLoaded,
    available: effectiveAvailable,
  };
}
