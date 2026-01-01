# Pairing App (theme-scoped React frontend)

## What it does

- React/Vite UI mounted via `[pairing_app]`; assets enqueued by `pairing-app-loader.php` using Vite’s manifest.
- Beer data source: the Untappd embed (`js/untappd-menu.js`) loads the embed script, scrapes the rendered menu, normalizes it, and publishes it to `window.__BT_BEER_DATA` and `<script id="bt-beer-data">…</script>` so the app has a limited, current snapshot.
- Pairing flow: the app posts user answers + the beer information to `bt/v1/pairing`. The WP route proxies to the OpenAI Responses API and returns a prompted JSON shape with matches, tags, and explainers. History/fun-facts per beer are fetched via `bt/v1/pairing/history`. The UI also hits `bt/v1/beer-colors` to estimate hex color/SRM for each beer from its description.

## Quick start

1. `cd themes/belltower/pairing-app`
2. `npm install`
3. Dev:
   - Update `vite.config.js` proxy target to your Local app WP (e.g., `http://belltower.local`).
   - `npm run dev`
   - Add `[pairing_app]` to a page; dev server will hot-reload.
4. Production:
   - `npm run build`
   - Ensure your theme includes:

```php
require_once get_stylesheet_directory() . '/pairing-app/pairing-app-loader.php';
```

- Loader reads `dist/manifest.json` (or `dist/.vite/manifest.json`) and enqueues hashed CSS/JS as ES modules.

## API smoke tests

- Pairing (OpenAI Responses proxy):

```bash
curl -i -X POST "http://belltower.local/wp-json/bt/v1/pairing" \
  -H "Content-Type: application/json" \
  -d '{"answers":{"mood":"Adventurous"},"beerData":null}'
```

- Beer colors (description → hex/SRM):

```bash
curl -i -X POST "http://belltower.local/wp-json/bt/v1/beer-colors" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"demo","description":"A bright, citrusy IPA with juicy hops."}]}'
```
