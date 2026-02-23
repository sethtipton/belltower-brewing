import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * @param {{ id: string | number; text?: string | null; open?: boolean; onToggle?: () => void }} props
 */
export default function BeerHistory({ id, text, open, onToggle }) {
  const panelId = `beer-history-${id}`;
  const safeText = typeof text === 'string' ? text : '';
  const paragraphs = safeText
    ? safeText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  if (!paragraphs.length) return null;

  return (
    <div className="beer-history">
      <button
        type="button"
        className="history-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        History &amp; fun facts
        <svg
          className={`history-toggle-icon${open ? ' history-toggle-icon-open' : ''}`}
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
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-hidden={!open}
            className="beer-history-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {paragraphs.length
              ? paragraphs.map((p, idx) => <p key={idx}>{p}</p>)
              : <p>{safeText}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
