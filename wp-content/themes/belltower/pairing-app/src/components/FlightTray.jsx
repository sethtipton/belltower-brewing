import React, { useMemo, useState, useEffect } from 'react';
import useFlight from '../hooks/useFlight';
import FlightSlot from './FlightSlot';
import FlightToast from './FlightToast';

/**
 * @param {{ open?: boolean; colorMap?: Record<string, string> }} props
 */
export default function FlightTray({ open = true, colorMap = {} }) {
  /** @type {{ slots: Array<{ id: string | number; name: string; hexColor?: string | null } | null>; pendingReplace: { id: string | number; name: string } | null; replaceBeer: (index: number, beer: { id: string | number; name: string }) => void; removeBeer: (index: number) => void; clearFlight: () => void; cancelPendingReplace: () => void }} */
  const flightCtx = useFlight();
  const { slots, pendingReplace, replaceBeer, removeBeer, clearFlight, cancelPendingReplace } = flightCtx;
  const [highlightOverlay, setHighlightOverlay] = useState(false);

  const filled = useMemo(() => slots.filter(Boolean).length, [slots]);
  const hasFlight = filled > 0;

  /**
   * @param {number} index
   */
  const handleReplace = (index) => {
    if (!pendingReplace) return;
    replaceBeer(index, pendingReplace);
  };

  useEffect(() => {
    if (!pendingReplace) {
      setHighlightOverlay(false);
      return;
    }
    setHighlightOverlay(true);
    const t = setTimeout(() => setHighlightOverlay(false), 500);
    return () => clearTimeout(t);
  }, [pendingReplace]);

  return (
    <aside
      id="flight-tray"
      className={open ? 'flight-tray' : 'flight-tray flight-tray-closed'}
      aria-label="Flight tray"
      aria-hidden={!open}
      hidden={!open}
    >
      <div className="flight-tray-sticky">
        <div className="flight-tray-head">
          <h3>{hasFlight ? 'Your Flight' : 'Create Your Flight'}</h3>
          <div className="muted small">{filled} of 5 slots</div>

          {pendingReplace && (
            <p className={`flight-tray-overlay-copy${highlightOverlay ? ' flight-tray-overlay-copy-highlight' : ''}`}>
            Flight is full. Choose a slot to replace with <strong>{pendingReplace.name}</strong>.
            </p>
          )}

          {filled > 0 && (
            <button
              type="button"
              onClick={() => clearFlight()}
              disabled={!filled}
              className="muted small flight-tray-clear"
            >
              Remove All
            </button>
          )}
        </div>
      
        <div className={`flight-tray-wrapper${hasFlight ? ' flight-tray-wrapper-sticky' : ''}`}>

          <ol className="flight-tray-slots">
            {slots.map((slot, idx) => (
              <li key={idx}>
                <FlightSlot
                  index={idx}
                  beer={slot}
                  onRemove={removeBeer}
                  replaceMode={Boolean(pendingReplace)} 
                  onSelect={handleReplace}
                  colorMap={colorMap}
                />
              </li>
            ))}
          </ol>

        {pendingReplace && (
          <>
            <div className="flight-tray-overlay-grid">
              {slots.map((slot, idx) => (
                <FlightSlot
                  key={`replace-${idx}`}
                  index={idx}
                  beer={slot}
                  replaceMode
                  onSelect={handleReplace}
                  colorMap={colorMap}
                />
              ))}
            </div>
            <div className="flight-tray-overlay-actions">
              <button type="button" onClick={cancelPendingReplace} className="muted small">
                Cancel
              </button>
            </div>
          </>
        )}
        </div>
      </div>
      <FlightToast />
    </aside>
  );
}
