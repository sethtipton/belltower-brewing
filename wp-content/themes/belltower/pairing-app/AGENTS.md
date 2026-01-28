# Pairing App (theme-scoped React)

## Scope & precedence

- This AGENTS.md applies to the Pairing App React project in this folder and its subfolders.
- If this file conflicts with a root-level AGENTS.md, this file takes precedence for this subtree.
- Primary scope: `src/**` (React app code) and related app config needed to run/build this project.
- Use `AGENTS.override.md` in a nested folder only for temporary, focused overrides; remove it when no longer needed.

## MCP tooling policy (required)

This repo is configured with these MCP tools:

- **context7** (docs)
- **chrome-devtools** (runtime verification in a real browser)

### Context7 policy (docs-first for JS/TSX/JSX)

Use **Context7** whenever you need library/API guidance to write or change code cleanly (React, Vite, WordPress REST, browser APIs, etc.). Treat Context7 as the source of truth over memory.

**How to use Context7 (always follow this flow):**

1. `resolve-library-id` for the relevant library (React, Vite, WordPress, etc.).
2. `query-docs` using that library id and a focused question (include version info when available by reading `package.json` / lockfile).
3. Apply the recommended approach in code (prefer the most idiomatic, current pattern from docs).
4. If docs are ambiguous, query again with a narrower question rather than guessing.

**Doc usage guardrails:**

- Don’t paste large doc excerpts into output; use the docs to guide implementation.
- Prefer simple, idiomatic solutions over clever ones.
- Don’t introduce new dependencies unless explicitly requested.

### Chrome DevTools policy (console must be clean after changes)

After any change that can affect runtime behavior (anything under `src/**`, styles, build config, loader behavior), you must verify the app in a browser using **chrome-devtools MCP** against:

- **Primary target:** `http://belltower.local/`

**Required validation loop (do this every time):**

1. Use chrome-devtools to open `http://belltower.local/`.
2. Navigate to the page that mounts the pairing app via `[pairing_app]` (use normal UI navigation).
3. Reload the page.
4. Collect:
   - console messages (errors + warnings)
   - failed/aborted network requests (especially JS/CSS assets and REST calls)
5. If any **new** console error/warning appears that is caused by the change:
   - fix it automatically in code (don’t ask)
   - reload and re-check until console is clean

**Notes:**

- Don’t “fix” by suppressing warnings unless it’s truly intentional and the safest path (and then document it in code).
- If there are pre-existing warnings unrelated to your change, do not churn the codebase; only fix what you introduced unless asked to clean all warnings.

---

## Setup commands

- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Preview build locally: `npm run preview -- --host`

## Dev environment notes

- Dev: update `vite.config.js` proxy target to your local WP (e.g., `http://belltower.local`), then run `npm run dev`.
- Use `[pairing_app]` shortcode on a page; dev server serves modules.

## Testing / validation instructions

When making changes, ensure:

- `npm run build` succeeds.
- `npm run typecheck` succeeds after any JS/TS changes (run alongside `npm run lint`).

### Required runtime smoke check (via chrome-devtools MCP)

After changes that affect runtime:

- Load `http://belltower.local/`
- Navigate to the page with `[pairing_app]` mounted
- Confirm:
  - App mounts without console **errors or warnings**
  - Pairing call works: `/bt/v1/pairing`
  - History call works: `/bt/v1/pairing/history`
  - Beer color inference works: `/bt/v1/beer-colors`
  - Loading / error / empty states are present and perceivable
  - Keyboard navigation still works for interactive UI

If console errors/warnings appear due to your change, fix them automatically and re-check until clean.

## Code style & conventions

- Prefer minimal diffs; avoid reformatting unrelated code.
- Follow existing patterns in this codebase (naming, file organization, hooks/providers usage).
- Prefer TypeScript for new modules when adjacent code already uses TS; do not mass-convert JS↔TS unless requested.

## Overview

- React + Vite frontend for the beer pairing experience.
- Mounted via shortcode `[pairing_app]` and loader `pairing-app-loader.php` (enqueue hashed assets from `dist/manifest.json` or `dist/.vite/manifest.json`).
- Entry: `src/main.jsx` → `App.tsx` wrapped in `BeerDataProvider`.
- Inline beer snapshot expected via `window.__BT_BEER_DATA` or `<script id="bt-beer-data">`.
- REST endpoints used:
  - `/bt/v1/pairing` (pairing)
  - `/bt/v1/pairing/history` (history / fun-facts)
  - `/bt/v1/beer-colors` (color inference)
- Loader localizes `PAIRING_APP` globals (`restUrl`, `nonce`, `siteUrl`).

## Key files

- `pairing-app-loader.php`: registers shortcode + enqueues Vite-built CSS/JS (ES module) and localizes globals.
- `src/App.tsx`: pairing flow, answer caching, calls `useBeerData`, fetches pairings, renders beer list, history, and quiz UI.
- `src/providers/BeerDataProvider.jsx`: normalizes beer snapshot (`schemas/beerSchema.js`), caches colors, exposes `items`/`fetchPairing`.
- `src/api.js` and `src/api/pairing.ts`: REST helpers with nonce; `PAIRING_STORAGE_KEY` is session cache.
- Components:
  - `components/BeerList.jsx`
  - `BeerCard.jsx`
  - `BeerHistory.jsx`
  - `Pint.jsx` (animated SVG)
  - `PairingFetcher.tsx`
  - `LiveAnnouncer.jsx`
- Hooks/utils:
  - `hooks/usePairingCache.ts`
  - `hooks/usePrefersReducedMotion.js`
  - `utils/beerColor.js` (color batching + caching + IO visibility)
  - `worker/colorWorker.js` (stub)
- Styles:
  - `src/styles.scss` (card layout, badges, reduced-motion rules)

## Project contracts & gotchas

- Beer colors:
  - Cached via `sessionStorage` key `bt_beer_colors_v1`.
  - Respect `prefers-reduced-motion` for animations.
  - Color fetch uses `bt/v1/beer-colors`.
- Pairing cache:
  - Stored under `bt_pairing_cache_v1` in `sessionStorage`.
  - Falls back to cached results if live fetch fails.
- Loader / manifest behavior:
  - If manifest is missing, loader bails silently — run `npm run build` before expecting assets in WP.
- Vite base path:
  - `vite.config.js` base path assumes theme at `/wp-content/themes/belltower/`; adjust if deployed elsewhere.

## Security & privacy

- Treat `PAIRING_APP.nonce` as sensitive:
  - Do not log it.
  - Do not persist it to storage.
- Do not put sensitive data into URL/query params.

## React Rules (best practices)

### React mental model (decision order)

When implementing a feature, decide in this order:

1. **State (minimum necessary)**
   - Store only what must be stored to render UI (e.g., open/closed, selected id, local form edits).
   - Do not store derived values (filtered lists, totals, validity flags) if computable from state/props.

2. **Events (do something now)**
   - Prefer event handlers (`onClick`, `onSubmit`, `onChange`) for “do something now” logic.

3. **Derived values in render (pure)**
   - Compute derived values from state/props during render. Keep derivations pure.

4. **Refs (mutable, non-visual)**
   - Use `useRef` for values that must persist but should not trigger renders (timer IDs, “latest value/callback”, imperative handles, DOM access).

5. **Effects (last resort)**
   - Use effects only for syncing with external systems.

### useEffect policy (escape hatch)

Default stance: avoid `useEffect` unless syncing with something outside React.

Before writing an effect, you must answer:

- Can this be derived from state/props during render?
- Can this happen in an event handler?
- Am I syncing with an external system?

Allowed `useEffect` use cases:

- Subscriptions (WebSocket, event listeners)
- Timers/intervals
- Imperative APIs (analytics, storage sync, focus management when truly necessary)
- Data fetching only when no established server-state pattern exists in this app already

### Effect hygiene rules

- Dependencies must be correct: include everything read inside the effect (or restructure).
- Cleanup is required on unmount / dependency change (unsubscribe/remove listener/clear timer).
- Avoid “mirror props → state” effects unless required; document why in code.
- Watch stale closures: prefer functional state updates or refs for “latest” values.

### Server state vs UI state (don’t mix them)

Definitions:

- UI state: toggles, selections, local form edits.
- Server state: fetched data, caching, retries, stale concerns.

Rules:

- Don’t implement server-state by sprinkling `useEffect + useState` across components.
- Prefer a single consistent pattern (existing abstraction/hook/provider).
- If no pattern exists, create a small focused hook (e.g., `useXyzData`) rather than ad-hoc fetching across components.
- In this app: prefer existing provider/hook patterns like `BeerDataProvider`, `usePairingCache`, and centralized API helpers.

### Lazy loading + Suspense (default posture)

- Prefer route/page-level code splitting when applicable.
- Lazy-load heavy components not needed for first paint (charts/editors/large tables).
- Place `Suspense` boundaries intentionally:
  - Keep fallbacks small/local when possible.
  - Fallback UI must be accessible (no focus traps; meaningful loading text when appropriate).

### URL / query params as state (use when it’s shareable)

Use query params for state that should be:

- Shareable/bookmarkable
- Refresh-persistent
- Compatible with back/forward navigation

Examples: filters, search term, sort, pagination, selected tab.

Rules:

- Treat query params as strings → parse/validate in a helper.
- Keep URL updates predictable (avoid infinite loops state ↔ URL).
- Don’t put sensitive data in the URL.

### Performance guardrails (practical)

Optimize first by:

- Correct state placement (closest common owner)
- Reducing unnecessary re-render cascades (stable props, split components)

Memoization rules:

- `useMemo` only for expensive computations or when referential stability is required.
- `useCallback` only when stable function identity matters (memoized children, dependencies).
- `React.memo` only when a component re-renders frequently with the same props.
- No blanket memoization; prefer measuring/profiling before broad changes.

### Common correctness footguns (avoid)

- Don’t mutate state (copy arrays/objects).
- Use stable keys in lists (avoid index keys when items can reorder/insert/delete).
- Avoid “copy props → state” patterns unless required and documented.
- Don’t use effects to keep two pieces of state in sync if one can be derived.

### Accessibility expectations (baseline)

- Semantic HTML first; ARIA only when needed.
- Keyboard support required for interactive UI (tab order, focus states, escape/close patterns).
- Loading/error/empty states must exist and be perceivable.
- If focus is moved imperatively, document why and ensure it doesn’t fight user intent.

### Testing mindset (when tests exist / when requested)

- Test user-visible behavior (roles/labels/text), not implementation details.
- Prefer user flows over shallow unit tests of internals.
- Include coverage for loading/error/empty states when data is involved.

### React change checklist (Definition of Done)

For any React change, confirm:

- State is minimal; derived values are derived.
- Effects (if any) are external-sync only, correct deps, cleanup present.
- List keys are stable.
- Loading/error/empty states handled.
- Basic keyboard/accessibility behavior isn’t broken.
- No new dependencies or architecture shifts unless requested.
