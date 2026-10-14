# Threshold — App (Expo)

The real implementation of Threshold: one React Native / Expo codebase that runs
in the browser today and ships to the App Store later, without a rewrite.

This is the counterpart to [`../mockups/`](../mockups/) — the static HTML
prototypes. The screens, copy and tokens here are a 1:1 port, so the two can be
compared side by side.

## Quick start

Start the backend first — campaign generation calls a real LLM through it:

```bash
cd ../server
cp .env.example .env   # set LLM_API_KEY (the gateway key) and CLIENT_API_KEY
node index.js          # http://localhost:8787
```

Then the app:

```bash
cd mobile
npm install

nvm use 22      # Expo 57 needs Node 20+; this machine defaults to Node 18
npm run web     # browser — same code that ships to iOS
npm run ios     # iOS simulator (Expo Go, needs Xcode)
npm run start   # QR code for Expo Go on a physical device
```

See [`../server/README.md`](../server/README.md) for the backend. Leaving
`EXPO_PUBLIC_API_URL` blank runs the built-in demo campaign with no server at
all — useful for reviewing screens, but it is a fixed 10-level networking path,
not generation.

## Environment

```bash
cp .env.example .env
```

```bash
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_API_KEY=<same value as CLIENT_API_KEY in server/.env>
```

Restart the dev server after editing; Expo inlines `EXPO_PUBLIC_*` at bundle
time, so hot reload will not pick up a change — you will keep hitting the old
URL until you restart.

Anyone can read values baked into a bundle, which is why the LLM gateway key is
**not** here: it lives in `../server/.env` and never leaves that process.
`EXPO_PUBLIC_API_KEY` only gates our own `/campaigns` route, so it is public by
design — it deters casual abuse, it does not authenticate a user.

Settings → Connection shows which generator is live, so a stale `.env` is
visible in the app rather than only in the logs.

On a physical device `localhost` resolves to the phone, not your Mac — use the
Mac's LAN IP (`ipconfig getifaddr en0`). The symptom is a bare "Could not reach
the campaign service." in the app and nothing at all in the server log, because
the request never arrives.

### Backend contract

Implemented by [`../server/`](../server/). `POST {EXPO_PUBLIC_API_URL}/campaigns`
with `Authorization: Bearer {API_KEY}`:

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
| S11 | Pre-Rating + Reality Check | `src/app/mission/[missionId]/pre-rating.tsx` |
| S12 | In Progress + Log an attempt | `src/app/mission/[missionId]/in-progress.tsx` |
| S13 | Debrief | `src/app/mission/[missionId]/debrief.tsx` |
| S14 | Archetype Result | `src/app/mission/[missionId]/result.tsx` |
| S15 | **Capability** (was Progress) | `src/app/(tabs)/progress.tsx` |
| S16 | Mission History | `src/app/history.tsx` |
| S17 | Settings | `src/app/(tabs)/settings.tsx` |
| S18 | Campaigns (modal) | `src/app/campaigns/index.tsx` |
| S18b | Campaign detail | `src/app/campaigns/[campaignId].tsx` |

Demo path: Splash → Welcome → **Continue as Demo** → Goal → Friction → Baseline →
Generating → Path Reveal → Home → Begin mission → Pre-Rating → In Progress →
Debrief → Result → Home / Progress.

## Project structure

```text
mobile/
  scripts/verify-model.mts # assertion harness for the Frontier/archetype rules
  src/
    app/                  # expo-router routes (file = screen)
      (tabs)/             # Home · Capability · Settings tab group
      campaigns/          # campaign switcher (modal) + read-only detail
      onboarding/         # first-run stack, S05–S09
      mission/[missionId] # core loop modal stack, S11–S14
      +html.tsx           # web-only HTML shell (no effect on iOS)
    components/ui/        # Button, Card, TextField, TabBar, DifficultySlider…
    lib/
      calibration.ts      # Frontier, archetypes, pacing, Reality Check
      campaigns.ts        # campaign status/progress/capability + legacy migration
      campaign-service.ts # CampaignService seam — HTTP, normalization, mock fallback
      config.ts           # EXPO_PUBLIC_* env access, single source of API URLs
      navigation.ts       # useGoBack — back that degrades to a fallback route
      mock-campaign.ts    # the 10-level demo path
      types.ts            # domain types
    store/app-store.tsx   # session + campaigns + debrief log (context + reducer)
    theme/tokens.ts       # port of mockups/css/tokens.css
```

## Scoring: the Frontier, not points

The model is specified in [`../plans/threshold-points-plan.md`](../plans/threshold-points-plan.md).
Three orthogonal mechanisms, kept separate on purpose:

| | What it is | Where |
|---|---|---|
| **Frontier** | A `1.0–10.0` watermark of the highest level reliably executed. **Monotonic.** Aborts and repetition cannot move it. | `lib/calibration.ts → frontierAfter()` |
| **Archetypes** | Every logged outcome classifies into exactly one of six states. Determines S14 copy. Rewards nothing. | `classifyDebrief()` |
| **Pacing** | Which mission is active next: advance, repeat, or bridge. | `paceNext()` |

There are deliberately **no points, no receipts and no streaks.** Rewarding
`expected − actual` would put a price on the user's honesty, and a tally would let
abort-grinding reach the same altitude as a genuine climb. Two rules make that
structural rather than a matter of tuning:

- `frontierAfter(prev, { outcome: 'attempted' })` returns `prev` **exactly**, for
  every input. Attempts are worth zero by construction, not by a cap.
- The rule is a `max`, not a `sum`, so twenty completions at Level 1 yield `1.0`.

**The frontier is frozen onto each debrief at write time** (`Debrief.frontierAfter`).
That is a deliberate exception to the "nothing here is stored" doctrine in
`calibration.ts`: diagnostics recompute from the log, but the ratchet does not,
because a monotonic value enforced by a formula humans edit is not monotonic.
Rows logged before the field existed are back-filled by `migrateDebriefs()`.

```bash
nvm use 22
npm run verify   # 116 assertions: the abort hole, inert repetition, §9's worked example
```

## Campaigns

**Campaigns are routes. Capability is the person.** Full spec in
[`../plans/threshold-multi-campaign-plan.md`](../plans/threshold-multi-campaign-plan.md).

- **One campaign is active at a time.** Pausing is implicit — activating B pauses A.
- **A campaign frontier is per-campaign** (levels are ordinal only within a route).
  **The capability profile is per-person** (S15), because "can I talk to strangers?"
  is not a property of the path that happened to exercise it.
- **`useApp().campaign` still returns the active campaign** as a derived selector, so
  every screen in the mission loop (S11–S14) reads it unchanged. Only campaign
  management and S15/S16 know there is an array.
- **Deleting a campaign never deletes debriefs.** It orphans them; they keep counting
  towards capability and render with a `Deleted campaign` chip in History. Campaigns
  are managed at `/campaigns` (a modal from the Home strip, or Settings) and there is
  no archive state — delete is the only destructive action.
- `Debrief.domain` is **frozen at write time** for the same reason as the frontier: a
  deleted campaign must not remove its missions from the domain table.

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
   it again in Home/Capability/Settings stacks a second bar over the first.
2. **Never call `router.back()` directly.** It is a silent no-op with an empty
   history — which happens on web refresh and on every deep link — leaving the
   header chevron dead. Use `useGoBack(fallback)` from `lib/navigation.ts`, or
   pass `fallback` to `BackHeader`, so the button degrades to a sensible parent
   route instead.

Leaving a finished mission goes through `useExitMission()` in
`mission/[missionId]/result.tsx`: it dismisses the modal stack rather than
replacing the top screen, so the user cannot press back into a mission they
already logged.

**Mission screens must resolve the mission through `missionById()`**, not
`campaign.missions.find(...)`. A bridge keeps the parent's *level* but carries its
own id, so a direct lookup would render a bridged mission as "no longer part of
your campaign" — at the exact moment the user is most fragile.

**Campaign management is unreachable from S11–S14.** The mission stack is
single-track by design (`in-progress.tsx` disables swipe-back precisely so the
user sits with the thing), and *"which other path could I be on?"* is the escape
hatch an exposure app cannot offer.

## Where the real work goes next

Three seams were in place, each a single-file swap. The first is now built:

1. **Campaign generation — done.** [`../server/`](../server/) answers
   `POST /campaigns` by prompting the model with the user's ambition and friction
   and validating the result. The client side needed no change: this file's
   `httpCampaignService` was already the right shape. What is left is deployment —
   the server currently runs on localhost with no TLS.
2. **Auth** — `signIn()` in `store/app-store.tsx` currently creates a local demo
   session. Point it at Supabase Auth and the onboarding/auth branch already
   behaves correctly. The server's shared client token is not a substitute: it is
   public, and it identifies the app, not the person.
3. **Persistence** — the reducer in `store/app-store.tsx` is the only writer of
   `campaigns` and `debriefs`, and the store is still in-memory. Add Supabase
   reads/writes inside its actions; the calibration metrics recompute from the
   debrief log automatically. **Two things persistence must preserve, because the
   whole model depends on them:**
   - `frontierAfter` is stored **per debrief** and must be read back verbatim, not
     recomputed. A `migrateDebriefs` back-fill is safe only for rows that never
     had it.
   - **Adding a campaign must append**, never replace the array. "Starting campaign
     2 keeps campaign 1's log" is pinned by `npm run verify`.
   Add a `schemaVersion` to the persisted state so the legacy single-campaign shape
   (§4.5 of the multi-campaign plan) has a defined migration point.

## Resolved decisions

Both scoring plans are approved and implemented; the open questions they carried
are closed in their §13 / §10 respectively.

- **Scoring model — resolved.** The `thresholdScore()` mean of absolute prediction
  error is **deleted**. It rewarded inaccuracy as much as growth and punished
  courage. Replaced by the Frontier, six debrief archetypes and a pacing engine —
  see *Scoring* above and `plans/threshold-points-plan.md`.
- **Multi-campaign — resolved.** One active campaign, no archive state, `Progress`
  renamed `Capability`, and the S15 domain table shows both `L{n}` (path
  provenance) and `Max {n}` (cardinal distress tolerance). See
  `plans/threshold-multi-campaign-plan.md` §10.
- **Auth depth.** Real email/password plus "Continue as Demo" is implemented;
  OAuth was never specified.
- **Admin screens.** A01–A04 are not built here. They are desktop web tooling and
  do not belong in this mobile app.
- **Business report screens.** R01 / R03 exist only as HTML mock-ups.

## Out of scope (still)

- Push notification delivery and App Store submission config.
- The Admin (A01–A04) and report (R01, R03) UIs. Note A01 (*Prompt Rules*) now has
  a natural backend seam: the prompt and JSON schema live in
  `../server/prompts/campaign.js`, so that admin screen can edit them without
  shipping a new binary — but the screen itself is not built.
- Streaming generation progress. The status lines on S08 are this app's own
  ticker and stop at the last step; the server hears nothing until generation
  completes.
