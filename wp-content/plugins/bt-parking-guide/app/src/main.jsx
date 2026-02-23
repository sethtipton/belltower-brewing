import React from 'react';
import { createRoot } from 'react-dom/client';
import ParkingApp from './ParkingApp';
import './styles/parking_guide_styles.scss';
import { createLogger } from './logger';

const log = createLogger('app');

if (typeof window !== 'undefined') {
  const rootEl = typeof document !== 'undefined' ? document.getElementById('bt-parking-guide-root') : null;
  log.info('boot', {
    phase: 'boot',
    rootFound: !!rootEl,
    hasGlobals: typeof window.BT_PARKING_GUIDE_CONFIG === 'object',
    debug: log.isDebug,
  });
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(<ParkingApp />);
  }
}
