# Threshold

Turn intimidating ambitions into a progressive path of real-world exposure missions, and measure
**fear vs reality** (prediction error) instead of streaks.

## Repository layout

| Path | What it is | Status |
|------|-----------|--------|
| [`mobile/`](mobile/) | **The app.** React Native + Expo, one codebase for iOS and web. | Working prototype |
| [`server/`](server/) | **The backend.** `POST /campaigns` — turns the onboarding answers into a mission path via an LLM. No dependencies. | Working |
| [`mockups/`](mockups/) | Static HTML/CSS prototypes of every screen — the design reference. | Complete |
| [`plans/`](plans/) | Product/IA dossier, the mock-up documentation report, and the LLM backend design. | Complete |
| [`Files for app design/`](Files%20for%20app%20design/) | Original project proposal and paper segments. | Source material |

## Running the app

The app calls a real LLM for campaign generation, so **start the server first**:

```bash
cd server
cp .env.example .env     # then set LLM_API_KEY and CLIENT_API_KEY
node index.js            # http://localhost:8787

cd ../mobile
npm install
nvm use 22               # Expo 57 needs Node 20+
npm run web              # browser
npm run ios              # iOS simulator
```

See [`server/README.md`](server/README.md) for the backend and
[`mobile/README.md`](mobile/README.md) for the route map and architecture.
Leave `EXPO_PUBLIC_API_URL` blank in `mobile/.env` to fall back to the built-in
demo campaign with no server running.

See [`mobile/README.md`](mobile/README.md) for the route map, architecture and the seams where the
real backend (auth, LLM generation, persistence) plugs in.

## What is real vs. mocked today

- **Real:** all 17 end-user screens, navigation, the pre-rating → in-progress → debrief → result
  loop, every metric derived from the debrief log (threshold score, deltas, friction-domain map),
  and **LLM campaign generation** — the app POSTs the three onboarding answers to
  `{EXPO_PUBLIC_API_URL}/campaigns`, and [`server/`](server/) prompts Claude with the user's
  ambition and friction to build the 8–10 mission path.
- **Mocked:** with no API URL configured, campaign generation falls back to a fixed 10-level
  networking path, and auth creates a local session. Both sit behind single-file interfaces so the
  swap is contained. The server is also stateless — nothing is persisted.
- **Not built here:** Admin (A01–A04) and the business report UIs (R01/R03). Those exist only as
  HTML mock-ups — they are desktop tooling, not part of this app.
