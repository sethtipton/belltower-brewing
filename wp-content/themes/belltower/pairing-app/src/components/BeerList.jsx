import React, { useEffect, useMemo, useRef, useState } from 'react';
import BeerCard from './BeerCard';
import {
  fetchBeerColorsBatch,
  getCachedColors,
  setCachedColors,
  isCacheStale,
  observeVisibleIds,
} from '../utils/beerColor';

import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';
import useFlight from '../hooks/useFlight';

/**
 * @typedef {Object} Beer
 * @property {string | number} id
 * @property {string} name
 * @property {string | null | undefined} [style]
 * @property {number | null | undefined} [abv]
 * @property {number | null | undefined} [ibu]
 * @property {string | null | undefined} [description]
 * @property {string | null | undefined} [hexColor]
 * @property {string | null | undefined} [btKey]
 * @property {unknown} [pairingProfile]
 * @property {boolean | undefined} [recommended]
 * @property {string | null | undefined} [recommendationMatchSentence]
 * @property {number | null | undefined} [recommendationScore]
 * @property {string | null | undefined} [recommendationConfidence]
 * @property {string | null | undefined} [history_fun]
 */

const CACHE_KEY = 'bt_beer_colors_v1';
/**
 * @param {{
 *  items?: Beer[];
 *  allowColorFetch?: boolean;
 *  showHistory?: boolean;
 *  onFlightOpen?: () => void;
 *  colorMapOverride?: Record<string, string> | null;
 *  flightFull?: boolean;
 *  pairingsState?: {
 *    status: string;
 *    error?: string;
 *    pairingsByBeerKey?: Record<string, { mains?: Array<{ foodKey?: string; why?: string }>; side?: { foodKey?: string; why?: string } | null }>;
 *    foodByKey?: Record<string, { name?: string }>;
 *    ensureLoaded?: (force?: boolean) => void;
 *    available?: boolean;
 *  };
 * }} props
 */
export default function BeerList({
  items = [],
  allowColorFetch = true,
  showHistory = false,
  onFlightOpen,
  colorMapOverride = null,
  flightFull = false,
  pairingsState = null,
}) {
  const itemList = /** @type {Beer[]} */ (items ?? []);
  const overrideMap = colorMapOverride && typeof colorMapOverride === 'object'
    ? /** @type {Record<string, string>} */ (colorMapOverride)
    : null;
  /** @type {React.MutableRefObject<HTMLDivElement | null>} */
  const listRef = useRef(null);
  const prefersReduced = usePrefersReducedMotion();
  const announcerRef = useRef(null);
  const { slots } = /** @type {{ slots: Array<Beer | null> }} */ (useFlight());
  const orderedIds = useMemo(() => itemList.map((b) => String(b.id)), [itemList]);
  const [colorFetchFailed, setColorFetchFailed] = useState(false);
  const [colorMap, setColorMap] = useState(() => {
    const cached = getCachedColors(CACHE_KEY);
    if (
      cached &&
      typeof cached === 'object' &&
      !isCacheStale(cached) &&
      'colors' in cached &&
      cached.colors &&
      typeof cached.colors === 'object'
    ) {
      return /** @type {Record<string, string>} */ (cached.colors);
    }
    return {};
  });

  const mergedColorMap = useMemo(() => {
    if (overrideMap && Object.keys(overrideMap).length) {
      return { ...colorMap, ...overrideMap };
    }
    return colorMap;
  }, [colorMap, overrideMap]);

  const itemsById = useMemo(() => {
    /** @type {Record<string, Beer>} */
    const map = {};
    itemList.forEach((b) => { map[String(b.id)] = b; });
    return map;
  }, [itemList]);

  const missingIds = useMemo(() => {
    return itemList
      .filter((b) => {
        const id = String(b.id);
        return !b.hexColor && !mergedColorMap[id] && b.description;
      })
      .map((b) => String(b.id));
  }, [itemList, mergedColorMap]);

  useEffect(() => {
    if (!allowColorFetch || !missingIds.length || colorFetchFailed) return;
    let cancelled = false;

    /**
     * @param {Record<string, string>} incoming
     */
    const mergeAndCache = (incoming) => {
      if (!incoming || typeof incoming !== 'object' || !Object.keys(incoming).length) return;
      setColorMap((prev) => {
        const next = { ...prev, ...incoming };
        setCachedColors(CACHE_KEY, next, { version: 'v1' });
        return next;
      });
    };

    /** @param {string[]} ids */
    const fetchBatch = async (ids) => {
      const payload = /** @type {Array<{ id: string; description: string }>} */ (
        ids
          .map((id) => {
            const beer = itemsById[id];
            if (!beer) return null;
            return { id, description: beer.description ?? '' };
          })
          .filter(Boolean)
      );
      if (!payload.length) return;
      try {
        const map = await fetchBeerColorsBatch(payload);
        if (!cancelled) mergeAndCache(map);
      } catch (err) {
        console.warn('Beer colors - React2 batch failed', err);
        setColorFetchFailed(true); // stop retrying if the endpoint is failing
      }
    };

    const run = async () => {
      const visibleIds = await observeVisibleIds(listRef, missingIds);
      const visibleSet = new Set(visibleIds || []);
      const visibleBatch = missingIds.filter((id) => visibleSet.has(id));
      const restBatch = missingIds.filter((id) => !visibleSet.has(id));

      if (visibleBatch.length) {
        await fetchBatch(visibleBatch);
      }

      const fetchRest = () => {
        if (cancelled || !restBatch.length) return;
        void fetchBatch(restBatch);
      };

      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(fetchRest, { timeout: 500 });
      } else {
        setTimeout(fetchRest, 150);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [missingIds, itemsById, allowColorFetch, colorFetchFailed]);

  const decorated = useMemo(() => {
    if (!items.length) return [];
    return orderedIds
      .map((id) => itemsById[id])
      .filter(Boolean)
      .map((b) => {
        const hex = b.hexColor ?? mergedColorMap[String(b.id)] ?? null;
        return hex ? { ...b, hexColor: hex } : b;
      });
  }, [orderedIds, itemsById, mergedColorMap]);

  const flightIds = useMemo(
    () => new Set(slots.filter(Boolean).map((s) => String(s.id))),
    [slots]
  );

  if (!decorated.length) return null;
  return (
    <>
      <div className="sr-only" aria-live="polite" ref={announcerRef} />
      <div className="beer-list" ref={listRef}>
        {decorated.map((beer) => {
          const id = String(beer.id);
          const beerKey = beer.btKey ?? '';
          const entry = beerKey && pairingsState?.pairingsByBeerKey
            ? pairingsState.pairingsByBeerKey[beerKey]
            : null;
          const pairingsToken = `${pairingsState?.status ?? 'idle'}:${beerKey}:${entry?.mains?.length ?? 0}:${entry?.side?.foodKey ?? ''}`;
          return (
            <BeerCard
              key={id}
              beer={beer}
              showSettle={false}
              prefersReduced={prefersReduced}
              showHistory={showHistory}
              selected={flightIds.has(id)}
              flightFull={flightFull}
              onFlightOpen={onFlightOpen}
              pairingsState={pairingsState}
              pairingsToken={pairingsToken}
            />
          );
        })}
      </div>
    </>
  );
}
