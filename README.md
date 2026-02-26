# Bell Tower Brewing Co

WordPress project featuring a custom theme, two React + Vite micro-frontends, and custom plugin-driven REST integrations.

## Frontend Highlights

- Built two independent React apps mounted in WordPress via custom plugins, shortcodes, and Gutenberg blocks.
- Implemented custom REST workflows for AI-assisted beer pairing and admin-editable parking map data.
- Built custom JavaScript data pipelines for food/drinks menus, Untappd beer snapshots, and retail/wholesale keg tables.
- Optimized conditional script loading so app and menu assets only load where needed.

## React Micro-Frontend Apps

### Pairing App (`wp-content/plugins/bt-pairing-app`)

- React + TypeScript + Vite micro-frontend for beer and food pairing.
- Uses a custom WordPress REST endpoint that proxies OpenAI Responses API logic.
- Includes a preference quiz, recommendation ranking, highlighted matches, and flight-building UX.
- Registered as both a shortcode and a custom Gutenberg block.

### Parking Guide (`wp-content/plugins/bt-parking-guide`)

- React + TypeScript + Three.js app for interactive parking guidance.
- Features WebGL lot overlays, hover/tap interactions, and non-WebGL fallback behavior.
- Includes admin-only front-end editing with save/cancel and REST persistence.
- Registered as both a shortcode and a custom Gutenberg block.

## Custom WordPress Integrations

- Custom REST endpoints with nonce and capability checks.
- JSON validation/sanitization and payload guardrails for editor save operations.
- Plugin-local Vite manifest loading for hashed module and CSS assets.
- Frontend configs localized with plugin-scoped globals to avoid collisions.

## Theme Script + Data Pipelines

Located in `wp-content/themes/belltower/js`:

- `menu-from-sheets.js`: Google Sheets CSV ingestion for food and drinks menus.
- `untappd-menu.js`: Untappd embed snapshot ingestion and beer data publishing.
- `keg-list.js`: retail/wholesale keg pricing table ingestion from Google Sheets.
- `pairing-profiles.js`: deterministic key/profile enrichment shared across menu and pairing flows.

## Tech Stack

- WordPress 6.x (classic theme architecture)
- React 19, TypeScript, Vite
- Three.js, @react-three/fiber, @react-three/drei
- SCSS, vanilla JavaScript, custom Gutenberg blocks
- OpenAI Responses API (via WordPress REST proxy)

## Repository Structure

- Theme: `wp-content/themes/belltower`
- Pairing plugin: `wp-content/plugins/bt-pairing-app`
- Parking plugin: `wp-content/plugins/bt-parking-guide`

## Local Development

### Root tooling

1. Install dependencies: `npm install`
2. Build styles: `npx gulp style`
3. Watch and proxy: `npx gulp watch` (expects `https://belltower.local:3000`)

### Theme tooling (inside `wp-content/themes/belltower`)

1. Install dependencies: `npm install`
2. Build CSS: `npm run compile:css`
3. Lint SCSS: `npm run lint:scss`
4. Lint JS: `npm run lint:js`
5. Bundle theme: `npm run bundle` (creates `wp-content/belltower.zip`)

### Plugin app tooling

Pairing app (`wp-content/plugins/bt-pairing-app/app`):

1. Install dependencies: `npm install`
2. Dev server: `npm run dev`
3. Build: `npm run build`

Parking app (`wp-content/plugins/bt-parking-guide/app`):

1. Install dependencies: `npm install`
2. Dev server: `npm run dev`
3. Build: `npm run build`

## Notes

- This repository includes WordPress core files.
- Customization work is contained in the theme and plugins.
