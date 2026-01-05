import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useBeerData } from './hooks/useBeerData';
import BeerList from './components/BeerList';
import { LiveAnnouncerProvider } from './components/LiveAnnouncer';
import { PairingFetcher } from './components/PairingFetcher';
import { preloadPairing, getHistories } from './api';
import FlightTray from './components/FlightTray';
import { PairingForm } from './components/PairingForm';
import { useStaticPairings } from './staticPairings';
import './styles/styles.scss';
import useFlight from './hooks/useFlight';

interface PreparedAnswers { mood: string; body: string; bitterness: string; flavorFocus: string[]; alcoholPreference: string }
interface PairingMatch {
  beer?: {
    name?: string;
    id?: string | number;
    description?: string;
    style?: string;
    hex?: string | null;
    hexColor?: string | null;
  } | null;
  score?: number | null;
  confidence?: string | null;
  match_sentence?: string | null;
  matchSentence?: string | null;
}
interface PairingResponse {
  matches?: PairingMatch[] | null;
  history_map?: Record<string, string> | null;
  colors?: Record<string, string> | null;
  result?: unknown;
  data?: unknown;
}
interface PairingCacheEntry { data?: PairingResponse | null; fetchedAt?: number | null }
interface BeerItem {
  id: string;
  name: string;
  description: string;
  style: string;
  hexColor: string | null;
  btKey?: string | null;
  pairingProfile?: unknown;
  recommended?: boolean;
  recommendationScore?: number | null;
  recommendationConfidence?: string | null;
  recommendationMatchSentence?: string | null;
  history_fun?: string | null;
}
interface MatchLike { beer?: unknown; score?: unknown; confidence?: unknown; match_sentence?: unknown; matchSentence?: unknown }
type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

const PAIRING_MAP_KEY = 'bt_pairing_cache_v1_map';
const HISTORY_CACHE_KEY = 'bt_history_cache_v1';
const EMPTY_PREPARED: PreparedAnswers = { mood: '', body: '', bitterness: '', flavorFocus: [], alcoholPreference: '' };
const noop = (): void => undefined;
const session = typeof globalThis !== 'undefined' ? globalThis.sessionStorage : null;
const logger = typeof globalThis !== 'undefined' && globalThis.console
  ? globalThis.console
  : { log: noop, warn: noop, error: noop };
const isRecord = (val: unknown): val is Record<string, unknown> => Boolean(val) && typeof val === 'object' && !Array.isArray(val);
const formatError = (err: unknown): string => (err instanceof Error ? err.message : String(err));
const isMatchLike = (val: unknown): val is MatchLike => isRecord(val);

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
        score: 'score' in entry && typeof entry.score === 'number' ? entry.score : null,
        confidence: 'confidence' in entry && typeof entry.confidence === 'string' ? entry.confidence : null,
        match_sentence: 'match_sentence' in entry && typeof entry.match_sentence === 'string' ? entry.match_sentence : null,
        matchSentence: 'matchSentence' in entry && typeof entry.matchSentence === 'string' ? entry.matchSentence : null,
      };
      matches.push(match);
    }
  });
  return matches;
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

function toBeerItem(raw: unknown): BeerItem | null {
  if (!isRecord(raw)) return null;
  const obj = raw;
  const name = typeof obj.name === 'string' ? obj.name : '';
  const idVal = obj.id;
  const id = typeof idVal === 'string' || typeof idVal === 'number' ? String(idVal) : name || 'beer-' + Math.random().toString(36).slice(2);
  const description = typeof obj.description === 'string' ? obj.description : '';
  const style = typeof obj.style === 'string' ? obj.style : '';
  const hexColor = typeof obj.hexColor === 'string' ? obj.hexColor : typeof obj.hex === 'string' ? obj.hex : null;
  const btKey = typeof obj.btKey === 'string' ? obj.btKey : null;
  const pairingProfile = 'pairingProfile' in obj ? obj.pairingProfile : undefined;
  const item: BeerItem = {
    id,
    name,
    description,
    style,
    hexColor,
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
  const [pairingFetched, setPairingFetched] = useState(false);
  const [flightOpen, setFlightOpen] = useState(true);
  const [colorMapOverride, setColorMapOverride] = useState<Record<string, string>>({});
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [preparedAnswers, setPreparedAnswers] = useState<PreparedAnswers | null>(null);
  const safeItems = useMemo<BeerItem[]>(() => toBeerArray(items), [items]);
  const [successMessage, setSuccessMessage] = useState('');
  const staticPairings = useStaticPairings({ beers: safeItems });

  const makeAnswerKey = useCallback((a: PreparedAnswers | null | undefined) => {
    const prepared = toPreparedAnswers(a);
    const flavors = prepared.flavorFocus.length ? [...prepared.flavorFocus].sort().join(',') : 'none';
    return [prepared.mood ?? 'none', prepared.body ?? 'none', prepared.bitterness ?? 'none', flavors || 'none', prepared.alcoholPreference ?? 'none']
      .join('|')
      .toLowerCase();
  }, []);

  const readPairingCache = useCallback(
    (key: string): PairingCacheEntry | null => {
      if (!session) return null;
      try {
        const raw = session.getItem(PAIRING_MAP_KEY);
        if (!raw) return null;
        const map = toPairingCacheMap(JSON.parse(raw));
        const found = Object.entries(map).find(([cacheKey]) => cacheKey === key);
        return found ? found[1] : null;
      } catch {
        return null;
      }
    },
    []
  );

  const writePairingCache = useCallback(
    (key: string, data: unknown) => {
      if (!session) return;
      try {
        const raw = session.getItem(PAIRING_MAP_KEY);
        const parsed: Record<string, PairingCacheEntry> = raw ? toPairingCacheMap(JSON.parse(raw)) : {};
        const nextMap: Record<string, PairingCacheEntry> = {};
        Object.assign(nextMap, parsed);
        const entry: PairingCacheEntry = {
          data: isRecord(data) ? (data as PairingResponse) : null,
          fetchedAt: Date.now(),
        };
        nextMap[String(key)] = entry;
        session.setItem(PAIRING_MAP_KEY, JSON.stringify(nextMap));
      } catch {
        // ignore storage errors
      }
    },
    []
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
          logger.log('[History] saved', slug, val.slice(0, 80) + '…');
        });
        persistHistoryCache(next);
        return next;
      });
    },
    [persistHistoryCache]
  );

  const readAnyCachedPairing = useCallback((): PairingResponse | null => {
    if (!session) return null;
    try {
      const rawMap = session.getItem(PAIRING_MAP_KEY);
      if (rawMap) {
        const parsedMap = toPairingCacheMap(JSON.parse(rawMap));
        const firstKey = Object.keys(parsedMap || {})[0];
        if (firstKey && parsedMap[firstKey]?.data) return parsedMap[firstKey].data;
      }
      const rawSingle = session.getItem('bt_pairing_cache_v1');
      if (rawSingle) {
        const parsed: unknown = JSON.parse(rawSingle);
        if (parsed && typeof parsed === 'object' && 'data' in parsed) {
          const entry = parsed as { data?: unknown };
          if (entry.data) return entry.data as PairingResponse;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const fetchAndMergeHistories = useCallback(async () => {
    if (historyRequestInProgress.current) return;
    if (!safeItems.length) return;
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
    logger.log('[History] request', missing.map((p) => p.slug));
    try {
      const res = await getHistories(missing);
      const incoming = toHistoryMap(res?.histories);
      if (!Object.keys(incoming).length) {
        logger.warn('[History] empty response', { payload: missing, res });
      } else {
        logger.log('[History] response', incoming);
      }
      mergeHistories(incoming);
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
      logger.warn('[History] fetch failed', formatError(err));
      missing.forEach((it) => {
        const prev = historyAttempts.current[it.slug] ?? 0;
        historyAttempts.current[it.slug] = prev + 1;
        if (historyAttempts.current[it.slug] >= 2) {
          historyResolved.current.add(it.slug);
        }
      });
    } finally {
      logger.log('[History] resolved slugs', Array.from(historyResolved.current));
      historyRequestInProgress.current = false;
    }
  }, [safeItems, mergeHistories]);

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
        logger.log('[Rec]', { name: b.name, slug, isRec, recommended: next.recommended, recommendedIds: Array.from(recommendedIds) });
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
    logger.log('[Pairing] applyRecommendations', { ids: Array.from(ids), metaMap });
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
        void fetchAndMergeHistories();
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
        allowColorFetch={allowColors}
        showHistory={pairingFetched}
        onFlightOpen={() => setFlightOpen(true)}
        colorMapOverride={colorMapOverride}
        flightFull={slots.filter(Boolean).length >= 5}
        pairingsState={staticPairings}
      />
    );
  })();

  useEffect(() => {
    const cached = readAnyCachedPairing();
    if (!cached) return;
    setPairingData(cached);
    setShowRecommendations(false);
    const cachedColors = extractColorMap(cached);
    if (Object.keys(cachedColors).length) {
      setColorMapOverride(cachedColors);
    }
    const { matches, historyMap } = extractMatchesAndHistory(cached);
    if (matches.length) {
      applyHistoryOnly(matches, historyMap);
      // Do not apply recommendations/highlights on cached load; wait for explicit submit.
      setShowRecommendations(false);
    }
    setPairingFetched(true);
    void fetchAndMergeHistories();
  }, [readAnyCachedPairing, applyHistoryOnly, extractColorMap, setColorMapOverride, extractMatchesAndHistory, fetchAndMergeHistories]);

  const colorApplied = useRef(false);

  const handleFetchPairing = async (preparedOverride?: PreparedAnswers | null): Promise<PairingResponse | null> => {
    setFetchStatus('loading');
    setFetchError('');
    const prepared = toPreparedAnswers(preparedOverride ?? preparedAnswers ?? EMPTY_PREPARED);
    const key = makeAnswerKey(prepared);
    const cached = readPairingCache(key);
      if (cached?.data) {
        logger.log('[Pairing] using cached pairing for key', key, cached);
        setPairingData(cached.data);
        const { matches: cachedMatches, historyMap: cachedHistory } = extractMatchesAndHistory(cached.data);
        if (cachedMatches.length) {
          applyHistoryOnly(cachedMatches, cachedHistory);
        }
        setAllowColors(true);
        setLastFetched(cached.fetchedAt ?? Date.now());
        setPairingFetched(true);
        setFetchStatus('success');
        logger.log('[Static pairings] trigger after cached pairing');
        void staticPairings.ensureLoaded();
        return cached.data;
      }
    try {
      logger.log('[Pairing] preload starting');
      // Preload should only hydrate cache/history/colors, not compute recommendations.
      const result = await preloadPairing(safeItems, prepared);
      logger.log('[Pairing] preload result', result);
      setPairingData(result);
      setShowRecommendations(false); // defer highlighting until user submits
      const colors = extractColorMap(result);
      if (Object.keys(colors).length) {
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
        session.setItem('bt_pairing_cache_v1', JSON.stringify({ data: result, fetchedAt: Date.now() }));
        writePairingCache(key, result);
      }
      setPairingFetched(true);
      if (refreshColors && !colorApplied.current) {
        refreshColors(true);
        colorApplied.current = true;
      }
      setAllowColors(true);
      setLastFetched(Date.now());
      setFetchStatus('success');
      logger.log('[Static pairings] trigger after preload pairing');
      void staticPairings.ensureLoaded();
      return result;
    } catch (err) {
      logger.error(formatError(err));
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
  };

  const handleSubmit = async (preparedOverride?: PreparedAnswers | null): Promise<void> => {
    setError('');
    setSuccessMessage('');
    setLoading(true);
    const prepared = toPreparedAnswers(preparedOverride ?? preparedAnswers ?? EMPTY_PREPARED);
    const key = makeAnswerKey(prepared);

    try {
      const fetchedRaw = /** @type {unknown} */ (await fetchPairing(prepared));
      const fetched = isRecord(fetchedRaw) ? /** @type {PairingResponse} */ (fetchedRaw) : null;
      logger.log('[Pairing] submit fetchPairing result', fetched);
      if (fetched && session) {
        session.setItem('bt_pairing_cache_v1', JSON.stringify({ data: fetched, fetchedAt: Date.now() }));
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
      logger.error('[Pairing] submit fetch failed', formatError(err));
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
        <PairingFetcher
          onPairing={(data) => setPairingData(data)}
          onFetch={handleFetchPairing}
          status={fetchStatus}
          errorMessage={fetchError}
          lastFetched={lastFetched}
          pairingsReady={staticPairings.available}
        />
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
          onPreparedChange={setPreparedAnswers}
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
        <div className="beerWrapper" style={{ '--tray-width': trayWidth, '--tray-gap': trayGap }}>
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
