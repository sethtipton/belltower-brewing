# BT Parking Guide Plugin

## Scope & precedence

- This AGENTS.md applies to `wp-content/plugins/bt-parking-guide` and all subfolders.
- If this file conflicts with a root-level AGENTS.md, this file takes precedence for this subtree.
- Primary scope: `app/**` (React app), `includes/**` (map storage + REST), and `bt-parking-guide.php` (plugin bootstrap/enqueue).
- Use `AGENTS.override.md` in a nested folder only for temporary, focused overrides; remove it when no longer needed.

## MCP tooling policy (required)

This repo is configured with these MCP tools:

- **context7** (docs)
- **chrome-devtools** (runtime verification in a real browser)

### Context7 policy (docs-first for JS/TSX/JSX/PHP integrations)

Use **Context7** whenever you need library/API guidance (React, Vite, Three.js/React Three Fiber, WordPress REST, browser APIs). Treat Context7 as the source of truth over memory.

**How to use Context7 (always follow this flow):**

1. `resolve-library-id` for the relevant library.
2. `query-docs` using that library id and a focused question (include version info from `app/package.json` when relevant).
3. Apply the recommended approach in code.
4. If docs are ambiguous, query again with a narrower question rather than guessing.

**Doc usage guardrails:**

- Don’t paste large doc excerpts into output; use docs to guide implementation.
- Prefer simple, idiomatic solutions over clever ones.
- Don’t introduce new dependencies unless explicitly requested.

### Chrome DevTools policy (console must be clean after changes)

After any runtime-affecting change (`app/**`, styles, build config, shortcode/block mount, map API behavior), verify in browser using **chrome-devtools MCP** against:

- **Primary target:** `http://belltower.local/`

**Required validation loop (do this every time):**

1. Open `http://belltower.local/`.
2. Navigate to a page that mounts the parking guide via `[bt_parking_guide]` or the `bt/parking-guide` block.
3. Reload the page.
4. Collect:
   - console messages (errors + warnings)
   - failed/aborted network requests (assets + REST calls)
5. If any **new** console error/warning appears caused by your change:
   - fix it automatically in code (don’t ask)
   - reload and re-check until console is clean

If pre-existing warnings are unrelated, don’t churn the codebase unless asked.

## Setup commands

Run from `wp-content/plugins/bt-parking-guide/app`:

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
- Navigate to a page where `[bt_parking_guide]` (or `bt/parking-guide`) is mounted
- Confirm:
  - App mounts without new console errors/warnings
  - Map GET works: `/bt-parking/v1/map`
  - Admin save flow works when authorized: POST `/bt-parking/v1/map`
  - Hover/select interactions still work
  - Non-WebGL/fallback presentation still works
  - Loading/error states are perceivable
  - Keyboard navigation still works for interactive UI

## Code style & conventions

- Prefer minimal diffs; avoid reformatting unrelated code.
- Follow existing patterns in this codebase (types, normalization helpers, sanitize-first backend logic).
- Prefer TypeScript for new modules when adjacent code already uses TS.
- Do not introduce new dependencies unless explicitly requested.

## Overview

- Custom WordPress plugin shipping a React + Vite parking guide app.
- Mounted via shortcode `[bt_parking_guide]` and dynamic block `bt/parking-guide`.
- Bootstrap/enqueue in `bt-parking-guide.php` (manifest lookup + module script + localized globals).
- React entry: `app/src/main.jsx` → `app/src/ParkingApp.jsx` → `app/src/components/ParkingMap3D.tsx`.
- Data persistence uses custom post type + post meta JSON in `includes/map-storage.php`.

## Key files

- `bt-parking-guide.php`: plugin bootstrap, mount detection, enqueue/localize globals, block registration.
- `includes/rest.php`: REST route registration + permission/payload validation.
- `includes/map-storage.php`: CPT/meta registration, default map seeding, sanitization/normalization, save/load helpers.
- `app/src/components/ParkingMap3D.tsx`: map rendering, interactions, editing UI, save/cancel flow.
- `app/src/api.ts`: REST client for map fetch/save.
- `app/src/styles/parking_guide_styles.scss`: parking guide UI styles.

## Project contracts & gotchas

- Global config is localized as `BT_PARKING_GUIDE_CONFIG` (`restUrl`, `nonce`, `isAdmin`, `mapEndpoint`).
- Map payload is validated/sanitized server-side before persistence.
- POST `/bt-parking/v1/map` requires valid nonce + capability (`manage_options`).
- REST payload max size limit is enforced in `includes/rest.php`.
- Loader depends on `dist/manifest.json` (or `dist/.vite/manifest.json`); run `npm run build` for updated assets.
- Vite base path assumes plugin dist at `/wp-content/plugins/bt-parking-guide/dist/`.

## Security & privacy

- Treat localized nonce as sensitive:
  - do not log it
  - do not persist it to storage
- Preserve capability checks and nonce verification on mutating routes.
- Keep sanitization in `map-storage.php` intact when extending payload structure.

## React implementation rules

### State model

1. Store minimal UI state.
2. Handle immediate actions in event handlers.
3. Compute derived values during render.
4. Use refs for mutable non-visual values.
5. Use effects only for external synchronization.

### useEffect policy

- Default stance: avoid `useEffect` unless syncing with external systems.
- Allowed cases: subscriptions, timers, imperative APIs, map/loading synchronization.
- Effects must have correct dependencies and cleanup.

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
