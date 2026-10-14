# Threshold Mock-ups

Clickable HTML prototypes for **all end-user screens (S01–S18)**, **Admin (A01–A04)**, and textbook business reports **Detailed (R01)** + **Exception (R03)**.

These mirror [`../mobile/`](../mobile/) 1:1 and are reviewed side by side — if a
screen changes here, it changes there, and vice versa.

## Quick start

1. In Finder or VS Code, go to `mockups/`.
2. Double-click [`index.html`](index.html) (or right-click → Open With → Chrome/Safari).
3. Or in Terminal from the project root:

```bash
open mockups/index.html
```

4. Use the walkthrough chips for the end-user happy path, or open Admin / Exception cards.

No build step. CSS is static under [`css/`](css/).

- End-user screens use a **390×844** iPhone frame.
- Admin + Exception report use a **desktop admin shell**.

## The scoring model on display

The screens show the **Frontier** model, not a points system. Read
[`../plans/threshold-points-plan.md`](../plans/threshold-points-plan.md) first:

- **Frontier** — a monotonic `1.0–10.0` watermark of the highest level of friction
  the user can currently walk into and hold. It lives on S14, S15 and the campaign
  strip. There is no XP total anywhere, and no near-miss countdown.
- **Six debrief archetypes** — every logged outcome classifies into exactly one
  (Expectancy Violation, Distress Tolerance, Baseline Mastery, Approach Attempt,
  Calibration Match, Underestimate). The archetype drives S14's copy and rewards
  nothing. Notes on all six are in the footer comment of
  [`screens/s14-result.html`](screens/s14-result.html).
- **Pacing engine** — advance, repeat, or swap in a **bridge** (same level,
  lighter content). An approach attempt always produces a bridge, so the user is
  never parked on the mission that beat them.
- **Reality Check** — the pre-mission callout on S11. It states a fact about the
  user's history and is never predictive.

Deliberately absent from every screen: points, receipts, streak counters,
days-idle, "at risk" states, and any comparison to other people.

## Multi-campaign

**Campaigns are routes. Capability is the person.** One campaign is active at a
time; see [`../plans/threshold-multi-campaign-plan.md`](../plans/threshold-multi-campaign-plan.md).

- The **Home campaign strip** (S10) is the switcher, and it opens **S18** as a
  modal. Settings has the same entry.
- **S15 is now Capability**, not Progress — it measures the person across every
  campaign, so it shows no single scalar hero. Domain rows carry both `L{n}`
  (path provenance) and `Max {n}` (cardinal distress tolerance).
- **S09 gains a carry-over card** for campaign #2 and later. This is the most
  important line in the feature: a user who finished at `9.8` starts a new path
  at `0.0`, and without it the app appears to have erased everything.
- **Deleting a campaign keeps every debrief.** There is no archive state.

## Demo content

- **Campaigns:** Build a founder network (active) · Speak up in meetings
  (paused) · Cold outreach to strangers (completed at `9.8`)

  A campaign name is **generated with the path**, not cut from the ambition the
  user typed. The demo ambition is *"Network with startup founders and build real
  relationships in the ecosystem"*; the name is the goal that sentence points at.
  Naming the input gives a fragment like *"Network with startup founders and build
  real relationships"* that says nothing about where the path is going. See
  `server/prompts/campaign.js` (`name`) and `plans/threshold-llm-backend-plan.md` §5.
- **Frontier:** `7.8` · Beyond Your Path
- **Friction:** Fear of awkward cold approaches
- **Baseline:** Thoughtful public comment on a founder post
- **Auth:** Email/password fields + **Continue as Demo**

## End-user screen map (S01–S18)

| ID | File | Flow |
|----|------|------|
| S01 | [`screens/s01-splash.html`](screens/s01-splash.html) | Entry |
| S02 | [`screens/s02-welcome.html`](screens/s02-welcome.html) | Entry |
| S03 | [`screens/s03-sign-in.html`](screens/s03-sign-in.html) | Auth |
| S04 | [`screens/s04-sign-up.html`](screens/s04-sign-up.html) | Auth |
| S05 | [`screens/s05-goal.html`](screens/s05-goal.html) | Onboarding |
| S06 | [`screens/s06-friction.html`](screens/s06-friction.html) | Onboarding |
| S07 | [`screens/s07-baseline.html`](screens/s07-baseline.html) | Onboarding |
| S08 | [`screens/s08-generating.html`](screens/s08-generating.html) | Onboarding |
| S09 | [`screens/s09-path-reveal.html`](screens/s09-path-reveal.html) | Onboarding · carry-over card for campaign #2+ |
| S10 | [`screens/s10-home.html`](screens/s10-home.html) | Core · campaign strip + rung rail |
| S11 | [`screens/s11-pre-rating.html`](screens/s11-pre-rating.html) | Core loop · Reality Check |
| S12 | [`screens/s12-in-progress.html`](screens/s12-in-progress.html) | Core loop · "Log an attempt" + freeze chips |
| S13 | [`screens/s13-debrief.html`](screens/s13-debrief.html) | Core loop |
| S14 | [`screens/s14-result.html`](screens/s14-result.html) | Core loop · archetype-driven |
| S15 | [`screens/s15-progress.html`](screens/s15-progress.html) | **Capability** (was Progress) |
| S16 | [`screens/s16-history.html`](screens/s16-history.html) | Capability · attribution + filter |
| S17 | [`screens/s17-settings.html`](screens/s17-settings.html) | Account · campaigns + new |
| S18 | [`screens/s18-campaigns.html`](screens/s18-campaigns.html) | Modal · switcher, add, delete |

## Admin + report map

| ID | File | Role |
|----|------|------|
| A01 | [`screens/a01-prompt-rules.html`](screens/a01-prompt-rules.html) | Prompt / schema tuning (Story 5) |
| A02 | [`screens/a02-api-usage.html`](screens/a02-api-usage.html) | Tokens, cost, errors (Story 6) |
| A03 | [`screens/a03-rebuild-campaign.html`](screens/a03-rebuild-campaign.html) | Rebuild corrupt campaigns (Story 7) |
| A04 | [`screens/a04-feedback-queue.html`](screens/a04-feedback-queue.html) | Feedback triage (Story 8) |
| R01 | [`screens/r01-detailed-report.html`](screens/r01-detailed-report.html) | **Detailed report** — one row per mission/debrief transaction |
| R03 | [`screens/r03-exception-report.html`](screens/r03-exception-report.html) | **Exception report** — out-of-range only |

## Business report type (course taxonomy)

| Type | Built? | Notes |
|------|--------|-------|
| **Detailed** | **Yes (R01)** | Line-by-line mission debrief transactions (like a list of overdue accounts) |
| Summary | No | Deferred |
| **Exception** | **Yes (R03)** | Best conceptual fit — only out-of-range prediction errors, failed generations, unsafe missions |
| Executive | No | Deferred |

> Note: [`../plans/threshold-mockups-report.md`](../plans/threshold-mockups-report.md) is a **design documentation report** about the mock-ups. It is **not** a textbook business report. Textbook UIs: [`r01-detailed-report.html`](screens/r01-detailed-report.html), [`r03-exception-report.html`](screens/r03-exception-report.html).

## Primary click path (end user)

Splash → Welcome → Sign Up → Goal → Friction → Baseline → Generating → Path Reveal → Home → Pre-Rating → In Progress → Debrief → Result → Home / Capability

Campaign switching: Home strip → Campaigns (S18) → tap a card, or `›` for detail.

Tab bar: **Home · Capability · Settings**

## Design tokens

Defined in [`css/tokens.css`](css/tokens.css):

- Void `#0A0A0A`, Charcoal `#1A1A1A`, Amber `#F59E0B`
- System / SF Pro font stack
- 12px card radius, pill CTAs
- Admin styles: [`css/admin.css`](css/admin.css)

## Related docs

- Planning dossier: [`../plans/threshold-mockups-plan.md`](../plans/threshold-mockups-plan.md)
- Mock-up documentation report: [`../plans/threshold-mockups-report.md`](../plans/threshold-mockups-report.md)
- Scoring model (implemented): [`../plans/threshold-points-plan.md`](../plans/threshold-points-plan.md)
- Multiple campaigns (implemented): [`../plans/threshold-multi-campaign-plan.md`](../plans/threshold-multi-campaign-plan.md)

## Out of scope

- Real auth / LLM / push  
- Detailed / Summary / Executive business report UIs (Exception only, by choice)  
- React Native / Expo implementation  
