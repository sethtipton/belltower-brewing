import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BeerDataProvider } from './providers/BeerDataProvider';

if (typeof window !== 'undefined') {
  const rootEl = typeof document !== 'undefined' ? document.getElementById('pairing-app-root') : null;
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(
      <BeerDataProvider>
        <App />
      </BeerDataProvider>
    );
  }
}
