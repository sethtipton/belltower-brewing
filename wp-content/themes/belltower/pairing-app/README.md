# Food & Beer Pairing App (React + WordPress)

A React/Vite micro-frontend embedded in a WordPress theme. It renders the current tap list, lets users build a flight, and provides an optional “Help me decide” quiz plus food pairings and beer fun-facts.

## Tech + integration

- **UI:** React (Vite dev/build), mounted via `[pairing_app]` into `#pairing-app-root`
- **WP integration:** `pairing-app-loader.php` enqueues hashed ES module assets via Vite `manifest.json`
- **APIs:** WP REST routes under `/wp-json/bt/v1/*` (including an OpenAI Responses API proxy)

## Features

- **Tap list + flight builder:** renders immediately from a local snapshot of the current menu
- **“Help me decide” quiz:** collects taste preferences (mood/body/bitterness/flavor/strength) and returns a ranked top-5 + reorders/highlights beers
- **Food pairings (optional):** per-beer disclosure/toggle with loading/error/empty states
- **Beer colors (optional):** estimates hex/SRM from description and merges into beer cards

## Data sources

- **Beer menu snapshot:** `js/untappd-menu.js` scrapes the rendered Untappd embed, normalizes it, and publishes:
  - `window.__BT_BEER_DATA`
  - `<script id="bt-beer-data">…</script>`
  - `btBeerDataReady` event
- **Food menu snapshot:** `js/menu-from-sheets.js` loads Google Sheets menu data and publishes:
  - `window.__BT_FOOD_DATA`
  - `<script id="bt-food-data">…</script>` (plus legacy `bt-menu-data`)
  - `btFoodDataReady` event (used by static pairings)

## Pairing + enrichment flow

- **Quiz pairings:** `POST /wp-json/bt/v1/pairing` with `{ answers, beerData }`
  - WP route proxies the OpenAI Responses API and returns a prompted JSON shape (matches/scores/tags/explainers)
- **Beer history/fun-facts:** `GET /wp-json/bt/v1/pairing/history`
- **Static food pairings:** `POST /wp-json/bt/v1/pairings/static` with `{ beerData, foodData }`
  - Returns `pairingsByBeerKey` grouped by menu sections (e.g., “Mains” / “Side”)
- **Beer colors:** `POST /wp-json/bt/v1/beer-colors` with descriptions → `{ hex, srm }`

## Caching

- Pairing results: `sessionStorage` (`bt_pairing_cache_v1`, `bt_pairing_cache_v1_map`)
- Beer colors: `sessionStorage` (`bt_beer_colors_v1`, `bt_beer_color_map`)
- Static food pairings: `localStorage` + `sessionStorage` using a key derived from beer+food snapshots (`bt_static_pairings_*`)

## Quick start

1. `cd wp-content/themes/belltower/pairing-app`
2. `npm install`

### Dev

- Set `vite.config.js` proxy target to your local WP (e.g. `http://belltower.local`)
- `npm run dev`
- Add `[pairing_app]` to a WP page (HMR enabled)

### Production

- `npm run build`
- Ensure your theme includes:

````php
require_once get_stylesheet_directory() . '/pairing-app/pairing-app-loader.php';


## API smoke tests

- Pairing (OpenAI Responses proxy):

```bash
curl -i -X POST "http://belltower.local/wp-json/bt/v1/pairing" \
  -H "Content-Type: application/json" \
  -d '{"answers":{"mood":"Adventurous"},"beerData":null}'
````

- Beer colors (description → hex/SRM):

```bash
curl -i -X POST "http://belltower.local/wp-json/bt/v1/beer-colors" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"demo","description":"A bright, citrusy IPA with juicy hops."}]}'
```
