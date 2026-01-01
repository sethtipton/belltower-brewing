# Bell Tower WordPress Theme

Bell Tower is the custom WordPress theme used on the Bell Tower Brewing Company website. The theme began as a fork of the Underscores starter but has been heavily tailored to support the brewery's branding and content needs.

## Features

- **Custom Page Templates** – Dedicated templates for the home page, beer list, food menu and upcoming events.
- **Shortcodes** – Includes `events_by_date`, `brewery_menu`, `drinks_menu`, `untappd_menu`, `keg_list`, `pairing_app`, `brewery_legend`, and `partners_grid` for embedding event feeds, menus, and the pairing app.
- **Widget Areas** – Widgets power areas such as the home page hero text and footer columns.
- **Gutenberg Palette** – Defines a custom colour palette matching the brewery brand colours.
- **WooCommerce Support** – Styling and hooks for WooCommerce integration.
- **Jetpack Integration** – Infinite scroll and responsive video features are enabled when Jetpack is active.
- **Responsive Navigation** – Custom JavaScript drives the mobile menu and header interactions.

## Development

Node.js tooling is used to compile Sass and watch for changes. After cloning the repository run:

```bash
npm install
```

Use `npx gulp style` to compile the theme stylesheets and `npx gulp watch` during development for live reloading.

## Credits

Bell Tower is built on top of the [Underscores](https://underscores.me/) starter theme and includes [normalize.css](https://necolas.github.io/normalize.css/) for CSS resets. The theme is released under the GPLv2 or later.
