Ran 12-11-25

Task: Implement pairing/history split, per-beer caching, admin purge endpoints, and small frontend changes.

Backend (WordPress / functions.php)

- Keep /bt/v1/pairing as-is but ensure it does NOT request or return any `history_fun` or enrichment. It should only return matches/order (and a timestamp). If a `force=true` param is passed, only accept it when the caller is an authenticated admin (permission check).
- Add a new REST route: POST /bt/v1/pairing/history
  - Input: JSON { slugs: [string], force?: boolean } (force ignored unless admin).
  - Behavior:
    - For each slug, check a per-beer transient key `bt_history_{slug}`.
    - Collect misses and fetch only those from the external Responses API.
      - Batch the misses in groups of 4.
      - Use a short upstream timeout (3s) and allow a single retry for each batch.
    - Save successful results into `bt_history_{slug}` transients with TTL = WEEK_IN_SECONDS.
    - Respond immediately with `{ histories: { slug: string|null }, partial: boolean, cached: [slug...] }`. `null` means server has no data for that slug right now.
  - Security: `force` or any cache-clearing must be guarded by `current_user_can('manage_options')` in PHP.
- Add a small admin-only purge route: POST /bt/v1/pairing/purge
  - Accept body `{ target: "pairing"|"history"|"all"|"slug", slug?: "..." }`.
  - Only callable by admins (capability + nonce).
  - Behavior: delete appropriate transients (`bt_pairing_*`, `bt_history_{slug}` or all `bt_history_*`). Return `{ purged: true }`.

Frontend (pairing-app)

- On user Fetch: call pairing endpoint first and render matches immediately (do not expect history).
- After render, collect missing slugs (compare against a client-side `historyMap` stored in sessionStorage).
- POST missing slugs to /bt/v1/pairing/history (batches as needed, server will also batch).
- Merge returned histories into `historyByName` with `setHistoryByName(prev => ({ ...prev, ...histories }))`, persist merged map to sessionStorage.
- If response `partial === true`, retry once after a short delay (700ms). If still missing, show a “Fun fact coming soon” placeholder for missing items.
- Keep match ordering intact; do not reorder based on history arrival.

Admin buttons (very small, visible only to logged-in WP users)

- Add minimal theme output (not a full admin page): render two buttons in the theme (footer or admin-bar) that are visible only when `is_user_logged_in()` and which call the purge endpoint:
  - “Purge Histories” → POST `{ target: "history" }`
  - “Purge Pairing” → POST `{ target: "pairing" }`
- Buttons must include WP nonce and server-side capability checks; the server must enforce `current_user_can('manage_options')` before actually purging. (Buttons are convenience only; enforcement is server-side.)
- No admin page, no CLI tooling changes.

Other constraints & details

- Use per-beer transient naming `bt_history_{slug}` to avoid shared-map race conditions.
- Pairing cache key scheme may remain as-is but do not mix history into pairing results.
- Batch size for server-side upstream history fetches: 4.
- Upstream timeout: 3 seconds. Single retry per batch.
- Do not implement any extra admin UI pages or WP-CLI commands.
- Keep changes lightweight and self-contained to the theme (functions.php / pairing-app).

Acceptance criteria (automated/manual)

- `/bt/v1/pairing` returns matches only, no history text.
- `/bt/v1/pairing/history` returns a histories map, `partial` flag when misses exist, and saved per-beer transients `bt_history_{slug}`.
- Admin-only purge endpoint deletes expected transients and respects capability + nonce.
- Buttons appear on the site only when a WP user is logged in; pressing them triggers the purge endpoints and the endpoints enforce admin capability.
- Frontend pairs → renders → requests histories → merges into `historyByName` and persists to sessionStorage; retries once when `partial` is true.
- Batch upstream calls use groups of 4 and time out after ~3s (with a single retry) for missing slugs.

Notes for implementer

- Keep prompts to the external Responses API minimal and keyed by slug only; cache key must be slug (not description).
- Be conservative with DB writes and transient namespacing. Don’t introduce global options without clear keys.
