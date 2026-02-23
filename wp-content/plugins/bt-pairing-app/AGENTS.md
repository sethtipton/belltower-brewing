# BT Pairing App Plugin

## Scope & precedence

- This AGENTS.md applies to `wp-content/plugins/bt-pairing-app` and all subfolders.
- If this file conflicts with a root-level AGENTS.md, this file takes precedence for this subtree.
- Primary scope: `app/**` (React app), `includes/**` (REST/backend), and `bt-pairing-app.php` (plugin bootstrap/enqueue).
- Use `AGENTS.override.md` in a nested folder only for temporary, focused overrides; remove it when no longer needed.

## MCP tooling policy (required)

This repo is configured with these MCP tools:

- **context7** (docs)
- **chrome-devtools** (runtime verification in a real browser)

### Context7 policy (docs-first for JS/TSX/JSX/PHP integrations)

Use **Context7** whenever you need library/API guidance to write or change code cleanly (React, Vite, WordPress REST, browser APIs, etc.). Treat Context7 as the source of truth over memory.

**How to use Context7 (always follow this flow):**

1. `resolve-library-id` for the relevant library (React, Vite, WordPress, etc.).
2. `query-docs` using that library id and a focused question (include version info from `app/package.json` when relevant).
3. Apply the recommended approach in code (prefer the most idiomatic, current pattern from docs).
4. If docs are ambiguous, query again with a narrower question rather than guessing.

**Doc usage guardrails:**

- Don’t paste large doc excerpts into output; use docs to guide implementation.
- Prefer simple, idiomatic solutions over clever ones.
- Don’t introduce new dependencies unless explicitly requested.

### Chrome DevTools policy (console must be clean after changes)

After any change that can affect runtime behavior (anything under `app/**`, styles, build config, asset loading, shortcode/block mount, or REST behavior), verify in browser using **chrome-devtools MCP** against:

- **Primary target:** `http://belltower.local/`

**Required validation loop (do this every time):**

1. Open `http://belltower.local/`.
2. Navigate to a page that mounts the pairing app via `[bt_pairing_app]` or the `bt/pairing-app` block.
3. Reload the page.
4. Collect:
   - console messages (errors + warnings)
   - failed/aborted network requests (especially JS/CSS assets and REST calls)
5. If any **new** console error/warning appears caused by your change:
   - fix it automatically in code (don’t ask)
   - reload and re-check until console is clean

If there are pre-existing warnings unrelated to your change, do not churn the codebase unless asked.

## Setup commands

Run from `wp-content/plugins/bt-pairing-app/app`:

- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Preview build locally: `npm run preview -- --host`

## Testing / validation instructions

When making changes, ensure:

- `npm run build` succeeds.
- `npm run typecheck` succeeds after JS/TS changes (run alongside `npm run lint`).

### Required runtime smoke check (via chrome-devtools MCP)

After runtime-affecting changes:

- Load `http://belltower.local/`
- Navigate to a page where `[bt_pairing_app]` (or `bt/pairing-app`) is mounted
- Confirm:
  - App mounts without new console errors/warnings
  - Pairing call works: `/bt/v1/pairing`
  - Status call works: `/bt/v1/pairing/status` (admin flows)
  - History call works: `/bt/v1/pairing/history`
  - Static pairings call works: `/bt/v1/pairings/static`
  - Beer color inference works: `/bt/v1/beer-colors`
  - Loading/error/empty states are perceivable
  - Keyboard navigation still works for interactive UI

## Code style & conventions

- Prefer minimal diffs; avoid reformatting unrelated code.
- Follow existing patterns in this codebase (naming, file organization, provider/hook usage).
- Prefer TypeScript for new modules when adjacent code already uses TS; do not mass-convert JS↔TS unless requested.
- Do not introduce new dependencies unless explicitly requested.

## Overview

- Custom WordPress plugin that ships a React + Vite pairing app and related REST endpoints.
- App mounted via shortcode `[bt_pairing_app]` and dynamic block `bt/pairing-app`.
- Bootstrap/enqueue in `bt-pairing-app.php` (manifest lookup + module script + localized globals).
- React entry: `app/src/main.jsx` → `app/src/App.tsx`.
- Inline beer/food snapshots consumed from `window.__BT_BEER_DATA` / `window.__BT_FOOD_DATA` or script tags.

## Key files

- `bt-pairing-app.php`: plugin bootstrap, mount detection, enqueue/localize globals, block registration.
- `includes/rest.php`: all pairing REST routes and backend logic.
- `app/src/App.tsx`: pairing flow, recommendation ranking, history/static pairing triggers.
- `app/src/providers/BeerDataProvider.jsx`: snapshot normalization + color cache/fetch.
- `app/src/api.js`, `app/src/api/pairing.ts`: REST helpers + typed response contracts.
- `app/src/staticPairings.js`: static food pairing fetch/caching/fallback.
- `app/src/components/*`: quiz/form, beer list/cards, flight UI, announcer.

## Project contracts & gotchas

- Global config is localized as `BT_PAIRING_APP_CONFIG` (`restUrl`, `nonce`, `features`, `cacheHash`, `isAdmin`).
- Pairing cache and history rely on storage/transient keys:
  - client session keys: `bt_pairing_cache_v1*`, `bt_history_cache_v1`, `bt_static_pairings_*`
  - server-side transient/index keys: see `includes/rest.php`
- Loader depends on `dist/manifest.json` (or `dist/.vite/manifest.json`); run `npm run build` before expecting updated assets.
- Vite base path assumes plugin dist at `/wp-content/plugins/bt-pairing-app/dist/`.

## Security & privacy

- Treat localized nonce as sensitive:
  - do not log it
  - do not persist it to storage
- Keep admin-only actions protected (`manage_options` + nonce where applicable).
- Do not put sensitive data in URLs/query params.

## React implementation rules

### State model

1. Store minimal UI state.
2. Handle immediate actions in event handlers.
3. Compute derived values during render.
4. Use refs for mutable non-visual values.
5. Use effects only for external synchronization.

### useEffect policy

- Default stance: avoid `useEffect` unless syncing with external systems.
- Allowed cases: subscriptions, timers, imperative APIs, coordinated fetch orchestration.
- Effects must have correct dependencies and cleanup.

### Server state vs UI state

- Keep server-state logic centralized in existing hooks/providers/helpers.
- Prefer existing abstractions over ad-hoc fetch logic inside many components.

### Accessibility baseline

- Semantic HTML first; ARIA only when needed.
- Keyboard support required for interactive UI.
- Loading/error/empty states must exist and be perceivable.

### React change checklist (Definition of Done)

- State is minimal; derived values are derived.
- Effects (if any) are external-sync only with cleanup.
- List keys are stable.
- Loading/error/empty states handled.
- Keyboard/accessibility behavior isn’t broken.
- No new dependencies/architecture shifts unless requested.
