// BeerCard.jsx
import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BeerHistory from './BeerHistory';
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
 */

const MotionCard = React.memo(
  /**
   * @param {{
   *  beer: Beer;
   *  showSettle?: boolean;
   *  prefersReduced?: boolean;
 *  showHistory?: boolean;
 *  selected?: boolean;
 *  onSelect?: () => void;
 *  flightFull?: boolean;
 *  ctaLabel?: string;
 *  pairingsState?: {
 *    status: string;
 *    error?: string;
 *    pairingsByBeerKey?: Record<string, { mains?: Array<{ foodKey?: string; why?: string }>; side?: { foodKey?: string; why?: string } | null }>;
 *    foodByKey?: Record<string, { name?: string }>;
 *    ensureLoaded?: (force?: boolean) => void;
 *  };
 *  pairingsToken?: string;
 * }} props
   */
  function MotionCard({
    beer,
    showSettle,
    prefersReduced,
    showHistory: enableHistory,
    selected,
    onSelect,
    flightFull = false,
    ctaLabel,
    pairingsState,
    pairingsToken,
  }) {
    const [showHistory, setShowHistory] = useState(false);
    const [showPairings, setShowPairings] = useState(false);
    const tint = useMemo(() => beer?.hexColor ?? '#fff', [beer?.hexColor]);
    const fg = useMemo(() => pickForeground(tint), [tint]);
    const rgb = useMemo(() => hexToRgb(tint), [tint]);
    const isRecommended = Boolean(beer?.recommended);
    const historyText = enableHistory
      ? beer?.history_fun ?? `History & fun facts coming soon for ${beer?.name ?? 'this beer'}.`
      : '';
    const score = beer?.recommendationScore;
    const confidence = beer?.recommendationConfidence;
    const scoreText = typeof score === 'number' ? score.toFixed(2) : null;
    const pairingsStatus = pairingsState?.status ?? 'idle';
    const pairingsError = pairingsState?.error ?? '';
    const beerKey = beer?.btKey ?? '';
    const pairings = beerKey ? pairingsState?.pairingsByBeerKey?.[beerKey] : null;
    const foodByKey = pairingsState?.foodByKey ?? {};
    const pairingsId = `pairings-${beer.id}`;
    const showPairingsToggle = Boolean(pairingsState?.available && pairingsStatus === 'ready');

    const handlePairingsToggle = () => {
      const next = !showPairings;
      setShowPairings(next);
    };

    return (
      <div
        id={`beer-${beer.id}`}
        className={`beer-card${isRecommended ? ' recommended' : ''}${selected ? ' selected' : ''}`}
        style={{ '--beer-color': tint, '--beer-foreground': fg, '--beer-rgb': rgb }}
        data-settle={showSettle ? 'true' : 'false'}
        data-recommended={isRecommended ? 'true' : 'false'}
        data-pairings-token={pairingsToken ?? ''}
      >
        <div className={`beer-card-layout${isRecommended && beer.recommendationMatchSentence ? ' with-recommendation match-open' : ''}`}>

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
              {enableHistory && historyText ? (
                <BeerHistory
                  id={`history-${beer.id}`}
                  text={historyText}
                  open={showHistory}
                  onToggle={() => setShowHistory((v) => !v)}
                />
              ) : null}
              {showPairingsToggle ? (
                <div className="beer-card-pairings">
                  <button
                    type="button"
                    className="pairings-toggle"
                    aria-expanded={showPairings}
                    aria-controls={pairingsId}
                    onClick={handlePairingsToggle}
                  >
                    Food pairings
                    <svg
                      className={`pairings-toggle-icon${showPairings ? ' pairings-toggle-icon-open' : ''}`}
                      width="14"
                      height="14"
                      viewBox="0 0 12 12"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M2.5 4.5 L9.5 4.5 L6 8.5 Z"
                        fill="var(--beer-color, transparent)"
                        stroke="var(--beer-foreground, currentColor)"
                        strokeWidth="1"
                      />
                    </svg>
                  </button>
                  <AnimatePresence initial={false}>
                    {showPairings ? (
                      <motion.div
                        id={pairingsId}
                        className="pairings-panel"
                        aria-live="polite"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                      >
                        {pairingsStatus === 'loading' ? (
                          <p className="muted small">Loading pairings…</p>
                        ) : pairingsStatus === 'error' ? (
                          <div className="muted small">
                            <p>Couldn’t load pairings. Try again.</p>
                            <button type="button" onClick={() => pairingsState?.ensureLoaded?.(true)}>
                              Retry
                            </button>
                            {pairingsError ? <div className="muted small">{pairingsError}</div> : null}
                          </div>
                        ) : pairingsStatus === 'ready' ? (
                          beerKey && pairings ? (
                            <div className="pairings-results">
                              <div className="pairings-block">
                                <div className="muted small">Mains</div>
                                <ul>
                                  {(pairings.mains ?? []).map((entry, index) => {
                                    const foodKey = entry?.foodKey ?? '';
                                    const foodEntry = foodKey ? foodByKey?.[foodKey] : null;
                                    const dish = foodEntry && typeof foodEntry.name === 'string' ? foodEntry.name : null;
                                    const dishLabel = dish ?? (foodKey ? foodKey : null) ?? 'Menu item';
                                    return (
                                      <li key={`${foodKey}-${index}`}>
                                        <strong>{dishLabel}</strong>
                                        {entry?.why ? ` — ${entry.why}` : ''}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                              <div className="pairings-block">
                                <div className="muted small">Side</div>
                                {pairings.side ? (
                                  <ul>
                                  <li>
                                    {(() => {
                                      const sideKey = pairings.side?.foodKey ?? '';
                                      const sideEntry = sideKey ? foodByKey?.[sideKey] : null;
                                      const sideName = sideEntry && typeof sideEntry.name === 'string' ? sideEntry.name : null;
                                      const sideLabel = sideName ?? (sideKey ? sideKey : null) ?? 'Menu item';
                                      return (
                                        <>
                                          <strong>{sideLabel}</strong>
                                          {pairings.side?.why ? ` — ${pairings.side.why}` : ''}
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
                        ) : null}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}
            </div>

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
              className="beer-match muted small"
              aria-live="polite"
            >
                  {beer.recommendationMatchSentence}
                </div>
              </div>
            )}

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
      prev.pairingsToken === next.pairingsToken &&
      prevBeer.id === nextBeer.id &&
      prevBeer.recommended === nextBeer.recommended &&
      prevBeer.recommendationMatchSentence === nextBeer.recommendationMatchSentence &&
      prevBeer.hexColor === nextBeer.hexColor &&
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
 *  selected?: boolean;
 *  onSelect?: () => void;
 *  onFlightOpen?: () => void;
 *  flightFull?: boolean;
 *  pairingsState?: {
 *    status: string;
 *    error?: string;
 *    pairingsByBeerKey?: Record<string, { mains?: Array<{ foodKey?: string; why?: string }>; side?: { foodKey?: string; why?: string } | null }>;
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
