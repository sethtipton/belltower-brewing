# Pairing App (theme-scoped React)

## Overview

- React + Vite frontend for the beer pairing experience. Mounted via shortcode `[pairing_app]` and loader `pairing-app-loader.php` (enqueue hashed assets from `dist/manifest.json` or `dist/.vite/manifest.json`).
- Entry: `src/main.jsx` → `App.tsx` wrapped in `BeerDataProvider`. Inline beer snapshot expected via `window.__BT_BEER_DATA` or `<script id="bt-beer-data">`.
- REST endpoints used: `/bt/v1/pairing` (pairing), `/bt/v1/pairing/history` (history/fun-facts), and `/bt/v1/beer-colors` (color inference). Loader localizes `PAIRING_APP` globals (restUrl, nonce, siteUrl).

## Build & Dev

- Install deps: `npm install`.
- Dev: update `vite.config.js` proxy target to your local WP (e.g., `http://belltower.local`), then `npm run dev`. Use `[pairing_app]` shortcode on a page; dev server serves modules.
- Production: `npm run build` (outputs to `dist/`). Ensure theme includes `pairing-app-loader.php` in `functions.php` so assets enqueue.
- Preview: `npm run preview -- --host` if you need to test built assets locally.

## Key Files

- `pairing-app-loader.php`: registers shortcode + enqueues Vite-built CSS/JS (ES module) and localizes globals.
- `src/App.tsx`: pairing flow, answer caching, calls `useBeerData`, fetches pairings, renders beer list, history, and quiz UI.
- `src/providers/BeerDataProvider.jsx`: normalizes beer snapshot (`schemas/beerSchema.js`), caches colors, exposes `items`/`fetchPairing`.
- `src/api.js` and `src/api/pairing.ts`: REST helpers with nonce; `PAIRING_STORAGE_KEY` is session cache.
- Components: `components/BeerList.jsx`, `BeerCard.jsx`, `BeerHistory.jsx`, `Pint.jsx` (animated SVG), `PairingFetcher.tsx`, `LiveAnnouncer.jsx`.
- Hooks/utils: `hooks/usePairingCache.ts`, `hooks/usePrefersReducedMotion.js`, `utils/beerColor.js` (color batching + caching + IO visibility), `worker/colorWorker.js` stub.
- Styles: `src/styles.scss` (card layout, badges, reduced-motion rules).

## Notes & Gotchas

- Beer colors: caching via `sessionStorage` (`bt_beer_colors_v1`); respects prefers-reduced-motion for animations. Color fetch uses `bt/v1/beer-colors`.
- Pairing cache: stored under `bt_pairing_cache_v1` in `sessionStorage`; falls back to cached results if live fetch fails.
- If manifest is missing, loader bails silently—ensure `npm run build` before expecting assets in WP.
- Base path in `vite.config.js` assumes theme at `/wp-content/themes/belltower/`; adjust if deployed elsewhere.
