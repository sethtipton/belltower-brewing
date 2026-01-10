import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchStaticPairings } from './api';
import { createLogger } from './logger';

const log = createLogger('staticPairings');

/**
 * @typedef {{ btKey?: string; id?: string | number; slug?: string; name?: string; category?: string; style?: string; pairingProfile?: unknown }} MenuItem
 * @typedef {{ items: MenuItem[]; generatedAt?: string; pairingProfileVersion?: number }} MenuPayload
 * @typedef {{ foodKey?: string; why?: string }} PairingEntry
 * @typedef {{ mains?: PairingEntry[]; side?: PairingEntry | null }} BeerPairings
 * @typedef {Record<string, BeerPairings>} PairingsByBeerKey
 * @typedef {{ pairingsByBeerKey?: PairingsByBeerKey; source?: string | null; generatedAt?: string | null }} StaticPairingsResponse
 */

const STATIC_PAIRINGS_CACHE_VERSION = 1;
const STATIC_PAIRINGS_PROMPT_VERSION = 1;
/** @type {Promise<StaticPairingsResponse | null> | null} */
let inflightPromise = null;

/**
 * @param {string} message
 * @returns {string}
 */
function toErrorType(message) {
  const msg = message.toLowerCase();
  if (msg.includes('timeout')) return 'timeout';
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'network';
  if (msg.includes('parse')) return 'parse';
  if (msg.includes('http') || msg.includes('request failed')) return 'http';
  return 'unknown';
}

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
  const kind = typeof payload.kind === 'string' ? payload.kind : undefined;
  return { items, generatedAt, pairingProfileVersion, kind };
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
    log.warn('parseScript', { phase: 'staticPairings', id, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/**
 * @param {unknown} payload
 * @returns {MenuPayload | null}
 */
function normalizePayload(payload, expectedKind) {
  if (!payload) return null;
  const parsed = toMenuPayload(payload);
  if (!parsed) return null;
  if (expectedKind && parsed.kind && parsed.kind !== expectedKind) return null;
  return parsed;
}

/** @returns {MenuPayload | null} */
export function getCanonicalFoodData() {
  if (typeof window !== 'undefined') {
    const win = /** @type {Window & { __BT_FOOD_DATA?: unknown; __BT_DATA?: { food?: unknown } }} */ (window);
    const direct = normalizePayload(win.__BT_FOOD_DATA, 'food');
    if (direct) return direct;
    const nested = normalizePayload(win.__BT_DATA?.food, 'food');
    if (nested) return nested;
  }
  const fromScript = normalizePayload(readJsonScript('bt-food-data'), 'food');
  if (fromScript) return fromScript;
  return normalizePayload(readJsonScript('bt-menu-data'), 'food');
}

/** @returns {MenuPayload | null} */
export function getCanonicalBeerDataFallback() {
  if (typeof window !== 'undefined') {
    const win = /** @type {Window & { __BT_BEER_DATA?: unknown; __BT_DATA?: { beer?: unknown } }} */ (window);
    const direct = normalizePayload(win.__BT_BEER_DATA, 'beer');
    if (direct) return direct;
    const nested = normalizePayload(win.__BT_DATA?.beer, 'beer');
    if (nested) return nested;
  }
  return normalizePayload(readJsonScript('bt-beer-data'), 'beer');
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
 * @returns {{ hash: string; key: string; beerFingerprint: string; foodFingerprint: string } | null}
 */
export function getPairingCacheMeta() {
  const beerData = getCanonicalBeerDataFallback();
  const foodData = getCanonicalFoodData();
  if (!beerData || !foodData || !Array.isArray(beerData.items) || !Array.isArray(foodData.items)) {
    return null;
  }
  const beerFingerprint = getBeerFingerprintFromItems(beerData.items);
  const foodFingerprint = getFoodFingerprintFromItems(foodData.items);
  if (!beerFingerprint || !foodFingerprint || beerFingerprint === 'empty' || foodFingerprint === 'empty') {
    return null;
  }
  const hash = `${beerFingerprint}.${foodFingerprint}`;
  const key = `bt_pairing_cache_${sanitizeCacheKey(beerFingerprint)}_${sanitizeCacheKey(foodFingerprint)}`;
  return { hash, key, beerFingerprint, foodFingerprint, beerData, foodData };
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
 * @param {PairingsByBeerKey} map
 * @param {Record<string, MenuItem>} foodIndex
 */
function validatePairings(map, foodIndex) {
  if (!map || typeof map !== 'object') return;
  const missingMains = [];
  const missingSide = [];
  const unknownFoodKeys = new Set();
  Object.entries(map).forEach(([beerKey, entry]) => {
    const mains = Array.isArray(entry?.mains) ? entry.mains : [];
    if (mains.length < 2) missingMains.push(beerKey);
    const sideKey = entry?.side?.foodKey ?? '';
    if (!sideKey) missingSide.push(beerKey);
    mains.forEach((m) => {
      const key = m?.foodKey ?? '';
      if (key && !foodIndex[key]) unknownFoodKeys.add(key);
    });
    if (sideKey && !foodIndex[sideKey]) unknownFoodKeys.add(sideKey);
  });
  if (unknownFoodKeys.size) {
    log.warn('validation.unknownFoodKeys', {
      phase: 'staticPairings',
      count: unknownFoodKeys.size,
      sample: Array.from(unknownFoodKeys).slice(0, 5),
    });
  }
  if (missingMains.length) {
    log.warn('validation.missingMains', {
      phase: 'staticPairings',
      count: missingMains.length,
      sample: missingMains.slice(0, 5),
    });
  }
  if (missingSide.length) {
    log.warn('validation.missingSide', {
      phase: 'staticPairings',
      count: missingSide.length,
      sample: missingSide.slice(0, 5),
    });
  }
}

/**
 * @param {{ beerData?: MenuPayload | null; foodData?: MenuPayload | null; force?: boolean; promptVersion?: number }} [input]
 * @returns {Promise<StaticPairingsResponse | null>}
 */
export function loadStaticPairings({ beerData, foodData, force = false, promptVersion } = {}) {
  if (inflightPromise) return inflightPromise;
  inflightPromise = (async () => {
    const startedAt = Date.now();
    const payload = {
      beerData,
      foodData,
      force: force ? true : false,
      promptVersion: typeof promptVersion === 'number' ? promptVersion : undefined,
    };
    log.info('fetch.start', {
      phase: 'staticPairings',
      beerGeneratedAt: beerData?.generatedAt ?? null,
      foodGeneratedAt: foodData?.generatedAt ?? null,
    });
    const responseRaw = await fetchStaticPairings(payload);
    const response = isStaticPairingsResponse(responseRaw) ? responseRaw : null;
    log.info('fetch.ok', {
      phase: 'staticPairings',
      cached: !!response?.source?.cached,
      beerGeneratedAt: response?.source?.beerGeneratedAt ?? null,
      foodGeneratedAt: response?.source?.foodGeneratedAt ?? null,
      ms: Date.now() - startedAt,
      source: response?.source?.cached ? 'server-cache' : 'server',
    });
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
  const [lastUpdated, setLastUpdated] = useState(/** @type {string | null} */ (null));
  const [cacheStore, setCacheStore] = useState('none');
  const resetGuardRef = useRef(false);

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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onReset = () => {
      resetGuardRef.current = true;
      hasLoadedRef.current = false;
      setAvailable(false);
      setStatus('idle');
    };
    const onRefresh = () => {
      resetGuardRef.current = false;
    };
    document.addEventListener('btPairingReset', onReset);
    document.addEventListener('btPairingRefresh', onRefresh);
    return () => {
      document.removeEventListener('btPairingReset', onReset);
      document.removeEventListener('btPairingRefresh', onRefresh);
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
      if (resetGuardRef.current && !force) {
        log.info('blocked.afterReset', { phase: 'staticPairings' });
        return;
      }
      if (force) {
        setCacheStore('none');
      }
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
        log.warn('noFoodData', { phase: 'staticPairings' });
        return;
      }
      if (!beerData) {
        setStatus('error');
        setError('Beer data not available.');
        setAvailable(false);
        return;
      }
      const nextFoodIndex = buildFoodByKey(currentFood);
      setFoodByKey(nextFoodIndex);
      const localCached = !force ? readLocal(cacheKey) : null;
      const sessionCached = !force ? readSession(cacheKey) : null;
      const cached = isStaticPairingsResponse(localCached)
        ? localCached
        : isStaticPairingsResponse(sessionCached)
        ? sessionCached
        : null;
      const cachedStore = isStaticPairingsResponse(localCached) ? 'local' : isStaticPairingsResponse(sessionCached) ? 'session' : 'none';
      if (cached && hasPairings(cached.pairingsByBeerKey)) {
        setPairingsByBeerKey(cached.pairingsByBeerKey ?? {});
        setStatus('ready');
        setAvailable(true);
        hasLoadedRef.current = true;
        setCacheStore(cachedStore);
        if (cached.generatedAt && typeof cached.generatedAt === 'string') {
          setLastUpdated(cached.generatedAt);
        }
        log.info('cache.hit', { phase: 'staticPairings', cacheKey, store: cachedStore, source: `${cachedStore}-cache` });
        validatePairings(cached.pairingsByBeerKey ?? {}, nextFoodIndex);
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
          setCacheStore('server');
          if (response?.generatedAt && typeof response.generatedAt === 'string') {
            setLastUpdated(response.generatedAt);
          }
          log.info('ready', {
            phase: 'staticPairings',
            beers: Object.keys(map).length,
            food: Object.keys(nextFoodIndex ?? {}).length,
            store: 'server',
            lastUpdated: response?.generatedAt ?? null,
          });
          writeSession(cacheKey, { pairingsByBeerKey: map, source: response?.source ?? null, generatedAt: response?.generatedAt ?? null });
          writeLocal(cacheKey, { pairingsByBeerKey: map, source: response?.source ?? null, generatedAt: response?.generatedAt ?? null });
          validatePairings(map, nextFoodIndex);
        } else {
          setPairingsByBeerKey(/** @type {PairingsByBeerKey} */ ({}));
          setStatus('idle');
          setAvailable(false);
          log.warn('empty', { phase: 'staticPairings' });
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unable to load pairings.');
        setAvailable(false);
        const message = err instanceof Error ? err.message : String(err);
        log.error('fetch.error', { phase: 'staticPairings', error: message, errorType: toErrorType(message) });
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
    lastUpdated,
    cacheStore,
  };
}
