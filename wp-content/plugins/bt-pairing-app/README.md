# BT Pairing App

`bt-pairing-app` provides the beer pairing React application and all pairing REST endpoints under `bt/v1`.

- Shortcode: `[bt_pairing_app]`
- Block: `bt/pairing-app`

## Build

From `wp-content/plugins/bt-pairing-app/app`:

```bash
npm install
npm run build
```

The built assets are written to `wp-content/plugins/bt-pairing-app/dist` and are committed for servers without Node tooling.

## OpenAI Configuration

The plugin resolves OpenAI config in this order:

1. `OPENAI_API_KEY` / `OPENAI_MODEL` (if defined and non-empty)
2. `BT_OPENAI_API_KEY` / `BT_OPENAI_MODEL` (fallback)

If API credentials are missing, pairing endpoints return a graceful REST error response instead of fatalling.
