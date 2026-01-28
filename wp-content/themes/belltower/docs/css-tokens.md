# CSS Tokens

This theme uses CSS Custom Properties (tokens) as the shared design system for the WordPress theme and the pairing app.

## Source of truth

- Sass source: `wp-content/themes/belltower/sass/variables-site/_css-vars.scss`
- Output CSS: `wp-content/themes/belltower/tokens.css`

The Sass file maps existing Sass variables to CSS custom properties. The output file is consumed by both the theme CSS and the pairing app.

## Naming conventions

- Colors use the existing scheme: `--color__bt*`
- Layout tokens use `--bt-*` (for example `--bt-mobile-breakpoint`)

## How the theme consumes tokens

- `tokens.css` is enqueued before `style.css` in `wp-content/themes/belltower/functions.php`.
- Theme Sass still uses Sass variables for authoring, but utility classes and new overrides should prefer `var(--...)` when practical.

## Build tokens

From the theme root:

```
npm run build:tokens
```

## How the pairing app consumes tokens

- `wp-content/themes/belltower/pairing-app/src/styles/pairing_app_styles.scss` imports:
  - `@import "../../../tokens.css";`
- The pairing app should not duplicate token values locally.

## Adding a new token

1) Add or confirm the Sass variable in:
   - `wp-content/themes/belltower/sass/variables-site/_colors.scss` or `_structure.scss`
2) Map it into `wp-content/themes/belltower/sass/variables-site/_css-vars.scss`.
3) Rebuild CSS so `tokens.css` updates.
4) Use `var(--token-name)` in both theme Sass and app SCSS.
