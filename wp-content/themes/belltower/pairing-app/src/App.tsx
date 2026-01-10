import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import type { PairingMatch as ApiPairingMatch, PairingResponse as ApiPairingResponse } from './api/pairing';
import { useBeerData } from './hooks/useBeerData';
import BeerList from './components/BeerList';
import { LiveAnnouncerProvider } from './components/LiveAnnouncer';
import { preloadPairing, getHistories, getPairingCache, getPairingCacheStatus } from './api';
import FlightTray from './components/FlightTray';
import { PairingForm } from './components/PairingForm';
import {
  useStaticPairings,
  getPairingCacheMeta,
  getCanonicalBeerDataFallback,
  getCanonicalFoodData,
} from './staticPairings';
import './styles/styles.scss';
import useFlight from './hooks/useFlight';
import { createLogger } from './logger';

interface PreparedAnswers { mood: string; body: string; bitterness: string; flavorFocus: string[]; alcoholPreference: string }
interface PairingMatch extends ApiPairingMatch {
  beer?: (ApiPairingMatch['beer'] & {
    id?: string | number;
    hex?: string | null;
    hexColor?: string | null;
  }) | null;
  matchSentence?: string | null;
}
type PairingResponse = ApiPairingResponse & {
  matches?: PairingMatch[];
  history_map?: Record<string, string>;
  colors?: Record<string, string>;
  result?: unknown;
  data?: unknown;
};
interface PairingCacheEntry { data?: PairingResponse | null; fetchedAt?: number | null }
interface BeerItem {
  id: string;
  name: string;
  description: string;
  style: string;
  hexColor: string | null;
  abv?: number | null;
  ibu?: number | null;
  btKey?: string;
  pairingProfile?: unknown;
  recommended?: boolean;
  recommendationScore?: number | null;
  recommendationConfidence?: string | null;
  recommendationMatchSentence?: string | null;
  history_fun?: string | null;
}
interface MatchLike { beer?: unknown; score?: unknown; confidence?: unknown; match_sentence?: unknown; matchSentence?: unknown }
type FetchStatus = 'idle' | 'loading' | 'success' | 'error';
interface PairingCacheMeta {
  hash: string;
  key: string;
  beerFingerprint: string;
  foodFingerprint: string;
  beerData: { items?: unknown[] } | null;
  foodData: { items?: unknown[] } | null;
}

const PAIRING_MAP_KEY = 'bt_pairing_cache_v1_map';
const HISTORY_CACHE_KEY = 'bt_history_cache_v1';
const EMPTY_PREPARED: PreparedAnswers = { mood: '', body: '', bitterness: '', flavorFocus: [], alcoholPreference: '' };
const session = typeof globalThis !== 'undefined' ? globalThis.sessionStorage : null;
const localStore = typeof globalThis !== 'undefined' ? globalThis.localStorage : null;
const log = createLogger('pairing');
const historyLog = createLogger('history');
const staticLog = createLogger('staticPairings');
const recLog = createLogger('recommendations');
const pairingGlobals = typeof globalThis !== 'undefined'
  ? (globalThis as {
      PAIRING_APP?: { isAdmin?: boolean; cacheHash?: string };
      PAIRINGAPP?: { isAdmin?: boolean; cacheHash?: string };
    })
  : null;
const isAdmin = Boolean(pairingGlobals?.PAIRING_APP?.isAdmin ?? pairingGlobals?.PAIRINGAPP?.isAdmin);
const getServerCacheHash = (): string => {
  const hash = pairingGlobals?.PAIRING_APP?.cacheHash ?? pairingGlobals?.PAIRINGAPP?.cacheHash;
  return typeof hash === 'string' ? hash : '';
};
const scheduleIdle = (task: () => void, delay = 500): void => {
  if (typeof globalThis === 'undefined') {
    task();
    return;
  }
  const idle = globalThis.requestIdleCallback;
  if (typeof idle === 'function') {
    idle(() => task(), { timeout: delay });
    return;
  }
  globalThis.setTimeout(task, delay);
};

const detectDataSources = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { beerSource: 'server', foodSource: 'server' };
  }
  const win = window as { __BT_BEER_DATA?: unknown; __BT_FOOD_DATA?: unknown; __BT_DATA?: { beer?: unknown; food?: unknown } };
  const beerSource = win.__BT_BEER_DATA || win.__BT_DATA?.beer
    ? 'window'
    : document.getElementById('bt-beer-data')
    ? 'script'
    : 'missing';
  const foodSource = win.__BT_FOOD_DATA || win.__BT_DATA?.food
    ? 'window'
    : document.getElementById('bt-food-data') || document.getElementById('bt-menu-data')
    ? 'script'
    : 'missing';
  return { beerSource, foodSource };
};

const toErrorType = (message: string): string => {
  const msg = message.toLowerCase();
  if (msg.includes('timeout')) return 'timeout';
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'network';
  if (msg.includes('parse')) return 'parse';
  if (msg.includes('http') || msg.includes('request failed')) return 'http';
  return 'unknown';
};
const isRecord = (val: unknown): val is Record<string, unknown> => Boolean(val) && typeof val === 'object' && !Array.isArray(val);
const formatError = (err: unknown): string => (err instanceof Error ? err.message : String(err));
const isMatchLike = (val: unknown): val is MatchLike => isRecord(val);

function toPairingCacheMeta(raw: unknown): PairingCacheMeta | null {
  if (!isRecord(raw)) return null;
  const hash = typeof raw.hash === 'string' ? raw.hash : '';
  const key = typeof raw.key === 'string' ? raw.key : '';
  if (!hash || !key) return null;
  const beerFingerprint = typeof raw.beerFingerprint === 'string' ? raw.beerFingerprint : '';
  const foodFingerprint = typeof raw.foodFingerprint === 'string' ? raw.foodFingerprint : '';
  const beerData = isRecord(raw.beerData) ? (raw.beerData as { items?: unknown[] }) : null;
  const foodData = isRecord(raw.foodData) ? (raw.foodData as { items?: unknown[] }) : null;
  return { hash, key, beerFingerprint, foodFingerprint, beerData, foodData };
}

function toPairingCacheEntry(raw: unknown): PairingCacheEntry | null {
  if (!isRecord(raw)) return null;
  const fetchedAt = typeof raw.fetchedAt === 'number' ? raw.fetchedAt : null;
  const data = 'data' in raw ? (raw.data as PairingResponse | null) : null;
  return { data, fetchedAt };
}

function toPairingCacheMap(raw: unknown): Record<string, PairingCacheEntry> {
  if (!isRecord(raw)) return {};
  const map: Record<string, PairingCacheEntry> = {};
  Object.entries(raw).forEach(([key, val]) => {
    const entry = toPairingCacheEntry(val);
    if (entry) {
      map[key] = entry;
    }
  });
  return map;
}

function toMatches(raw: unknown): PairingMatch[] {
  if (!Array.isArray(raw)) return [];
  const matches: PairingMatch[] = [];
  raw.forEach((entry) => {
    if (isMatchLike(entry)) {
      const beerVal = 'beer' in entry ? entry.beer : null;
      const beerRaw = isRecord(beerVal) ? beerVal : null;
      const beer = beerRaw
        ? {
            name: typeof beerRaw.name === 'string' ? beerRaw.name : undefined,
            id: beerRaw.id != null && (typeof beerRaw.id === 'string' || typeof beerRaw.id === 'number') ? String(beerRaw.id) : undefined,
            description: typeof beerRaw.description === 'string' ? beerRaw.description : undefined,
            style: typeof beerRaw.style === 'string' ? beerRaw.style : undefined,
            hex: typeof beerRaw.hex === 'string' ? beerRaw.hex : undefined,
            hexColor: typeof beerRaw.hexColor === 'string' ? beerRaw.hexColor : undefined,
          }
        : null;
      const match: PairingMatch = {
        beer,
        score: 'score' in entry && typeof entry.score === 'number' ? entry.score : undefined,
        confidence: 'confidence' in entry && typeof entry.confidence === 'string' ? entry.confidence : undefined,
        match_sentence: 'match_sentence' in entry && typeof entry.match_sentence === 'string' ? entry.match_sentence : undefined,
        matchSentence: 'matchSentence' in entry && typeof entry.matchSentence === 'string' ? entry.matchSentence : undefined,
      };
      matches.push(match);
    }
  });
  return matches;
}

function toPairingResponse(raw: unknown): PairingResponse | null {
  if (!isRecord(raw)) return null;
  return raw as PairingResponse;
}

function toHistoryMap(raw: unknown): Record<string, string> {
  if (!isRecord(raw)) return {};
  const map: Record<string, string> = {};
  Object.entries(raw).forEach(([slug, val]) => {
    if (typeof val === 'string' && val.trim()) {
      map[slug] = val;
    }
  });
  return map;
}

function toPreparedAnswers(raw: unknown): PreparedAnswers {
  const source = isRecord(raw) ? raw : {};
  const flavorFocus = Array.isArray(source.flavorFocus)
    ? source.flavorFocus.map((f) => String(f)).filter(Boolean)
    : [];
  return {
    mood: typeof source.mood === 'string' ? source.mood : '',
    body: typeof source.body === 'string' ? source.body : '',
    bitterness: typeof source.bitterness === 'string' ? source.bitterness : '',
    flavorFocus,
    alcoholPreference: typeof source.alcoholPreference === 'string' ? source.alcoholPreference : '',
  };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const match = /(\d+(?:\.\d+)?)/.exec(value);
    if (!match) return null;
    const num = Number.parseFloat(match[1]);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function toBeerItem(raw: unknown): BeerItem | null {
  if (!isRecord(raw)) return null;
  const obj = raw;
  const name = typeof obj.name === 'string' ? obj.name : '';
  const idVal = obj.id;
  const id = typeof idVal === 'string' || typeof idVal === 'number' ? String(idVal) : name || 'beer-' + Math.random().toString(36).slice(2);
  const description = typeof obj.description === 'string' ? obj.description : '';
  const style = typeof obj.style === 'string' ? obj.style : '';
  const hexColor = typeof obj.hexColor === 'string' ? obj.hexColor : typeof obj.hex === 'string' ? obj.hex : null;
  const abv = toNumber(obj.abv);
  const ibu = toNumber(obj.ibu);
  const btKey = typeof obj.btKey === 'string' ? obj.btKey : undefined;
  const pairingProfile = 'pairingProfile' in obj ? obj.pairingProfile : undefined;
  const item: BeerItem = {
    id,
    name,
    description,
    style,
    hexColor,
    abv,
    ibu,
    btKey,
    pairingProfile,
  };
  return item;
}

function toBeerArray(raw: unknown): BeerItem[] {
  if (!Array.isArray(raw)) return [];
  const arr: BeerItem[] = [];
  raw.forEach((it) => {
    const item = toBeerItem(it);
    if (item) arr.push(item);
  });
  return arr;
}

interface BeerDataHook {
  items: unknown;
  ready: boolean;
  refreshColors?: (force?: boolean) => void;
  fetchPairing: (prepared: PreparedAnswers) => Promise<unknown>;
}

export default function App(): React.ReactElement {
  const { items, ready, refreshColors, fetchPairing } = useBeerData() as BeerDataHook;
  const { slots } = useFlight();
  const [pairingCacheMeta, setPairingCacheMeta] = useState<PairingCacheMeta | null>(
    () => toPairingCacheMeta(getPairingCacheMeta())
  );
  const pairingCacheHash = pairingCacheMeta?.hash ?? '';
  const serverCacheHash = useMemo(() => getServerCacheHash(), []);
  const pairingCacheBeerData = pairingCacheMeta?.beerData ?? null;
  const pairingCacheFoodData = pairingCacheMeta?.foodData ?? null;
  const [stableCacheHash, setStableCacheHash] = useState('');
  const pairingCacheMapKey = stableCacheHash ? `${PAIRING_MAP_KEY}_${stableCacheHash}` : '';
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allowColors, setAllowColors] = useState(() => {
    if (!session) return false;
    return !!session.getItem('bt_beer_colors_v1');
  });
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle');
  const [fetchError, setFetchError] = useState('');
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [recommendedIds, setRecommendedIds] = useState<Set<string>>(new Set());
  const [recMeta, setRecMeta] = useState<Record<string, { score: number | null; confidence: string | null; matchSentence: string | null }>>({});
  const [pairingData, setPairingData] = useState<PairingResponse | null>(null);
  const [error, setError] = useState('');
  const [historyByName, setHistoryByName] = useState<Record<string, string>>(() => {
    if (!session) return {};
    try {
      const raw = session.getItem(HISTORY_CACHE_KEY);
      if (!raw) return {};
      const parsed = toHistoryMap(JSON.parse(raw));
      return parsed;
    } catch {
      return {};
    }
  });
  const historyResolved = useRef<Set<string>>(new Set(Object.keys(historyByName || {})));
  const historyAttempts = useRef<Record<string, number>>({});
  const historyRequestInProgress = useRef(false);
  const historyCooldownUntil = useRef(0);
  const [pairingFetched, setPairingFetched] = useState(false);
  const [flightOpen, setFlightOpen] = useState(true);
  const [colorMapOverride, setColorMapOverride] = useState<Record<string, string>>({});
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [preparedAnswers, setPreparedAnswers] = useState<PreparedAnswers | null>(null);
  const safeItems = useMemo<BeerItem[]>(() => toBeerArray(items), [items]);
  const [successMessage, setSuccessMessage] = useState('');
  const staticPairings = useStaticPairings({ beers: safeItems });
  const cacheMetaLogged = useRef(false);
  const fallbackHashLogged = useRef(false);
  const staticPairingsTriggered = useRef<string | null>(null);
  const uiPairingsLogged = useRef(false);

  useEffect(() => {
    const sources = detectDataSources();
    log.info('boot.dataSources', {
      phase: 'boot',
      ...sources,
      hasGlobals: Boolean(pairingGlobals?.PAIRING_APP ?? pairingGlobals?.PAIRINGAPP),
      serverCacheHash: serverCacheHash ?? null,
    });
  }, [serverCacheHash]);

  useEffect(() => {
    const update = () => setPairingCacheMeta(toPairingCacheMeta(getPairingCacheMeta()));
    if (typeof document !== 'undefined') {
      document.addEventListener('btBeerDataReady', update);
      document.addEventListener('btFoodDataReady', update);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('btBeerDataReady', update);
        document.removeEventListener('btFoodDataReady', update);
      }
    };
  }, []);

  useEffect(() => {
    if (pairingCacheMeta) return;
    if (!cacheMetaLogged.current) {
      const beerData = getCanonicalBeerDataFallback();
      const foodData = getCanonicalFoodData();
      const hasBeerData = !!(beerData && Array.isArray(beerData.items) && beerData.items.length);
      const hasFoodData = !!(foodData && Array.isArray(foodData.items) && foodData.items.length);
      log.info('cacheMeta.missing', {
        phase: 'cache',
        hasBeerData,
        hasFoodData,
        serverCacheHash: serverCacheHash || null,
      });
      cacheMetaLogged.current = true;
    }
    let attempts = 0;
    const tick = () => {
      const next = toPairingCacheMeta(getPairingCacheMeta());
      if (next) {
        setPairingCacheMeta(next);
        return;
      }
      attempts += 1;
      if (attempts < 6) {
        setTimeout(tick, 500);
      }
    };
    const timer = setTimeout(tick, 300);
    return () => clearTimeout(timer);
  }, [pairingCacheMeta, serverCacheHash]);

  useEffect(() => {
    const hashCandidate = pairingCacheHash || serverCacheHash;
    if (!hashCandidate) {
      setStableCacheHash('');
      return;
    }
    if (staticPairingsTriggered.current && staticPairingsTriggered.current !== hashCandidate) {
      staticPairingsTriggered.current = null;
    }
    if (!pairingCacheHash && serverCacheHash && !fallbackHashLogged.current) {
      log.info('cacheMeta.fallbackHash', { phase: 'cache', hash: serverCacheHash });
      fallbackHashLogged.current = true;
    }
    const timer = setTimeout(() => {
      setStableCacheHash(hashCandidate);
    }, 400);
    return () => clearTimeout(timer);
  }, [pairingCacheHash, serverCacheHash]);

  const triggerStaticPairings = useCallback(
    (source: 'cached' | 'preload') => {
      if (!stableCacheHash) return;
      if (staticPairingsTriggered.current === stableCacheHash) return;
      staticPairingsTriggered.current = stableCacheHash;
      staticLog.info('trigger', { phase: 'staticPairings', source, hash: stableCacheHash });
      void staticPairings.ensureLoaded();
    },
    [stableCacheHash, staticPairings]
  );

  useEffect(() => {
    if (uiPairingsLogged.current) return;
    if (staticPairings.available && staticPairings.status === 'ready') {
      uiPairingsLogged.current = true;
      log.info('ui.pairingsToggle', {
        phase: 'ui',
        available: staticPairings.available,
        status: staticPairings.status,
        hash: stableCacheHash || null,
      });
    }
  }, [staticPairings.available, staticPairings.status]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const detail = {
      lastFetched,
      pairingsReady: staticPairings.available && pairingFetched,
      cacheHash: stableCacheHash || null,
      staticLastUpdated: staticPairings.lastUpdated ?? null,
      staticStore: staticPairings.cacheStore ?? null,
      status: fetchStatus,
      error: fetchError || null,
    };
    document.dispatchEvent(new CustomEvent('btPairingStatus', { detail }));
  }, [
    lastFetched,
    pairingFetched,
    staticPairings.available,
    staticPairings.lastUpdated,
    staticPairings.cacheStore,
    stableCacheHash,
    fetchStatus,
    fetchError,
  ]);

  const makeAnswerKey = useCallback((a: PreparedAnswers | null | undefined) => {
    const prepared = toPreparedAnswers(a);
    const flavors = prepared.flavorFocus.length ? [...prepared.flavorFocus].sort().join(',') : 'none';
    return [prepared.mood ?? 'none', prepared.body ?? 'none', prepared.bitterness ?? 'none', flavors || 'none', prepared.alcoholPreference ?? 'none']
      .join('|')
      .toLowerCase();
  }, []);

  const readPairingCache = useCallback(
    (key: string): PairingCacheEntry | null => {
      if (!session || !pairingCacheMapKey) return null;
      try {
        const raw = session.getItem(pairingCacheMapKey);
        if (!raw) return null;
        const map = toPairingCacheMap(JSON.parse(raw));
        const found = Object.entries(map).find(([cacheKey]) => cacheKey === key);
        return found ? found[1] : null;
      } catch {
        return null;
      }
    },
    [pairingCacheMapKey]
  );

  const writePairingCache = useCallback(
    (key: string, data: unknown) => {
      if (!session || !pairingCacheMapKey) return;
      try {
        const raw = session.getItem(pairingCacheMapKey);
        const parsed: Record<string, PairingCacheEntry> = raw ? toPairingCacheMap(JSON.parse(raw)) : {};
        const nextMap: Record<string, PairingCacheEntry> = {};
        Object.assign(nextMap, parsed);
        const entry: PairingCacheEntry = {
          data: isRecord(data) ? (data as PairingResponse) : null,
          fetchedAt: Date.now(),
        };
        nextMap[String(key)] = entry;
        session.setItem(pairingCacheMapKey, JSON.stringify(nextMap));
      } catch {
        // ignore storage errors
      }
    },
    [pairingCacheMapKey]
  );

  const persistHistoryCache = useCallback((map: Record<string, string>) => {
    if (!session) return;
    try {
      session.setItem(HISTORY_CACHE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  }, []);

  const mergeHistories = useCallback(
    (incoming: unknown) => {
      const safeHistory = toHistoryMap(incoming);
      if (!Object.keys(safeHistory).length) return;
      setHistoryByName((prev) => {
        const next = { ...prev };
        Object.entries(safeHistory).forEach(([slug, val]) => {
          historyResolved.current.add(slug);
          next[slug] = val;
          historyLog.debug('saved', { phase: 'history', slug, preview: val.slice(0, 80) + '...' });
        });
        persistHistoryCache(next);
        return next;
      });
    },
    [persistHistoryCache]
  );

  const readAnyCachedPairing = useCallback((): PairingResponse | null => {
    if (!session || !pairingCacheMapKey) return null;
    try {
      const rawMap = session.getItem(pairingCacheMapKey);
      if (!rawMap) return null;
      const parsedMap = toPairingCacheMap(JSON.parse(rawMap));
      const firstKey = Object.keys(parsedMap || {})[0];
      if (firstKey && parsedMap[firstKey]?.data) return parsedMap[firstKey].data;
    } catch {
      // ignore
    }
    return null;
  }, [pairingCacheMapKey]);

  const fetchAndMergeHistories = useCallback(async () => {
    if (historyRequestInProgress.current) return;
    if (!safeItems.length) return;
    if (Date.now() < historyCooldownUntil.current) return;
    const payload = safeItems.map((it) => ({
      slug: slugify(it.name ?? it.id ?? ''),
      name: it.name ?? '',
      description: it.description ?? '',
      style: it.style ?? '',
    }));
    const missing = payload.filter((it) => {
      const tries = historyAttempts.current[it.slug] ?? 0;
      return it.slug && !historyResolved.current.has(it.slug) && tries < 2;
    });
    if (!missing.length) return;
    historyRequestInProgress.current = true;
    const historyStarted = Date.now();
    historyLog.info('request', {
      phase: 'history',
      count: missing.length,
      slugsSample: missing.slice(0, 5).map((p) => p.slug),
      hash: stableCacheHash || null,
    });
    try {
      const res = await getHistories(missing);
      const incoming = toHistoryMap(res?.histories);
      if (!Object.keys(incoming).length) {
        historyLog.warn('empty', { phase: 'history', count: missing.length, ms: Date.now() - historyStarted });
      } else {
        historyLog.debug('response', {
          phase: 'history',
          count: Object.keys(incoming).length,
          ms: Date.now() - historyStarted,
        });
      }
      mergeHistories(incoming);
      historyCooldownUntil.current = 0;
      Object.keys(incoming).forEach((slug) => {
        const prev = historyAttempts.current[slug] ?? 0;
        historyAttempts.current[slug] = prev + 1;
        historyResolved.current.add(slug);
      });
      missing.forEach((it) => {
        const prev = historyAttempts.current[it.slug] ?? 0;
        historyAttempts.current[it.slug] = prev + 1;
        if (!historyResolved.current.has(it.slug) && historyAttempts.current[it.slug] >= 2) {
          historyResolved.current.add(it.slug);
        }
      });
    } catch (err) {
      const error = formatError(err);
      historyLog.warn('failed', {
        phase: 'history',
        error,
        errorType: toErrorType(error),
        ms: Date.now() - historyStarted,
      });
      historyCooldownUntil.current = Date.now() + 60 * 1000;
      missing.forEach((it) => {
        const prev = historyAttempts.current[it.slug] ?? 0;
        historyAttempts.current[it.slug] = prev + 1;
        if (historyAttempts.current[it.slug] >= 2) {
          historyResolved.current.add(it.slug);
        }
      });
    } finally {
      historyLog.debug('resolved', { phase: 'history', count: historyResolved.current.size });
      historyRequestInProgress.current = false;
    }
  }, [safeItems, mergeHistories, stableCacheHash]);

  const trayWidth = flightOpen ? '250px' : '0px';
  const trayGap = flightOpen ? '2vw' : '0';

  const extractColorMap = useCallback((data: unknown): Record<string, string> => {
    if (!data || typeof data !== 'object') return {};
    const root = isRecord(data) ? data : null;
    const resultObj = root && isRecord(root.result) ? root.result : null;
    const nestedResult = resultObj && isRecord(resultObj.result) ? resultObj.result : null;
    const colors =
      (root && isRecord(root.colors) ? root.colors : null) ??
      (resultObj && isRecord(resultObj.colors) ? resultObj.colors : null) ??
      (nestedResult && isRecord(nestedResult.colors) ? nestedResult.colors : null) ??
      null;
    if (!colors) return {};
    const map: Record<string, string> = {};
    Object.entries(colors).forEach(([id, val]) => {
      if (!id || !val) return;
      if (typeof val === 'string') {
        map[id] = val;
      } else if (isRecord(val) && typeof val.hex === 'string') {
        const hexVal = val.hex;
        map[id] = hexVal;
      }
    });
    return map;
  }, []);

  const extractMatchesAndHistory = useCallback((data: unknown) => {
    if (!isRecord(data)) return { matches: [], historyMap: {} };
    const asRecord = data;
    const fromResult = isRecord(asRecord.result) ? asRecord.result : null;
    const fromNested = fromResult && isRecord(fromResult.result) ? fromResult.result : null;
    const matches = toMatches(
      asRecord.matches ??
      fromResult?.matches ??
      fromNested?.matches ??
      (isRecord(asRecord.data) ? asRecord.data.matches : null)
    );
    const historyMap = toHistoryMap(
      asRecord.history_map ??
      fromResult?.history_map ??
      fromNested?.history_map ??
      (isRecord(asRecord.data) ? asRecord.data.history_map : null)
    );
    return { matches, historyMap };
  }, []);

  const decoratedItems = useMemo<BeerItem[]>(() => {
    if (!safeItems.length) return safeItems;
    const ranked = safeItems.map((b) => {
      const slug = slugify(b.name ?? '');
      const isRec = recommendedIds.has(String(b.id)) || recommendedIds.has(slug);
      const history = historyByName[slug];
      const meta = recMeta[slug];
      const next = isRec || history || meta
        ? {
            ...b,
            recommended: isRec,
            history_fun: history ?? null,
            recommendationScore: meta?.score ?? null,
            recommendationConfidence: meta?.confidence ?? null,
            recommendationMatchSentence: meta?.matchSentence ?? null,
          }
        : b;
      if (showRecommendations) {
        recLog.debug('rank', { phase: 'recommendations', name: b.name, slug, isRec, recommended: next.recommended });
      }
      return next;
    });
    return ranked.slice().sort((a, b) => {
      const sa = a.recommendationScore ?? -1;
      const sb = b.recommendationScore ?? -1;
      if (sa === sb) return 0;
      return sb - sa;
    });
  }, [safeItems, recommendedIds, historyByName, recMeta, showRecommendations]);

  const applyRecommendations = useCallback((matches: unknown) => {
    const safeMatches = toMatches(matches);
    const ids = new Set<string>();
    const metaMap: Record<string, { score: number | null; confidence: string | null; matchSentence: string | null }> = {};
    safeMatches.forEach((m) => {
      const beerName = m?.beer?.name;
      if (beerName) {
        const key = slugify(beerName);
        ids.add(key);
        metaMap[key] = {
          score: typeof m.score === 'number' ? m.score : null,
          confidence: m.confidence ?? null,
          matchSentence: m.match_sentence ?? m.matchSentence ?? null,
        };
      }
    });
    recLog.info('apply', { phase: 'recommendations', count: ids.size });
    setRecommendedIds(ids);
    setRecMeta(metaMap);
  }, []);

  const applyHistoryOnly = useCallback(
    (matches: unknown, historyMapFromResult?: unknown) => {
      const safeHistory = toHistoryMap(historyMapFromResult ?? (isRecord(pairingData) ? pairingData.history_map : null));
      if (Object.keys(safeHistory).length) {
        mergeHistories(safeHistory);
      }
      const safeMatches = toMatches(matches);
      if (safeMatches.length) {
        scheduleIdle(() => void fetchAndMergeHistories(), 800);
      }
    },
    [fetchAndMergeHistories, mergeHistories, pairingData]
  );

  const body = (() => {
    if (!ready) return <p>Loading…</p>;
    if (!safeItems.length) return <p>No beers found. Ensure the Untappd snapshot is available.</p>;
    return (
      <BeerList
        items={decoratedItems}
        allowColorFetch={allowColors && pairingFetched}
        showHistory={pairingFetched}
        onFlightOpen={() => setFlightOpen(true)}
        colorMapOverride={colorMapOverride}
        flightFull={slots.filter(Boolean).length >= 5}
        pairingsState={staticPairings}
      />
    );
  })();

  useEffect(() => {
    if (!stableCacheHash) return;
    const cached = readAnyCachedPairing();
    const hydrate = (data: PairingResponse, fetchedAt?: number | null) => {
      setPairingData(data);
      setShowRecommendations(false);
      const cachedColors = extractColorMap(data);
      if (Object.keys(cachedColors).length) {
        setColorMapOverride(cachedColors);
      }
      const { matches, historyMap } = extractMatchesAndHistory(data);
      if (matches.length) {
        applyHistoryOnly(matches, historyMap);
        // Do not apply recommendations/highlights on cached load; wait for explicit submit.
        setShowRecommendations(false);
      }
      setPairingFetched(true);
      triggerStaticPairings('cached');
      if (typeof fetchedAt === 'number') {
        setLastFetched(fetchedAt);
      }
    };
    if (cached) {
      hydrate(cached);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await getPairingCache(stableCacheHash);
        if (cancelled || !res?.data) return;
        const fetchedAtMs = typeof res.fetchedAt === 'number' ? res.fetchedAt * 1000 : Date.now();
        writePairingCache(makeAnswerKey(EMPTY_PREPARED), res.data);
        hydrate(res.data, fetchedAtMs);
      } catch {
        // ignore missing cache
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    stableCacheHash,
    readAnyCachedPairing,
    applyHistoryOnly,
    extractColorMap,
    setColorMapOverride,
    extractMatchesAndHistory,
    fetchAndMergeHistories,
    writePairingCache,
    makeAnswerKey,
  ]);

  const colorApplied = useRef(false);

  const handleFetchPairing = useCallback(async (preparedOverride?: PreparedAnswers | null): Promise<PairingResponse | null> => {
    setFetchStatus('loading');
    setFetchError('');
    const prepared = toPreparedAnswers(preparedOverride ?? preparedAnswers ?? EMPTY_PREPARED);
    const key = makeAnswerKey(prepared);
    const cached = readPairingCache(key);
      if (cached?.data) {
        log.info('cache.hit', { phase: 'cache', key, fetchedAt: cached?.fetchedAt ?? null, hash: stableCacheHash || null });
        setPairingData(cached.data);
        const { matches: cachedMatches, historyMap: cachedHistory } = extractMatchesAndHistory(cached.data);
        if (cachedMatches.length) {
          applyHistoryOnly(cachedMatches, cachedHistory);
        }
        setAllowColors(true);
        setLastFetched(cached.fetchedAt ?? Date.now());
        setPairingFetched(true);
        setFetchStatus('success');
        triggerStaticPairings('cached');
        return cached.data;
    }
    try {
      // Preload should only hydrate cache/history/colors, not compute recommendations.
      const cacheBeerItems = Array.isArray(pairingCacheBeerData?.items) ? pairingCacheBeerData?.items : null;
      const preloadStarted = Date.now();
      log.info('preload.start', {
        phase: 'preload',
        hasBeerData: !!cacheBeerItems,
        hasFoodData: !!pairingCacheFoodData,
        hash: stableCacheHash || null,
      });
      const result = toPairingResponse(await preloadPairing(
        cacheBeerItems ?? safeItems,
        prepared as unknown as Record<string, unknown>,
        pairingCacheFoodData ?? null
      ));
      const preloadColors = extractColorMap(result);
      const { matches: preloadMatches, historyMap: preloadHistory } = extractMatchesAndHistory(result);
      log.info('preload.success', {
        phase: 'preload',
        hasResult: !!result,
        colors: Object.keys(preloadColors).length,
        matches: preloadMatches.length,
        history: Object.keys(preloadHistory).length,
        ms: Date.now() - preloadStarted,
        hash: stableCacheHash || null,
      });
      setPairingData(result);
      setShowRecommendations(false); // defer highlighting until user submits
      const colors = extractColorMap(result);
      const hasColors = Object.keys(colors).length > 0;
      if (hasColors) {
        setColorMapOverride(colors);
        const hasAllColors = safeItems.length > 0 && Object.keys(colors).length >= safeItems.length;
        if (hasAllColors) {
          setAllowColors(false);
        }
      }
      const { matches: resultMatches, historyMap: resultHistory } = extractMatchesAndHistory(result);
      if (resultMatches.length) {
        applyHistoryOnly(resultMatches, resultHistory);
      }
      if (result && session) {
        writePairingCache(key, result);
      }
      setPairingFetched(true);
      if (refreshColors && !colorApplied.current && !hasColors) {
        scheduleIdle(() => {
          refreshColors(true);
          colorApplied.current = true;
        }, 800);
      }
      setAllowColors(true);
      setLastFetched(Date.now());
      setFetchStatus('success');
      triggerStaticPairings('preload');
      return result;
    } catch (err) {
      const error = formatError(err);
      log.error('preload.error', {
        phase: 'preload',
        error,
        errorType: toErrorType(error),
        hash: stableCacheHash || null,
      });
      const fallback = readAnyCachedPairing();
      if (fallback) {
        setPairingData(fallback);
        const { matches, historyMap: fallbackHistory } = extractMatchesAndHistory(fallback);
        if (Array.isArray(matches) && matches.length) {
          applyHistoryOnly(matches, fallbackHistory);
          setFetchStatus('success');
          setFetchError('Using last saved pairing (live fetch timed out).');
          setPairingFetched(true);
          const colors = extractColorMap(fallback);
          if (Object.keys(colors).length) {
            setColorMapOverride(colors);
            const hasAllColors = safeItems.length > 0 && Object.keys(colors).length >= safeItems.length;
            if (hasAllColors) {
              setAllowColors(false);
            }
          }
          return fallback;
        }
      }
      setFetchStatus('error');
      setFetchError('Unable to fetch data (service timed out).');
      return null;
    }
  }, [
    preparedAnswers,
    makeAnswerKey,
    readPairingCache,
    extractMatchesAndHistory,
    applyHistoryOnly,
    extractColorMap,
    safeItems,
    refreshColors,
    staticPairings,
    writePairingCache,
    pairingCacheBeerData,
    pairingCacheFoodData,
    fetchAndMergeHistories,
  ]);

  const statusCheckedRef = useRef<string>('');

  useEffect(() => {
    if (!isAdmin || !stableCacheHash || !localStore) return;
    if (!pairingCacheMeta?.hash) return;
    if (statusCheckedRef.current === stableCacheHash) return;
    statusCheckedRef.current = stableCacheHash;
    const throttleKey = `bt_pairing_autopreload_${stableCacheHash}`;
    const lastRaw = localStore.getItem(throttleKey);
    const last = lastRaw ? Number(lastRaw) : 0;
    const now = Date.now();
    const THROTTLE_MS = 24 * 60 * 60 * 1000;
    if (last && now - last < THROTTLE_MS) return;
    let cancelled = false;
    void (async () => {
      try {
        const status = await getPairingCacheStatus(stableCacheHash);
        if (cancelled || status?.cached) return;
        localStore.setItem(throttleKey, String(now));
        await handleFetchPairing(EMPTY_PREPARED);
      } catch {
        // ignore status failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stableCacheHash, isAdmin, localStore, handleFetchPairing]);

  const handleSubmit = async (preparedOverride?: PreparedAnswers | null): Promise<void> => {
    setError('');
    setSuccessMessage('');
    setLoading(true);
    const prepared = toPreparedAnswers(preparedOverride ?? preparedAnswers ?? EMPTY_PREPARED);
    const key = makeAnswerKey(prepared);

    try {
      const fetchedRaw = /** @type {unknown} */ (await fetchPairing(prepared));
      const fetched = toPairingResponse(fetchedRaw);
      log.info('submit.success', { phase: 'submit', hasResult: !!fetched, hash: stableCacheHash || null });
      if (fetched && session) {
        writePairingCache(key, fetched);
      }
      setPairingData(fetched ?? null);
      // Pairing response provides recommendations based on answers + beer data.
      const { matches, historyMap } = extractMatchesAndHistory(fetched);
      if (matches.length) {
        applyRecommendations(matches);
        applyHistoryOnly(matches, historyMap);
        setShowRecommendations(true);
        setSuccessMessage('5 Beers recommended based on your answers!');
      } else {
        setError('No pairing data yet. Click "Fetch Pairings" first.');
      }
      const colors = extractColorMap(fetched);
      if (Object.keys(colors).length) {
        setColorMapOverride(colors);
        const hasAllColors = safeItems.length > 0 && Object.keys(colors).length >= safeItems.length;
        if (hasAllColors) {
          setAllowColors(false);
        }
      }
    } catch (err) {
      const error = formatError(err);
      log.error('submit.error', { phase: 'submit', error, errorType: toErrorType(error), hash: stableCacheHash || null });
      setError('Unable to fetch pairing right now.');
      setSuccessMessage('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LiveAnnouncerProvider>
      <div className="pairing-app">
        <div id="flight-announcer" className="sr-only" aria-live="polite" aria-atomic="true" />
        <header>
          <h2>Beers on tap</h2>
        </header>
        <button type="button" className="help-btn" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? 'Close - Help me decide' : 'Help me decide'}
        </button>
        <PairingForm
          open={formOpen}
          loading={loading}
          error={error}
          success={successMessage}
          onSubmit={(vals) => {
            void handleSubmit(vals);
          }}
          onPreparedChange={(vals) => setPreparedAnswers(vals)}
          onInteraction={() => setShowRecommendations(false)}
        />
        <div className="flight-toggle-bar">
          <button
            type="button"
            className="flight-toggle-btn"
            onClick={() => setFlightOpen((v) => !v)}
            aria-expanded={flightOpen}
            aria-controls="flight-tray"
          >
            {flightOpen ? 'Hide flight' : 'Show flight'}
          </button>
        </div>
        <div className="beerWrapper" style={{ '--tray-width': trayWidth, '--tray-gap': trayGap } as React.CSSProperties}>
          {body}
          <FlightTray open={flightOpen} colorMap={colorMapOverride} />
        </div>
        
      </div>
    </LiveAnnouncerProvider>
  );
}

function slugify(value: string | number | null | undefined) {
  const str = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
  const base = str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `beer-${Math.random().toString(36).slice(2)}`;
}
