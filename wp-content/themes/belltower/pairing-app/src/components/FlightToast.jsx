import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import useFlight from '../hooks/useFlight';

export default function FlightToast() {
  /** @type {{ toast: { message?: string; expiresAt?: number } | null; undoLastAction: () => void; dismissToast: () => void }} */
  const flightCtx = useFlight();
  const { toast, undoLastAction, dismissToast } = flightCtx;

  useEffect(() => {
    if (!toast) return undefined;
    const expiresAt = typeof toast.expiresAt === 'number' ? toast.expiresAt : Date.now() + 3000;
    const remaining = Math.max(0, expiresAt - Date.now());
    const timer = setTimeout(() => dismissToast(), remaining || 0);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          className="flight-toast"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18 }}
          role="status"
          aria-live="polite"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={undoLastAction}
            className="flight-toast-undo"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss"
            className="flight-toast-dismiss"
          >
            ×
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
