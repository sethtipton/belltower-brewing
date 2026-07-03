// BeerCard.jsx
import React, { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { pickForeground } from '../utils/beerColor';
import Pint from './Pint';
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
 * @property {boolean | undefined} [recommended]
 * @property {string | null | undefined} [recommendationMatchSentence]
 * @property {number | null | undefined} [recommendationScore]
 * @property {string | null | undefined} [recommendationConfidence]
 * @property {string | null | undefined} [history_fun]
 * @property {string | null | undefined} [history_text]
 * @property {string | null | undefined} [fun_facts_text]
 */

const MotionCard = React.memo(
  /**
   * @param {{
   *  beer: Beer;
   *  showSettle?: boolean;
   *  prefersReduced?: boolean;
 *  showHistory?: boolean;
 *  showFunFacts?: boolean;
 *  selected?: boolean;
 *  onSelect?: () => void;
 *  flightFull?: boolean;
 *  ctaLabel?: string;
 *  pairingsState?: {
 *    status: string;
 *    error?: string;
 *    pairingsByBeerKey?: Record<string, { mains?: Array<{ foodKey?: string; pairingReason?: string }>; side?: { foodKey?: string; pairingReason?: string } | null }>;
 *    foodByKey?: Record<string, { name?: string }>;
 *    ensureLoaded?: (force?: boolean) => void;
 *    lastUpdated?: string | null;
 *    cacheStore?: string;
 *  };
 *  pairingsToken?: string;
 * }} props
   */
  function MotionCard({
    beer,
    showSettle,
    prefersReduced,
    showHistory: enableHistory,
    showFunFacts: enableFunFacts,
    selected,
    onSelect,
    flightFull = false,
    ctaLabel,
    pairingsState,
    pairingsToken,
  }) {
    const tint = useMemo(() => beer?.hexColor ?? '#fff', [beer?.hexColor]);
    const fg = useMemo(() => pickForeground(tint), [tint]);
    const rgb = useMemo(() => hexToRgb(tint), [tint]);
    const isRecommended = Boolean(beer?.recommended);
    const historyText = enableHistory
      ? beer?.history_text ?? `Loading history for ${beer?.name ?? 'this beer'}.`
      : '';
    const funFactsText = enableFunFacts
      ? beer?.fun_facts_text ?? `Loading fun facts for ${beer?.name ?? 'this beer'}.`
      : '';
    const historyParagraphs = useMemo(() => {
      if (!historyText) return [];
      return historyText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
    }, [historyText]);
    const funFactsParagraphs = useMemo(() => {
      if (!funFactsText) return [];
      return funFactsText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
    }, [funFactsText]);
    const hasHistory = Boolean(historyParagraphs.length);
    const hasFunFacts = Boolean(funFactsParagraphs.length);
    const hasPairings = Boolean(pairingsState);
    const [activeTab, setActiveTab] = useState(/** @type {'history' | 'funFacts' | 'pairings' | 'none'} */ ('none'));
    /** @type {React.MutableRefObject<Record<string, HTMLButtonElement | null>>} */
    const tabRefs = useRef({});
    const score = beer?.recommendationScore;
    const confidence = beer?.recommendationConfidence;
    const scoreText = typeof score === 'number' ? score.toFixed(2) : null;
    const pairingsStatus = pairingsState?.status ?? 'idle';
    const pairingsError = pairingsState?.error ?? '';
    const pairingsUpdatedAt = useMemo(() => {
      if (!pairingsState?.lastUpdated) return null;
      const date = new Date(pairingsState.lastUpdated);
      return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
    }, [pairingsState?.lastUpdated]);
    const beerKey = beer?.btKey ?? '';
    const pairings = beerKey ? pairingsState?.pairingsByBeerKey?.[beerKey] : null;
    const foodByKey = pairingsState?.foodByKey ?? {};
    /** @type {{ history: string; funFacts: string; pairings: string }} */
    const tabIds = {
      history: `beer-tab-history-${beer.id}`,
      funFacts: `beer-tab-fun-facts-${beer.id}`,
      pairings: `beer-tab-pairings-${beer.id}`,
    };
    const panelIds = {
      history: `beer-panel-history-${beer.id}`,
      funFacts: `beer-panel-fun-facts-${beer.id}`,
      pairings: `beer-panel-pairings-${beer.id}`,
    };

    const showTabs = hasHistory || hasFunFacts || hasPairings;
    /** @type {{ key: 'history' | 'funFacts' | 'pairings'; label: string }[]} */
    const tabs = showTabs
      ? [
        ...(hasHistory ? [{ key: 'history', label: 'History' }] : []),
        ...(hasFunFacts ? [{ key: 'funFacts', label: 'Fun facts' }] : []),
        ...(hasPairings ? [{ key: 'pairings', label: 'Food pairings we suggest' }] : []),
      ]
      : [];

    const resolvedActiveTab = tabs.find((tab) => tab.key === activeTab)
      ? activeTab
      : 'none';
    const focusTabKey = resolvedActiveTab === 'none' ? tabs[0]?.key : resolvedActiveTab;

    /** @param {React.KeyboardEvent<HTMLDivElement>} event */
    const handleTabKeyDown = (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      if (!tabs.length) return;
      const idx = focusTabKey === 'none'
        ? 0
        : tabs.findIndex((tab) => tab.key === focusTabKey);
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (idx + delta + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (!nextTab) return;
      setActiveTab(nextTab.key);
      const ref = tabRefs.current[nextTab.key];
      if (ref && typeof ref.focus === 'function') {
        ref.focus();
      }
    };

    return (
      <div
        id={`beer-${beer.id}`}
        className={`beer-card${isRecommended ? ' recommended' : ''}${selected ? ' selected' : ''}`}
        style={{ '--beer-color': tint, '--beer-foreground': fg, '--beer-rgb': rgb }}
        data-settle={showSettle ? 'true' : 'false'}
        data-pairings-token={pairingsToken ?? ''}
      >
        <div className={`beer-card-layout${isRecommended && beer.recommendationMatchSentence ? ' with-recommendation match-open' : ''}`}>

            {isRecommended && beer.recommendationMatchSentence && (
              <div className="beer-card-sidebar match-open">
                <div className="badge badge-interactive" aria-live="polite">
                  <strong>Recommended</strong>
                  {scoreText ? (
                    <div className="beer-match-score">
                      Score: {scoreText}
                      {confidence ? ` (${confidence})` : ''}
                    </div>
                  ) : null}
                </div>
                <div
                  id={`recommendation-match-${beer.id}`}
                  className="beer-match ai-text"
                  aria-live="polite"
                >
                  {beer.recommendationMatchSentence}
                </div>
              </div>
            )}

            <div className="beer-card-leftclmn">

              <button
                type="button"
                className="beer-svg-wrap"
                aria-pressed={selected}
                aria-label={
                  selected
                    ? `Remove ${beer.name} from flight`
                    : flightFull
                    ? `Flight full. Pick a slot to replace to add ${beer.name}`
                    : `Add ${beer.name} to flight`
                }
                onClick={onSelect}
                >
                {/* Extracted Pint: only renders the SVG + animations */}
                  <Pint
                    tint={tint}
                    beer={beer}
                    prefersReduced={prefersReduced}
                    animateFill
                    animateFromEmpty
                    fillLevel={selected ? 0.4 : 1}
                    size={56}
                  />

                  <span className={`flight-toggle${selected ? ' flight-toggle-active' : ''}`}>
                    {ctaLabel ?? (selected ? 'Added' : flightFull ? 'Replace' : 'Add to flight')}
                  </span>
              </button>

            </div>
          
            <div className="beer-card-centerclmn">
              <div className="beer-card-title">
                <div className="beer-name">{beer.name}</div>
                  {beer.style && <div className="beer-style muted small">{beer.style}</div>}
                <div className="beer-meta">
                  {beer.abv !== null && beer.abv !== undefined ? `${beer.abv}%` : 'ABV N/A'}
                  {beer.ibu !== null && beer.ibu !== undefined ? ` • IBU ${beer.ibu}` : ''}
                </div>
              </div>
              {beer.description && <p className="beer-card-desc">{beer.description}</p>}
              {tabs.length ? (
                <motion.div className="beer-card-details" layout="position">
                  <div className="beer-card-tabs" role="tablist" aria-label="Beer details" onKeyDown={handleTabKeyDown}>
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        ref={(el) => {
                          if (el) tabRefs.current[tab.key] = el;
                        }}
                        type="button"
                        role="tab"
                        className="beer-card-tab"
                        id={tabIds[tab.key]}
                        aria-selected={resolvedActiveTab === tab.key}
                        aria-controls={panelIds[tab.key]}
                        tabIndex={tab.key === focusTabKey ? 0 : -1}
                        onClick={() => setActiveTab(resolvedActiveTab === tab.key ? 'none' : tab.key)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {resolvedActiveTab !== 'none' ? (
                    <motion.div
                      id={panelIds[resolvedActiveTab]}
                      role="tabpanel"
                      aria-labelledby={tabIds[resolvedActiveTab]}
                      className="beer-details-panel"
                      layout
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      {resolvedActiveTab === 'history' ? (
                        <motion.div
                          key="history"
                          className="beer-history-content ai-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.12 }}
                        >
                          {historyParagraphs.length
                            ? historyParagraphs.map((p, idx) => <p key={idx}>{p}</p>)
                            : <p>{historyText}</p>}
                        </motion.div>
                      ) : resolvedActiveTab === 'funFacts' ? (
                        <motion.div
                          key="funFacts"
                          className="beer-history-content ai-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.12 }}
                        >
                          {funFactsParagraphs.length
                            ? funFactsParagraphs.map((p, idx) => <p key={idx}>{p}</p>)
                            : <p>{funFactsText}</p>}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="pairings"
                          className="pairings-panel"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.12 }}
                        >
                          {pairingsStatus === 'loading' ? (
                            <p className='loading-pairings'>Loading pairings…</p>
                          ) : pairingsStatus === 'error' ? (
                            <div>
                              <p>Couldn’t load pairings. Try again.</p>
                              <button type="button" onClick={() => pairingsState?.ensureLoaded?.(true)}>
                                Retry
                              </button>
                              {pairingsError ? <div>{pairingsError}</div> : null}
                            </div>
                          ) : pairingsStatus === 'ready' ? (
                            beerKey && pairings ? (
                              <div className="pairings-results">
                                {pairingsUpdatedAt ? (
                                  <div className="muted small pairings-updated">
                                    <span>Pairings updated:</span>
                                    <span className="pairings-updated-time">{pairingsUpdatedAt}</span>
                                  </div>
                                ) : null}
                                <div className="pairings-block">
                                  <div className="muted small cat">Main</div>
                                  <ul>
                                    {(pairings.mains ?? []).map((entry, index) => {
                                      const foodKey = entry?.foodKey ?? '';
                                      const foodEntry = foodKey ? foodByKey?.[foodKey] : null;
                                      const dish = foodEntry && typeof foodEntry.name === 'string' ? foodEntry.name : null;
                                      const dishDescription = (() => {
                                        const entry = /** @type {unknown} */ (foodEntry);
                                        if (!entry || typeof entry !== 'object') return null;
                                        const desc = /** @type {Record<string, unknown>} */ (entry).description;
                                        return typeof desc === 'string' ? desc : null;
                                      })();
                                      const dishAdd = (() => {
                                        const entry = /** @type {unknown} */ (foodEntry);
                                        if (!entry || typeof entry !== 'object') return null;
                                        const add = /** @type {Record<string, unknown>} */ (entry).add;
                                        return typeof add === 'string' ? add : null;
                                      })();
                                      const dishLabel = dish ?? (foodKey ? foodKey : null) ?? 'Menu item';
                                      return (
                                        <li key={`${foodKey}-${index}`}>
                                          <strong>{dishLabel}</strong>
                                          <span className="pairing-reason ai-text">{entry?.pairingReason ? `${entry.pairingReason}` : ''}</span>
                                          {dishDescription ? (
                                            <div className="pairings-item-desc">{dishDescription}</div>
                                          ) : null}
                                          {dishAdd ? (
                                            <div className="muted small pairings-item-add">
                                              <span>Add:</span> {dishAdd}
                                            </div>
                                          ) : null}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                                <div className="pairings-block">
                                  <div className="muted small cat">Side</div>
                                  {pairings.side ? (
                                    <ul>
                                    <li>
                                        {(() => {
                                          const sideKey = pairings.side?.foodKey ?? '';
                                          const sideEntry = sideKey ? foodByKey?.[sideKey] : null;
                                          const sideName = sideEntry && typeof sideEntry.name === 'string' ? sideEntry.name : null;
                                          const sideDescription = (() => {
                                            const entry = /** @type {unknown} */ (sideEntry);
                                            if (!entry || typeof entry !== 'object') return null;
                                            const desc = /** @type {Record<string, unknown>} */ (entry).description;
                                            return typeof desc === 'string' ? desc : null;
                                          })();
                                          const sideAdd = (() => {
                                            const entry = /** @type {unknown} */ (sideEntry);
                                            if (!entry || typeof entry !== 'object') return null;
                                            const add = /** @type {Record<string, unknown>} */ (entry).add;
                                            return typeof add === 'string' ? add : null;
                                          })();
                                          const sideLabel = sideName ?? (sideKey ? sideKey : null) ?? 'Menu item';
                                          return (
                                            <>
                                              <strong>{sideLabel}</strong>
                                              <span className="pairing-reason ai-text">{pairings.side?.pairingReason ? `${pairings.side.pairingReason}` : ''}</span>
                                              {sideDescription ? (
                                                <div className="pairings-item-desc">{sideDescription}</div>
                                              ) : null}
                                              {sideAdd ? (
                                                <div className="muted small pairings-item-add">
                                                  <span>Add:</span> {sideAdd}
                                                </div>
                                              ) : null}
                                            </>
                                          );
                                        })()}
                                    </li>
                                  </ul>
                                  ) : (
                                    <p className="muted small">No side pairing yet.</p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="muted small">No pairings yet.</p>
                            )
                          ) : (
                            <p className="muted small">Pairings not ready.</p>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  ) : null}
                </motion.div>
              ) : null}
            </div>

        </div>
      </div>
    );
  },
  (prev, next) => {
    const prevBeer = prev.beer || {};
    const nextBeer = next.beer || {};
    return (
      prev.selected === next.selected &&
      prev.showHistory === next.showHistory &&
      prev.showFunFacts === next.showFunFacts &&
      prev.pairingsToken === next.pairingsToken &&
      prevBeer.id === nextBeer.id &&
      prevBeer.recommended === nextBeer.recommended &&
      prevBeer.recommendationMatchSentence === nextBeer.recommendationMatchSentence &&
      prevBeer.hexColor === nextBeer.hexColor &&
      prevBeer.history_text === nextBeer.history_text &&
      prevBeer.fun_facts_text === nextBeer.fun_facts_text &&
      prevBeer.history_fun === nextBeer.history_fun
    );
  }
);

/**
 * @param {{
 *  beer: Beer | null;
 *  showSettle?: boolean;
 *  prefersReduced?: boolean;
 *  showHistory?: boolean;
 *  showFunFacts?: boolean;
 *  selected?: boolean;
 *  onSelect?: () => void;
 *  onFlightOpen?: () => void;
 *  flightFull?: boolean;
 *  pairingsState?: {
 *    status: string;
 *    error?: string;
 *    pairingsByBeerKey?: Record<string, { mains?: Array<{ foodKey?: string; pairingReason?: string }>; side?: { foodKey?: string; pairingReason?: string } | null }>;
 *    foodByKey?: Record<string, { name?: string }>;
 *    ensureLoaded?: (force?: boolean) => void;
 *  };
 *  pairingsToken?: string;
 * }} props
 */
export default function BeerCard({
  beer,
  showSettle,
  prefersReduced,
  showHistory,
  showFunFacts,
  selected,
  onSelect,
  onFlightOpen,
  flightFull = false,
  pairingsState,
  pairingsToken,
}) {
  const flightCtx = /** @type {{ slots: Array<Beer | null>; addBeer: (beer: Beer) => void; removeBeer: (index: number) => void; pendingReplace?: unknown }} */ (
    useFlight()
  );
  const { slots, addBeer, removeBeer, pendingReplace } = flightCtx;
  const slotIndex = slots.findIndex((s) => s && (s.id === beer?.id || s.name === beer?.name));
  const inFlight = slotIndex !== -1;
  const isFlightFull = Boolean(pendingReplace) || slots.filter(Boolean).length >= 5 || flightFull;
  const ctaLabel = inFlight ? 'Added' : isFlightFull ? 'Replace' : 'Add to flight';

  const handleToggle = () => {
    if (!beer) return;
    if (inFlight) {
      removeBeer(slotIndex);
    } else {
      if (onFlightOpen) onFlightOpen();
      addBeer(beer);
    }
    if (onSelect) onSelect();
  };

  if (!beer) return null;
  return (
    <MotionCard
      beer={beer}
      showSettle={showSettle}
      prefersReduced={prefersReduced}
      showHistory={showHistory}
      showFunFacts={showFunFacts}
      selected={inFlight || selected}
      onSelect={handleToggle}
      flightFull={isFlightFull}
      ctaLabel={ctaLabel}
      pairingsState={pairingsState}
      pairingsToken={pairingsToken}
    />
  );
}

function hexToRgb(hex) {
  const cleaned = String(hex ?? '').replace('#', '');
  if (cleaned.length !== 6) return '0, 0, 0';
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return '0, 0, 0';
  return `${r}, ${g}, ${b}`;
}
