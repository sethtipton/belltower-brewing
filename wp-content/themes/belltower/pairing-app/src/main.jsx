import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BeerDataProvider } from './providers/BeerDataProvider';
import { createLogger } from './logger';

const log = createLogger('app');

if (typeof window !== 'undefined') {
  const rootEl = typeof document !== 'undefined' ? document.getElementById('pairing-app-root') : null;
  log.info('boot', {
    phase: 'boot',
    rootFound: !!rootEl,
    hasGlobals: typeof window.PAIRING_APP === 'object' || typeof window.PAIRINGAPP === 'object',
    debug: log.isDebug,
  });
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(
      <BeerDataProvider>
        <App />
      </BeerDataProvider>
    );
  }
}
