# Threshold

Turn intimidating ambitions into a progressive path of real-world exposure missions, and measure
**fear vs reality** (prediction error) instead of streaks.

## Repository layout

| Path | What it is | Status |
|------|-----------|--------|
| [`mobile/`](mobile/) | **The app.** React Native + Expo, one codebase for iOS and web. | Working prototype |
| [`mockups/`](mockups/) | Static HTML/CSS prototypes of every screen — the design reference. | Complete |
| [`plans/`](plans/) | Product/IA dossier and the mock-up documentation report. | Complete |
| [`Files for app design/`](Files%20for%20app%20design/) | Original project proposal and paper segments. | Source material |

## Running the app

```bash
cd mobile
npm install
nvm use 22       # Expo 57 needs Node 20+
npm run web      # browser
npm run ios      # iOS simulator
```

See [`mobile/README.md`](mobile/README.md) for the route map, architecture and the seams where the
real backend (auth, LLM generation, persistence) plugs in.

## What is real vs. mocked today

- **Real:** all 17 end-user screens, navigation, the pre-rating → in-progress → debrief → result
  loop, every metric derived from the debrief log (threshold score, deltas, friction-domain map),
  and the HTTP client for campaign generation — set `EXPO_PUBLIC_API_URL` in `mobile/.env` and the
  app POSTs to `{API_URL}/campaigns` instead of using the demo path.
- **Mocked:** with no API URL configured, campaign generation returns a fixed 10-level networking
  path, and auth creates a local session. Both sit behind single-file interfaces so the swap is
  contained.
- **Not built here:** Admin (A01–A04) and the business report UIs (R01/R03). Those exist only as
  HTML mock-ups — they are desktop tooling, not part of this app.
