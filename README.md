# Belltower WordPress Project

Theme-first WordPress site with a custom front-end workflow.

## Project Overview

This repository contains the full WordPress installation. Custom theme work lives in `wp-content/themes/belltower`, with SCSS and JavaScript compiled into the theme.

## Key Paths

- **Theme:** `wp-content/themes/belltower`
- **Theme styles:** `wp-content/themes/belltower/sass` (compiled to `style.css`)
- **Theme scripts:** `wp-content/themes/belltower/js`
- **Template parts:** `wp-content/themes/belltower/template-parts`
- **Theme includes:** `wp-content/themes/belltower/inc`
- **Assets:** `wp-content/themes/belltower/images`, `fonts`, `languages`
- **Pairing app plugin:** `wp-content/plugins/bt-pairing-app`
- **Parking guide plugin:** `wp-content/plugins/bt-parking-guide`

## Local Development

### Root tooling

1. Install dependencies: `npm install`
2. Build styles: `npx gulp style`
3. Watch and proxy: `npx gulp watch` (expects `https://belltower.local:3000`)

### Theme tooling (run inside `wp-content/themes/belltower`)

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

Parking guide app (`wp-content/plugins/bt-parking-guide/app`):

1. Install dependencies: `npm install`
2. Dev server: `npm run dev`
3. Build: `npm run build`

## Quality Checks

- SCSS and JS linting should run clean before commits.
- Manually verify core templates: home, beer, food, events, and single posts.

## WordPress Core

This repository includes WordPress core files. Avoid editing core directly; keep all customization inside the theme or plugins.
