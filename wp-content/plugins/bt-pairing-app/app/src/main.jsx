import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { createLogger } from './logger';

const log = createLogger('app');

if (typeof window !== 'undefined') {
  try {
    /** @type {Window & { BT_PAIRING_APP_CONFIG?: { debug?: boolean } }} */
    const win = window;
    if (win.location?.origin === 'http://belltower.local') {
      win.BT_PAIRING_APP_CONFIG = { ...(win.BT_PAIRING_APP_CONFIG ?? {}), debug: true };
    }
  } catch {
    /* no-op: location or global object might be restricted */
  }
  const rootEl = typeof document !== 'undefined' ? document.getElementById('bt-pairing-app-root') : null;
  log.info('boot', {
    phase: 'boot',
    rootFound: !!rootEl,
    hasGlobals:
      typeof window.BT_PAIRING_APP_CONFIG === 'object'
      || typeof window.PAIRING_APP === 'object'
      || typeof window.PAIRINGAPP === 'object',
    debug: log.isDebug,
  });
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<App />);
  }
}
