# BT Parking Guide

`bt-parking-guide` provides the parking map React application with CPT/meta persistence and dedicated REST endpoints under `bt-parking/v1`.

- Shortcode: `[bt_parking_guide]`
- Block: `bt/parking-guide`

## Build

From `wp-content/plugins/bt-parking-guide/app`:

```bash
npm install
npm run build
```

The built assets are written to `wp-content/plugins/bt-parking-guide/dist` and are committed for servers without Node tooling.
