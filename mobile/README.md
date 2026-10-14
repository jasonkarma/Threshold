# Threshold — App (Expo)

The real implementation of Threshold: one React Native / Expo codebase that runs
in the browser today and ships to the App Store later, without a rewrite.

This is the counterpart to [`../mockups/`](../mockups/) — the static HTML
prototypes. The screens, copy and tokens here are a 1:1 port, so the two can be
compared side by side.

## Quick start

```bash
cd mobile
npm install

nvm use 22      # Expo 57 needs Node 20+; this machine defaults to Node 18
npm run web     # browser — same code that ships to iOS
npm run ios     # iOS simulator (Expo Go, needs Xcode)
npm run start   # QR code for Expo Go on a physical device
```

## Environment

The app runs with **no configuration** — with no `.env` it uses the built-in
demo campaign. To point it at your backend:

```bash
cp .env.example .env
```

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_API_KEY=your-client-key
```

Restart the dev server after editing; Expo inlines `EXPO_PUBLIC_*` at bundle
time, so hot reload will not pick up a change. Anyone can read values baked into
a bundle — `EXPO_PUBLIC_API_KEY` authenticates the *app* against your route, and
your model-provider key belongs on the server only.

Settings → Connection shows which generator is live, so a stale `.env` is
visible in the app rather than only in the logs.

### Backend contract

`POST {EXPO_PUBLIC_API_URL}/campaigns` with `Authorization: Bearer {API_KEY}`:

```jsonc
// request
{ "seed": { "ambition": "…", "friction": "…", "baseline": "…" } }

// response — every field except `missions` is optional
{
  "id": "campaign-abc",
  "label": "Network with startup founders",
  "createdAt": "2026-10-14T00:00:00.000Z",
  "completedLevels": [],          // levels to restore as completed
  "missions": [
    {
      "level": 1,
      "title": "Meaningful comment on a founder post",
      "description": "…",
      "tags": ["Specific", "Public"],
      "domain": "public_async",   // public_async | live_strangers | authority
      "context": "Public async · Low social risk · ~5 minutes",
      "tip": "…"
    }
  ]
}
```

`{ "campaign": { … } }` is also accepted. Levels are re-ordered server-agnostically
and exactly one mission is marked active (the first not in `completedLevels`), so
a malformed payload degrades into a usable path instead of crashing a screen.
Errors — non-2xx, timeout, unreachable, malformed JSON — surface on S08 with a
retry, since that screen has no back affordance by design.

Run one platform at a time. `--web` and `--ios` both claim port 8081 by default,
so if the web server is already up, start the native one on another port:

```bash
npx expo start --ios --port 8082
```

On web the app uses whatever width the browser gives it, so it is genuinely
responsive rather than fixed-width. Use the browser's device toolbar
(390 × 844) to review it at iPhone proportions.

## Screen map

Every mock-up screen has a route. `S##` refers to the IDs in
[`../plans/threshold-mockups-plan.md`](../plans/threshold-mockups-plan.md).

| ID | Screen | Route |
|----|--------|-------|
| S01 | Splash | `src/app/index.tsx` |
| S02 | Welcome | `src/app/welcome.tsx` |
| S03 | Sign In | `src/app/sign-in.tsx` |
| S04 | Sign Up | `src/app/sign-up.tsx` |
| S05 | Onboarding · Goal | `src/app/onboarding/goal.tsx` |
| S06 | Onboarding · Friction | `src/app/onboarding/friction.tsx` |
| S07 | Onboarding · Baseline | `src/app/onboarding/baseline.tsx` |
| S08 | Generating Campaign | `src/app/onboarding/generating.tsx` |
| S09 | Mission Path Reveal | `src/app/onboarding/path-reveal.tsx` |
| S10 | Home Dashboard | `src/app/(tabs)/home.tsx` |
| S11 | Pre-Rating | `src/app/mission/[missionId]/pre-rating.tsx` |
| S12 | In Progress | `src/app/mission/[missionId]/in-progress.tsx` |
| S13 | Debrief | `src/app/mission/[missionId]/debrief.tsx` |
| S14 | Prediction Error Result | `src/app/mission/[missionId]/result.tsx` |
| S15 | Progress | `src/app/(tabs)/progress.tsx` |
| S16 | Mission History | `src/app/history.tsx` |
| S17 | Settings | `src/app/(tabs)/settings.tsx` |

Demo path: Splash → Welcome → **Continue as Demo** → Goal → Friction → Baseline →
Generating → Path Reveal → Home → Begin mission → Pre-Rating → In Progress →
Debrief → Result → Home / Progress.

## Project structure

```text
mobile/
  src/
    app/                  # expo-router routes (file = screen)
      (tabs)/             # Home · Progress · Settings tab group
      onboarding/         # first-run stack, S05–S09
      mission/[missionId] # core loop modal stack, S11–S14
      +html.tsx           # web-only HTML shell (no effect on iOS)
    components/ui/        # Button, Card, TextField, TabBar, DifficultySlider…
    lib/
      calibration.ts      # derived metrics: threshold score, deltas, domain map
      campaign-service.ts # CampaignService seam — HTTP, normalization, mock fallback
      config.ts           # EXPO_PUBLIC_* env access, single source of API URLs
      navigation.ts       # useGoBack — back that degrades to a fallback route
      mock-campaign.ts    # the 10-level demo path
      types.ts            # domain types
    store/app-store.tsx   # session + campaign + debrief log (context + reducer)
    theme/tokens.ts       # port of mockups/css/tokens.css
```

## Design tokens

`src/theme/tokens.ts` is a direct port of `mockups/css/tokens.css` — same void
black, charcoal surfaces, single amber accent and 4px spacing base. Change
colours, type scale or radius **there**, never inline in a screen.

## Navigation

Routes live in `src/app/`; `_layout.tsx` files define the three navigators
(pre-auth stack, tabs, mission modal stack). Two rules worth knowing before
editing a screen:

1. **Never render `TabBar` inside a tab screen.** `(tabs)/_layout.tsx` passes it
   to the navigator as `tabBar`, which renders it once for the group. Rendering
   it again in Home/Progress/Settings stacks a second bar over the first.
2. **Never call `router.back()` directly.** It is a silent no-op with an empty
   history — which happens on web refresh and on every deep link — leaving the
   header chevron dead. Use `useGoBack(fallback)` from `lib/navigation.ts`, or
   pass `fallback` to `BackHeader`, so the button degrades to a sensible parent
   route instead.

Leaving a finished mission goes through `useExitMission()` in
`mission/[missionId]/result.tsx`: it dismisses the modal stack rather than
replacing the top screen, so the user cannot press back into a mission they
already logged.

## Where the real work goes next

Three seams are already in place, each a single-file swap:

1. **Campaign generation** — `lib/campaign-service.ts` already POSTs to
   `{EXPO_PUBLIC_API_URL}/campaigns` whenever that variable is set. What is left
   is the server side: an Edge Function that calls the model with the prompt
   templates from A01 and returns the JSON above.
2. **Auth** — `signIn()` in `store/app-store.tsx` currently creates a local demo
   session. Point it at Supabase Auth and the onboarding/auth branch already
   behaves correctly.
3. **Persistence** — the reducer in `store/app-store.tsx` is the only writer of
   `campaign` and `debriefs`. Add Supabase reads/writes inside its actions; the
   calibration metrics recompute from the debrief log automatically.

## Open decisions carried over from the mock-up phase

These are unchanged and still affect this code:

- **Threshold Score formula.** Currently the mean absolute prediction error
  across completed missions (one mission at expected 62 / actual 28 → 34, which
  matches the mock-ups). This rewards inaccuracy as much as growth, so it needs
  a second component for demonstrated exposure. See
  `lib/calibration.ts → thresholdScore()`.
- **Auth depth.** Real email/password plus "Continue as Demo" is implemented;
  OAuth was never specified.
- **Admin screens.** A01–A04 are not built here. They are desktop web tooling and
  do not belong in this mobile app.
- **Business report screens.** R01 / R03 exist only as HTML mock-ups.

## Out of scope (still)

- Real LLM calls, push notification delivery, and App Store submission config.
- The Admin (A01–A04) and report (R01, R03) UIs.
