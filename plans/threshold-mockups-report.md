# Threshold — Detailed Mock-up Report

**Product:** Threshold
**Deliverable:** Full HTML mock-ups — end-user (S01–S17), Admin (A01–A04), Detailed report (R01), Exception report (R03)
**Location:** [`mockups/`](../mockups/)
**Plan reference:** [`threshold-mockups-plan.md`](threshold-mockups-plan.md)
**Date:** 2026-10-04
**Decisions locked:** Demo Continue · 3-tab bar · 390×844 frame · Founders sample campaign · Admin included · Detailed + Exception reports (Summary/Executive deferred)

> **Taxonomy note:** This markdown file is a *design documentation report* describing the mock-ups. It is **not** one of the textbook business report types (Detailed / Summary / Exception / Executive). Textbook UIs: **Detailed** [`r01-detailed-report.html`](../mockups/screens/r01-detailed-report.html), **Exception** [`r03-exception-report.html`](../mockups/screens/r03-exception-report.html).

---

## 1. Executive summary

This report documents the complete mock-up set for Threshold, an iOS-first action app that turns intimidating ambitions into progressive real-world missions and measures **prediction error** (expected vs actual difficulty) instead of streaks.

All **17 end-user screens**, **4 admin screens**, and textbook **Detailed (R01)** + **Exception (R03)** business reports are implemented as clickable static HTML prototypes with shared design tokens. Navigation follows the approved Screen Flow.

**How to review:** open [`mockups/index.html`](../mockups/index.html) in a browser.

---

## 2. Design system applied

| Token | Value | Role |
|-------|-------|------|
| Void | `#0A0A0A` | Background |
| Charcoal | `#1A1A1A` | Cards / surfaces |
| Slate | `#2A2A2A` | Borders / inputs |
| Amber | `#F59E0B` | Primary CTA / accent |
| Success | `#10B981` | Positive delta / completed |
| Snow / Fog / Muted | `#F9FAFB` / `#9CA3AF` / `#6B7280` | Text hierarchy |

**Typography:** system SF Pro stack; mono for 0–100 scores.  
**Components:** Primary/Secondary/Ghost buttons, fields, chips, mission cards, difficulty slider, score boxes, timeline, progress ring, tab bar, nav header.  
**Files:** [`mockups/css/tokens.css`](../mockups/css/tokens.css), [`components.css`](../mockups/css/components.css), [`screens.css`](../mockups/css/screens.css).

**UX principles enforced in copy & layout**

1. Exposure over gamification (no streak shame)  
2. Fear vs reality always visible after debrief  
3. Pre-rating and debrief optimized as short flows  
4. Concrete founder-networking sample missions  
5. One amber primary CTA per screen where possible  

---

## 3. Information architecture (implemented)

```text
Pre-auth:   Splash → Welcome → Sign In | Sign Up | Demo
Onboarding: Goal → Friction → Baseline → Generating → Path Reveal
Main tabs:  Home | Progress | Settings
Mission:    Home → Pre-Rating → In Progress → Debrief → Result → Home
Progress:   Progress → Mission History
Admin:      Prompt Rules | API Usage | Rebuild Campaign | Feedback Queue
Reports:    Detailed Report (R01) · Exception Report (R03)
```

## 3b. Business report type decision

| Textbook type | Fit for Threshold | Built? |
|---------------|-------------------|--------|
| **Detailed** | Good for mission/debrief line items (one row per transaction) | **Yes — R01** |
| Summary | Good for weekly DAU / tokens / completions | No (deferred) |
| **Exception** | **Best conceptual fit** — prediction-error outliers, failed generations, unsafe missions; silent when healthy | **Yes — R03** |
| Executive | Useful later for overall health | No (deferred) |

---

## 4. Screen-by-screen report

### S01 — Splash  
**File:** [`s01-splash.html`](../mockups/screens/s01-splash.html)  
**Purpose:** Brand beat on cold start.  
**UI:** Centered THRESHOLD wordmark, amber bar, tagline.  
**Behavior:** Auto-advance ~1.6s to Welcome; tap also continues.  
**States:** Default only.  
**Links:** → S02  

### S02 — Welcome  
**File:** [`s02-welcome.html`](../mockups/screens/s02-welcome.html)  
**Purpose:** Choose auth path; state product positioning.  
**UI:** Headline “Cross the threshold.”, value prop, exposure card, CTAs.  
**Actions:** Sign Up → S04 · Sign In → S03 · Continue as Demo → S05  
**Notes:** Explicitly contrasts vs streak apps.  

### S03 — Sign In  
**File:** [`s03-sign-in.html`](../mockups/screens/s03-sign-in.html)  
**Purpose:** Returning user auth.  
**Fields:** Email, password (prefilled for demo).  
**Actions:** Sign In → S10 (assumes existing campaign) · Sign Up link · Demo → S10  
**States shown:** Default (validation/loading not animated).  

### S04 — Sign Up  
**File:** [`s04-sign-up.html`](../mockups/screens/s04-sign-up.html)  
**Purpose:** New account → onboarding.  
**Fields:** Name, email, password.  
**Actions:** Create account → S05 · Sign In link · Demo → S05  

### S05 — Onboarding Goal  
**File:** [`s05-goal.html`](../mockups/screens/s05-goal.html)  
**Purpose:** Capture `ambitionText` (User Story 1).  
**UI:** Step 1/3, large textarea, suggestion chips.  
**Sample:** Network with startup founders…  
**CTA:** Continue → S06  

### S06 — Onboarding Friction  
**File:** [`s06-friction.html`](../mockups/screens/s06-friction.html)  
**Purpose:** Capture `frictionPoint`.  
**UI:** Step 2/3, textarea, helper insight card.  
**Sample:** Fear of awkward cold approaches…  
**CTA:** Continue → S07  

### S07 — Onboarding Baseline  
**File:** [`s07-baseline.html`](../mockups/screens/s07-baseline.html)  
**Purpose:** Capture `baselineAction` to anchor Level 1.  
**UI:** Step 3/3, text field, chips.  
**Sample:** Comment thoughtfully on one founder’s public post  
**CTA:** Generate my mission path → S08  

### S08 — Generating Campaign  
**File:** [`s08-generating.html`](../mockups/screens/s08-generating.html)  
**Purpose:** LLM wait / trust state.  
**UI:** Amber pulse spinner, rotating status lines, summary of inputs.  
**Behavior:** Auto-advances to S09 after status cycle.  
**Notes:** No back control during generation (per plan).  

### S09 — Mission Path Reveal  
**File:** [`s09-path-reveal.html`](../mockups/screens/s09-path-reveal.html)  
**Purpose:** Show sequential ~10-level path before Home.  
**UI:** Timeline Levels 1–5 detailed + 6–10 teaser; Level 1 active.  
**CTA:** Start Level 1 → S10  
**Maps to:** Story 1 acceptance (sequential mission path).  

### S10 — Home Dashboard  
**File:** [`s10-home.html`](../mockups/screens/s10-home.html)  
**Purpose:** Daily hub for active mission + threshold score.  
**UI:** Greeting, Threshold 34 badge, active L1 card, locked L2 preview, empty insight.  
**CTA:** Begin mission → S11  
**Chrome:** Tab bar — Home active · Progress · Settings  

### S11 — Active Mission Pre-Rating  
**File:** [`s11-pre-rating.html`](../mockups/screens/s11-pre-rating.html)  
**Purpose:** Record `expectedDifficulty` 0–100 before action (Story 2).  
**UI:** Mission detail card, interactive slider (default 62), Cancel.  
**CTA:** I'm ready — start → S12  
**Rule:** Rating is the gate before in-progress (mocked as always available after interaction).  

### S12 — Mission In Progress  
**File:** [`s12-in-progress.html`](../mockups/screens/s12-in-progress.html)  
**Purpose:** Calm companion while user acts in the real world.  
**UI:** “Go do the thing.”, mission summary, expected score chip, tip card.  
**CTAs:** I did it — debrief → S13 · Abort/pause → S10  
**Tone:** No streak timer pressure.  

### S13 — Post-Mission Debrief  
**File:** [`s13-debrief.html`](../mockups/screens/s13-debrief.html)  
**Purpose:** Capture `actualDifficulty` + reflection notes (Story 3).  
**UI:** Actual slider (default 28), notes textarea, shows prior expected 62.  
**CTA:** Submit debrief → S14  
**Required fields:** Both score and notes (enforced in real app; shown filled in mock).  

### S14 — Prediction Error Result  
**File:** [`s14-result.html`](../mockups/screens/s14-result.html)  
**Purpose:** Visualize expected vs actual vs delta; unlock messaging.  
**UI:** Success badge, insight headline, score row 62 / 28 / −34, calibration card, note echo.  
**CTAs:** Back to Home → S10 · View Progress → S15  
**System note:** Represents Adjust mission difficulty use case.  

### S15 — Progress / Threshold Level  
**File:** [`s15-progress.html`](../mockups/screens/s15-progress.html)  
**Purpose:** Proof of growth without streak penalties (Story 4).  
**UI:** Progress ring (34), Done / Avg Δ / Level stats, friction domain list.  
**CTA:** See full history → S16  
**Chrome:** Tab bar — Progress active  

### S16 — Mission History  
**File:** [`s16-history.html`](../mockups/screens/s16-history.html)  
**Purpose:** Chronological completed missions with scores.  
**UI:** L1 history card with Exp/Act/Δ + note; empty-future encouragement.  
**Back:** → S15  

### S17 — Settings / Profile
**File:** [`s17-settings.html`](../mockups/screens/s17-settings.html)
**Purpose:** Account, preferences, campaign controls, sign out.
**UI:** Profile card, mission reminders toggle, regenerate campaign row, sign out → Welcome.
**Chrome:** Tab bar — Settings active
**Version:** Mock v0.1

### A01 — Prompt Rules
**File:** [`a01-prompt-rules.html`](../mockups/screens/a01-prompt-rules.html)
**Purpose:** Admin Story 5 — update LLM prompt templates & JSON schema without app binary changes.
**UI:** Desktop admin shell, schema version stats, prompt textarea, test JSON output.

### A02 — API Usage
**File:** [`a02-api-usage.html`](../mockups/screens/a02-api-usage.html)
**Purpose:** Admin Story 6 — monitor DAU, tokens, cost, request errors.
**UI:** Stat cards + call log table; link to Exception report.

### A03 — Rebuild Campaign
**File:** [`a03-rebuild-campaign.html`](../mockups/screens/a03-rebuild-campaign.html)
**Purpose:** Admin/Support Story 7 — regenerate corrupt future levels; preserve completion logs.
**UI:** User/campaign IDs, reason, safety toggles, last rebuild result.

### A04 — Feedback Queue
**File:** [`a04-feedback-queue.html`](../mockups/screens/a04-feedback-queue.html)
**Purpose:** Support Story 8 — triage open / in-progress / resolved reports.
**UI:** Queue stats + ticket table (bad mission, UI bug, generation, copy).

### R01 — Detailed Report (textbook business report)
**File:** [`r01-detailed-report.html`](../mockups/screens/r01-detailed-report.html)
**Purpose:** Textbook **Detailed report** — specific information on each business transaction.
**Grain:** One row per `debriefID` (mission attempt) with user, campaign/level, mission title, expected, actual, Δ, reflection excerpt, status.
**UI:** Definition banner, filters (date/user/campaign/status), row counts, full transaction table, contrast note vs Exception report.
**Analogy:** Like a list of overdue accounts where each line is one account — here each line is one mission debrief.

### R03 — Exception Report (textbook business report)
**File:** [`r03-exception-report.html`](../mockups/screens/r03-exception-report.html)
**Purpose:** Textbook **Exception report** — only rows outside predefined ranges.
**Rules mocked:** `|Δ| ≥ 30` · `generateCampaign` ERROR · open Bad mission feedback · daily cost guardrail.
**UI:** Definition banner, filters, severity counts, exception table with deep links to A01/A03/A04.
**Why this type:** Matches Threshold’s prediction-error + failure-detection core; silent when healthy.

---

## 5. Traceability to requirements

| Requirement source | Mock-up coverage |
|--------------------|------------------|
| Story 1 Goal breakdown | S05–S09 |
| Story 2 Pre difficulty | S11 |
| Story 3 Debrief + delta | S13–S14 |
| Story 4 Progress / no streak penalty | S15–S16 copy + UI |
| Story 5 Prompt & model tuning | A01 |
| Story 6 Database / API monitoring | A02 |
| Story 7 Failed mission regeneration | A03 |
| Story 8 Review bugs / feedback | A04 |
| Use case Create campaign | S05–S09 |
| Use case Record expected difficulty | S11 |
| Use case Record mission debrief | S13–S14 |
| Use case View progress | S15–S16 |
| Use case Adjust difficulty | S14 calibration message |
| Use case Produce API usage / exceptions | A02 + R03 |
| Brand guidelines | tokens.css + all screens |
| Screen Flow diagram | Full click path in index + hrefs |
| Operational need: fast before/after | S11 & S13 short layouts |
| Textbook Detailed report | R01 |
| Textbook Exception report | R03 |

---

## 6. Interaction matrix (implemented links)

| From | Action | To |
|------|--------|----|
| S01 | auto/tap | S02 |
| S02 | Sign Up | S04 |
| S02 | Sign In | S03 |
| S02 | Demo | S05 |
| S03 | Sign In / Demo | S10 |
| S04 | Create / Demo | S05 |
| S05→S06→S07→S08→S09→S10 | Continue chain | |
| S10 | Begin mission | S11 |
| S11 | Start | S12 |
| S11 | Cancel | S10 |
| S12 | Debrief | S13 |
| S12 | Abort | S10 |
| S13 | Submit | S14 |
| S14 | Home / Progress | S10 / S15 |
| S15 | History | S16 |
| Tabs | Home/Progress/Settings | S10/S15/S17 |
| S17 | Sign out | S02 |

---

## 7. Sample data used across screens

- **User:** Karma Chou · karma@threshold.app  
- **Ambition:** Network with startup founders and build real relationships  
- **Friction:** Fear of awkward cold approaches  
- **Baseline:** Comment thoughtfully on one founder’s public post  
- **L1 mission:** Meaningful comment on a founder post  
- **Expected / Actual / Δ:** 62 / 28 / −34  
- **Threshold score:** 34 · Next level unlocked: 2  

---

## 8. File inventory

```text
mockups/
  index.html
  README.md
  css/tokens.css
  css/components.css
  css/screens.css
  css/admin.css
  screens/s01-splash.html … s17-settings.html   (17 end-user)
  screens/a01-prompt-rules.html … a04-feedback-queue.html
  screens/r01-detailed-report.html
  screens/r03-exception-report.html
plans/
  threshold-mockups-plan.md
  threshold-mockups-report.md   ← this document (design docs, not textbook report UI)
```

---

## 9. Acceptance checklist

- [x] All P0/P1 screens S01–S17 exist as HTML mock-ups
- [x] Shared tokens match Brand Guidelines (void / charcoal / amber)
- [x] Clickable happy path from Splash through Result
- [x] 3-tab navigation on Home / Progress / Settings
- [x] Demo Continue available on Welcome / Auth
- [x] 390×844 phone frame
- [x] Founders networking sample campaign consistency
- [x] Admin screens A01–A04 included
- [x] Textbook Detailed report mock-up (R01) included
- [x] Textbook Exception report mock-up (R03) included
- [x] Summary / Executive business reports deferred by choice
- [x] Index map + README + this documentation report

---

## 10. Known mock limitations (expected)

- No real validation, persistence, or LLM
- Slider values do not pass between pages (hardcoded demo numbers on Result/History)
- Generating screen uses timed redirect, not async API
- Accessibility and motion preferences not fully audited
- Visuals are high-fidelity HTML, not exported Figma
- Exception thresholds are illustrative, not wired to live queries

---

## 11. Recommended next steps

1. Usability test the clickable path (think-aloud) per elicitation plan
2. Adjust copy/mission difficulty wording from test notes
3. Port tokens + screen structure into Expo / React Native
4. Wire real auth, campaign generation, and debrief persistence
5. Optionally add Summary / Executive report UIs if the course requires all four types

---

## 12. Conclusion

Threshold’s full system surface—end-user, admin, Detailed transactions, and Exception outliers—is mocked and navigable. The prototypes encode the product’s differentiator—**calibrated real-world exposure via prediction error**—with a Detailed report for every mission line and an Exception report that only surfaces out-of-range outcomes.
