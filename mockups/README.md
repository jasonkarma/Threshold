# Threshold Mock-ups

Clickable HTML prototypes for **all end-user screens (S01–S17)**, **Admin (A01–A04)**, and textbook business reports **Detailed (R01)** + **Exception (R03)**.

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

## Demo content

- **Campaign:** Network with startup founders  
- **Friction:** Fear of awkward cold approaches  
- **Baseline:** Thoughtful public comment on a founder post  
- **Auth:** Email/password fields + **Continue as Demo**

## End-user screen map (S01–S17)

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
| S09 | [`screens/s09-path-reveal.html`](screens/s09-path-reveal.html) | Onboarding |
| S10 | [`screens/s10-home.html`](screens/s10-home.html) | Core |
| S11 | [`screens/s11-pre-rating.html`](screens/s11-pre-rating.html) | Core loop |
| S12 | [`screens/s12-in-progress.html`](screens/s12-in-progress.html) | Core loop |
| S13 | [`screens/s13-debrief.html`](screens/s13-debrief.html) | Core loop |
| S14 | [`screens/s14-result.html`](screens/s14-result.html) | Core loop |
| S15 | [`screens/s15-progress.html`](screens/s15-progress.html) | Progress |
| S16 | [`screens/s16-history.html`](screens/s16-history.html) | Progress |
| S17 | [`screens/s17-settings.html`](screens/s17-settings.html) | Account |

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

Splash → Welcome → Sign Up → Goal → Friction → Baseline → Generating → Path Reveal → Home → Pre-Rating → In Progress → Debrief → Result → Home / Progress

Tab bar: **Home · Progress · Settings**

## Design tokens

Defined in [`css/tokens.css`](css/tokens.css):

- Void `#0A0A0A`, Charcoal `#1A1A1A`, Amber `#F59E0B`
- System / SF Pro font stack
- 12px card radius, pill CTAs
- Admin styles: [`css/admin.css`](css/admin.css)

## Related docs

- Planning dossier: [`../plans/threshold-mockups-plan.md`](../plans/threshold-mockups-plan.md)
- Mock-up documentation report: [`../plans/threshold-mockups-report.md`](../plans/threshold-mockups-report.md)

## Out of scope

- Real auth / LLM / push  
- Detailed / Summary / Executive business report UIs (Exception only, by choice)  
- React Native / Expo implementation  
