import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ParkingApp from './components/ParkingApp';
import { createLogger } from './logger';

const log = createLogger('app');

if (typeof window !== 'undefined') {
  try {
    /** @type {Window & { PAIRING_APP?: { debug?: boolean } }} */
    const win = window;
    if (win.location?.origin === 'http://belltower.local') {
      win.PAIRING_APP = { ...(win.PAIRING_APP ?? {}), debug: true };
    }
  } catch {
    /* no-op: location or global object might be restricted */
  }
  const rootEl = typeof document !== 'undefined' ? document.getElementById('pairing-app-root') : null;
  const parkingEl = typeof document !== 'undefined' ? document.getElementById('parking') : null;
  log.info('boot', {
    phase: 'boot',
    rootFound: !!rootEl,
    parkingFound: !!parkingEl,
    hasGlobals: typeof window.PAIRING_APP === 'object' || typeof window.PAIRINGAPP === 'object',
    debug: log.isDebug,
  });
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<App />);
  }
  if (parkingEl) {
    const root = createRoot(parkingEl);
    root.render(<ParkingApp />);
  }
}
