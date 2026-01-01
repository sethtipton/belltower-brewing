import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Pint from './Pint';
import { pickForeground } from '../utils/beerColor';

/**
 * @typedef {Object} FlightBeer
 * @property {string | number} id
 * @property {string} name
 * @property {string | null | undefined} [hexColor]
 */

/**
 * Single flight slot. Doubles as a replace target when replaceMode=true.
 */
/**
 * @param {{
 *  beer?: FlightBeer | null;
 *  index: number;
 *  onRemove?: (index: number) => void;
 *  onSelect?: (index: number) => void;
 *  replaceMode?: boolean;
 *  disabled?: boolean;
 *  colorMap?: Record<string, string>;
 * }} props
 */
export default function FlightSlot({
  beer,
  index,
  onRemove,
  onSelect,
  replaceMode = false,
  disabled = false,
  colorMap = {},
}) {
  const hasBeer = Boolean(beer);
  const tintOverride = beer?.id ? colorMap[String(beer.id)] ?? (beer.name ? colorMap[beer.name] : null) : null;
  const tint = beer?.hexColor ?? tintOverride ?? '#e5e5e5';
  // computed foreground (not currently used in markup)
  pickForeground(tint);
  const label = hasBeer ? beer.name : `Empty slot ${index + 1}`;
  const [lastTint, setLastTint] = React.useState('#e5e5e5');
  const [showLabel, setShowLabel] = React.useState(false);
  React.useEffect(() => {
    if (hasBeer && tint) {
      setLastTint(tint);
    }
  }, [hasBeer, tint]);
  React.useEffect(() => {
    if (!hasBeer) {
      setShowLabel(false);
      return;
    }
    const id = requestAnimationFrame(() => setShowLabel(true));
    return () => cancelAnimationFrame(id);
  }, [hasBeer]);
  const pintTint = hasBeer ? tint : lastTint;
  const pintFill = hasBeer ? 1 : 0;
  const slotColor = hasBeer ? tint : '#e5e5e5';
  const slotClass = `flight-slot${hasBeer ? ' flight-slot-filled' : ''}`;
  const labelClass = `flight-slot-label${showLabel ? ' flight-slot-label-visible' : ''}`;

  const actionLabel = replaceMode
    ? `Replace slot ${index + 1}${hasBeer ? ` (${beer.name})` : ''}`
    : hasBeer
    ? `Remove ${beer.name} from flight`
    : `Slot ${index + 1} is empty`;

  const handleClick = () => {
    if (replaceMode && onSelect) {
      onSelect(index);
      return;
    }
    if (hasBeer && onRemove) {
      onRemove(index);
    }
  };

  return (
    <button
      type="button"
      className={slotClass}
      onClick={handleClick}
      disabled={disabled || (!replaceMode && !hasBeer)}
      aria-pressed={hasBeer}
      aria-label={actionLabel}
      style={{ '--beer-color': slotColor }}
    >
      <div className="flight-slot-pint">
        <span className="flight-slot-index" aria-hidden="true">
          {index + 1}
        </span>
        <Pint tint={pintTint} beer={beer} animateFill fillLevel={pintFill} />
        {!replaceMode && (
          <div className="muted small" aria-hidden="true">
              Remove
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        <motion.div
          key="content"
          className="flight-slot-content"
        >
          <div className={labelClass} aria-hidden={!hasBeer}>
            {hasBeer ? label : ''}
          </div>
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
