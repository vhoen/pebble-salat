# salat

Pebble watch app that shows today's five main Islamic prayer times for a configured location.

Built with **Pebble SDK 3 / Alloy (Moddable)** for:

- **emery** — Pebble Time 2
- **gabbro** — Pebble Round 2

## Features

- Settings (Clay) for **latitude** and **longitude** (decimal values supported)
- Fetches daily timings from the [Aladhan Prayer Times API](https://aladhan.com/prayer-times-api)
- Displays **Fajr**, **Dhuhr**, **Asr**, **Maghrib**, **Isha**
- Styling on the watch:
  - past prayers — light gray
  - next prayer — bold black
  - upcoming prayers — black
- Phone-side cache (once per day; invalidated when coordinates change)

## Requirements

- Pebble SDK 3 with Alloy / Moddable support
- Node.js + npm
- Phone companion with network access (PKJS fetches the API)

## Setup

```bash
npm install
pebble build
pebble install --phone <phone-ip>
```

Open the app settings on the phone to set latitude and longitude, then save.

Default Clay coordinates point at Paris (`48.86…`, `2.33…`). Adjust as needed.

## API

```
GET https://api.aladhan.com/v1/timings/{DD-MM-YYYY}?latitude={lat}&longitude={lon}
```

Date is the device's current local calendar day in `DD-MM-YYYY` (Aladhan path format; ISO `YYYY-MM-DD` is misparsed by the API). Only the five main prayer fields from `data.timings` are used.

## Project layout

```
src/
  c/mdbl.c                 # Moddable host stub
  embeddedjs/main.js       # Watch UI (Poco)
  pkjs/
    index.js               # Clay, fetch, cache, AppMessage
    config.js              # Settings UI
resources/images/
  menu_icon.png            # 25×25 launcher icon
```

## Tests

```bash
npm test
```

Unit tests cover the PKJS layer (URL builder, cache, parsing, AppMessage helpers).

## Publish to Rebble

There is no public RePebble upload API. The helper script bumps the version, runs tests, builds the `.pbw`, copies its path to the clipboard when possible, and opens the [developer dashboard](https://developer.repebble.com/dashboard). You still attach the binary manually after signing in.

```bash
npm run publish:rebble -- --bump patch --notes "Fix Aladhan DD-MM-YYYY date format"
```

Useful flags:

- `--no-bump` — keep the current `package.json` version
- `--bump minor` / `--bump major` — alternate semver bumps (default `patch`)
- `--skip-tests` — skip `npm test`
- `--no-open` — do not open the browser

Requires the `pebble` CLI on `PATH`. The built file is `build/pebble-salat.pbw`.

## Metadata

| Field | Value |
|-------|--------|
| Display name | salat |
| Author | vhoen |
| Version | 1.0.0 |
| UUID | `a7c4e2f1-9b3d-4e8a-b1c6-5d0f8a2e4b79` |

## License

See repository owner for licensing terms.
