You are a senior React + Vite engineer doing an agent-guided review.

Repo context:

- Follow the nearest `AGENTS.md` in this project tree as the source of truth (scope, rules, and validation).
- This is the Pairing App (theme-scoped React) mounted in WordPress via `[pairing_app]` and `pairing-app-loader.php`.

Documentation / verification requirement:

- Use the Context7 MCP server to verify any guidance that depends on official docs or current best practices.
- Specifically consult:
  - React docs (hooks, effects, Suspense, performance, a11y guidance where applicable)
  - WordPress docs (shortcodes, script enqueueing, REST + nonce usage, escaping/sanitization expectations)
- When you rely on doc guidance, include a short “Docs checked” note (what you looked up + why), but do not paste long quotes.

Task:
Audit the Pairing App codebase and propose improvements that bring the implementation into tighter alignment with the React Rules and project contracts in `AGENTS.md`.

Hard constraints:

- Do NOT change architecture, introduce new dependencies, or modify build/CI unless explicitly required for correctness or security.
- Prefer minimal diffs. Do not reformat unrelated code.
- Keep the WordPress mount contract stable: `[pairing_app]`, `PAIRING_APP` globals, beer snapshot injection, and REST endpoint paths must not change.

What to review (focus areas):

1. State & effects

   - Identify any derived state stored in state.
   - Find `useEffect` usage and classify each: external-sync vs avoidable.
   - For avoidable effects, propose (or implement) refactors to event handlers, derived render values, or refs.
   - Check effect deps, cleanup, stale closures.

2. Server state pattern consistency

   - Look for ad-hoc fetching scattered across components.
   - Ensure calls go through existing helpers/providers (`BeerDataProvider`, `usePairingCache`, `src/api*`).
   - Improve consistency and failure handling (fallback to cached results where appropriate).

3. Performance guardrails

   - Identify unnecessary rerender cascades (prop churn, large components doing too much).
   - Recommend targeted memoization ONLY where it measurably helps or where referential stability is required.
   - Flag expensive computations in render that should be memoized.

4. Accessibility baseline

   - Ensure interactive UI is keyboard usable.
   - Verify loading/error/empty states exist and are perceivable.
   - Check any imperative focus usage: justify, document, and avoid fighting user intent.
   - Ensure `prefers-reduced-motion` is respected where animations exist.

5. Security & privacy
   - Ensure nonce is never logged or persisted.
   - Ensure sensitive data is not placed into URLs/query params.
   - Validate nonce usage and request patterns against WordPress REST guidance (via Context7).

Deliverable:
Produce a Markdown report with:

- Summary (top 5 wins)
- P0 issues (bugs, security, correctness)
- P1 issues (maintainability, a11y, performance)
- Suggested refactors (small, high-leverage)
- A “Definition of Done” checklist aligned to `AGENTS.md`

If you can implement fixes safely within constraints:

- Make small, scoped commits (or provide a patch) grouped by theme:
  - “effects/state cleanup”
  - “a11y + UX states”
  - “perf/structure”
    For each change, include:
- file path(s)
- why it matters
- how to validate (build + manual smoke steps from AGENTS.md)

Start by listing the relevant files you inspected and any assumptions you had to make.
