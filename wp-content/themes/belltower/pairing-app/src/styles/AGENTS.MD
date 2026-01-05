# AGENTS.md — Styles Only (CSS / SCSS / Sass)

This policy governs **styling work only** within the styles folder scope. Agents must keep changes safe, minimal, and consistent with existing conventions while maintaining accessibility, performance, and long-term maintainability.

---

## Scope root (hard boundary)

**Scope root = the directory that contains this `AGENTS.md`, plus all subdirectories.**

### Allowed files (MUST)

Agents **MUST** edit/create files **only** when all conditions are true:

- File extension is **`.css`**, **`.scss`**, or **`.sass`**
- File is located under the **scope root**

### Disallowed files (MUST NOT)

Agents **MUST NOT** edit, create, rename, move, or propose changes to:

- **JS/TS** (`.js/.jsx/.ts/.tsx`) except for updating existing stylesheet import paths when a stylesheet is moved/renamed within this folder.
- **HTML/templates** (`.html/.php/.twig/.liquid/.ejs`, etc.)
- **Build/tooling/config** (`package.json`, lockfiles, Vite/Webpack configs, PostCSS configs, CI configs, linters)
- **Assets** (images/fonts/media) and generated files
- **Docs outside this folder** (unless they are `.css/.scss/.sass` inside scope root)
- **Theme styles outside this folder**, including `../sass/variables-site/colors` (treat as read-only for this app).

> If a styling fix would require changes outside allowed files, **stop** and state what would be needed, but do not implement it.

### Dependency/toolchain rule (hard)

Agents **MUST NOT** add:

- new dependencies
- new build steps
- new tooling/config changes
- new linters/formatters

---

## Assumptions (replace when repo context is known)

If the repo does not explicitly state these, agents should follow them as conservative defaults:

- **Browser support:** modern evergreen browsers (current major versions). If older browsers are required, use progressive enhancement and/or feature queries.
- **Architecture:** preserve the existing naming/structure in each file (do not introduce a new methodology like BEM/ITCSS/utility-first unless already present).
- **Formatting:** follow the file’s existing formatting and ordering; do not reformat unrelated lines.

---

## Editing principles

### Minimal diffs (definition)

Agents **MUST** keep diffs as small as possible:

- Change **only** the lines required to implement the request.
- **No** “cleanup” refactors, mass reordering, or reformatting-only edits.
- Avoid renames/moves across files unless explicitly requested.
- Prefer the smallest scoped selector change that fixes the issue without collateral impact.

### Respect existing conventions

Agents **MUST** match existing patterns in the local file(s):

- naming conventions (classes, variables, mixins)
- nesting style
- ordering of declarations
- token/variable usage

If conventions are unclear, prefer **the simplest, most local** approach and document the choice briefly in the output summary.

### SCSS/Sass guardrails

Agents **SHOULD**:

- Keep selector nesting **shallow** (target: ≤ 3 levels).
- Prefer reuse via existing variables/mixins/functions **already present**.
- Avoid introducing new global mixins/functions unless repeated use is clearly justified and stays within this folder.

Agents **MUST NOT** introduce patterns that expand global coupling (e.g., new framework-like utilities) unless explicitly requested.

---

## CSS quality guardrails (enterprise-safe defaults)

### Specificity control (hard)

Agents **MUST**:

- Prefer **class selectors** and component-scoped selectors.
- Keep overrides predictable and local.

Agents **MUST NOT**:

- Use **ID selectors** for styling (`#id`) except when styling a third-party DOM you cannot change and no other stable hook exists (must document).
- Use `!important` except as a last resort (see exceptions below).

**`!important` exception rule:** allowed only when required to override third-party inline styles or an unchangeable legacy rule. Must include a comment:

```css
/* !important intentional: overrides third-party inline style we cannot change. */
```
