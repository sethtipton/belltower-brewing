# Repository Guidelines

## Project Structure & Module Organization

- WordPress core lives at the repo root; custom code is in `wp-content/themes/belltower`.
- Theme layout: `sass/` (source styles compiled into `style.css`), `js/` (front-end interactions), `template-parts/` (reusable partials), `inc/` (hooks, shortcodes, setup), `images/` and `fonts/` (brand assets), `languages/` (POT/MO files).
- Tooling helpers sit alongside the theme: `bin/bundle.js` builds a distributable zip; `phpcs.xml.dist` configures WordPress coding standards.
- Plugins and uploads are under `wp-content/plugins` and `wp-content/uploads`; avoid committing generated uploads.
- There is also a second React app (`wp-content/themes/belltower/pairing-app/` plus a backup) for “Beer pairings”; little info is present, so tread lightly.

## Build, Test, and Development Commands

- Install Node deps at the repo root for the main Gulp tasks: `npm install`.
- Fast style builds: `npx gulp style` (compile SCSS to `style.css`), `npx gulp watch` (compile + BrowserSync proxying `https://belltower.local:3000`, watches PHP/JS/CSS).
- Theme-local tooling (run inside `wp-content/themes/belltower` after `npm install` there):
  - `npm run compile:css` / `npm run compile:rtl` — build LTR/RTL styles.
  - `npm run lint:scss` / `npm run lint:js` — stylelint + WP JS lint.
  - `npm run bundle` — create `wp-content/belltower.zip` excluding dev files.
- PHP checks (after `composer install` in the theme): `composer lint:wpcs` for WordPress CS, `composer lint:php` for basic syntax/compatibility.

## Coding Style & Naming Conventions

- PHP follows WordPress Coding Standards (tabs for indentation, escaped output, translation via `__()`/`_e()`); see `phpcs.xml.dist`. Keep function and hook prefixes consistent with existing theme naming.
- SCSS: keep changes in `sass/` and let build tools write `style.css`; favor shallow nesting and purposeful class names tied to templates or components.
- JavaScript in `js/` should stay modular and rely on WordPress globals instead of introducing new bundlers.

## Testing Guidelines

- Run `npm run lint:scss`, `npm run lint:js`, and `composer lint:wpcs` before opening a PR; address warnings rather than ignoring them.
- Manually verify key templates (home, beer, food, events) on `https://belltower.local` in both desktop and mobile breakpoints; confirm menus, sliders, and shortcodes render without console errors.
- After `npm run bundle`, spot-check the generated zip in a fresh theme install to ensure required assets are present and no dev files leak.

## Commit & Pull Request Guidelines

- Use short, present-tense messages (e.g., `tighten footer buttons`, `wrap partner location span`), matching the existing history style.
- Each PR should include: what changed, why, and how to test locally; link related issues; add screenshots/GIFs for visual changes and note any dependencies (plugins, settings).
- Keep commits scoped; avoid committing `.zip` builds or `node_modules`. Update docs or comments when behavior changes.

## Theme Notes

- Templates: dedicated files for home (`belltower-home.php`), beer/food/events pages, plus standard loops (`archive.php`, `single.php`, `page.php`, `search.php`, `404.php`).
- Shortcodes in `functions.php`: `events_by_date` (ACF `event_date`), `brewery_menu`, `untappd_menu`, `brewery_legend`, `partners_grid`, and a pairing widget proxy. OpenAI API constants are placeholders; keep real keys server-side.
- JS highlights: `navigation.js` handles mobile nav toggling, view-transition scroll state, masthead/banner measurements, logo injections, footer logo, and age-gate modal. Other scripts power pairing widget, Untappd menu, and menu import from Sheets.
- SCSS lives under `sass/` and compiles to `style.css`; organized by variables, layout, navigation, modules, typography, and custom component folders.
- Assets: `images/`, `fonts/`, `languages/`; theme packaging via `bin/bundle.js`.
