# Threshold — Multiple Campaigns

**Status:** approved · extends [`./threshold-points-plan.md`](./threshold-points-plan.md)
**Owner:** Karma
**Related:** [`./threshold-mockups-plan.md`](./threshold-mockups-plan.md) · [`../mobile/README.md`](../mobile/README.md)

> **Read the frontier plan first.** This document assumes the Frontier / Archetype / Pacing
> Engine as the scoring model. "Campaign frontier" and "Capability profile" below are defined
> in terms of it.

---

## 1. What actually breaks with more than one campaign

Adding `campaigns: Campaign[]` is a small data change. The design problem is five consequences:

**1.1 Levels stop being comparable.** Level 4 in "Network with founders" and Level 4 in
"Speak up in meetings" are not the same altitude. Any readout that pools levels across
campaigns is comparing numbers that do not share a scale.

**1.2 The single frontier number loses its referent.** The frontier is "the highest level
reliably executed" — of *which route*? A user who finishes one campaign at `9.8` and starts a
second would see the number fall to `0.0` on the second route. That is a visible decrease, and
this system's one inviolable rule is that nothing ever decreases
(`threshold-points-plan.md` §3.1.3).

**1.3 Attention diffuses.** Three open paths is three open loops, and the core loop
(S10 → S11 → S12 → S13 → S14) is built around **one** active mission. The failure mode of
multi-campaign is not a rendering bug — it is a user with three campaigns `2 of 10` done and
none of them moving.

**1.4 Evidence loses its owner.** `debriefs` currently belongs implicitly to the single
`campaign`. Once there are several, deleting one must not delete the missions the user
actually did — history is the user's record, not the campaign's.

**1.5 Progress and History stop being single-subject.** S15 reads `campaign.missions` for
"Level"; S16 is a flat list with no attribution. Both need a scope decision: *whose* progress
is this measuring?

---

## 2. First principle: one campaign is active at a time

**The app has exactly one active campaign.** Others are `paused` or `completed`. Switching is
one tap from Home.

**Why not parallel campaigns** (two active routes, two missions per day): the product is about
crossing one specific avoided threshold. Diffuse effort across routes is the same failure as a
streak that resets — it converts a mastery loop into a queue. And the mission modal stack is
single-track by design: `in-progress.tsx` disables swipe-back precisely so the user sits with
the thing rather than navigating away from it. Two live missions would give them somewhere to
go.

**What this buys:**

- The core loop, S09 path reveal and S11–S14 are unchanged — they operate on *the* active
  campaign, exactly as today.
- The frontier question in §1.2 dissolves: there is exactly one route in play, so there is
  exactly one campaign frontier, and it is never a decrease — it is a *different route's*
  number, shown in a context that names the route.
- Paused campaigns cost nothing. A card that says `4 of 10` is not an obligation; it is a
  parked plan the user chose.

**Explicitly rejected:** auto-creating a new campaign when one completes. Completion is a
resting state with a shelf (§7.5), not a treadmill. The user decides when a new route starts.

---

## 3. The decomposition: routes and capability

The whole design follows from one sentence:

> **Campaigns are routes. Capability is the person.**

| | Scope | Unit | Appears on |
|---|---|---|---|
| **Campaign Frontier** | one campaign | `1.0 – 10.0` + rung name | S09, S10, S14, campaign cards, switcher |
| **Capability Profile** | the person, all campaigns | domains · completions · attempts · expectancy gap | S15 |

**3.1 Why the frontier must be per-campaign.** It is a `max` fold over levels, and levels are
ordinal only within a route (§1.1). It is the answer to *"how far along this plan am I"* — a
question that is meaningless without knowing which plan.

**3.2 Why capability must be per-person.** "Can I talk to strangers?" is not a property of the
"Network with founders" campaign. It is a property of the user, and it is built by *every*
campaign they run. The domain axis (`public_async`, `live_strangers`, `authority`) is the
stable coordinate system; campaigns are movements through it.

**3.3 Consequence: each campaign is a fresh climb, and that is correct.** A second campaign
starts at `0.0` because its route is new — the missions are new, the difficulty ramp is new,
and nothing about the first campaign's `9.8` tells you where you are on this path. What does
*not* reset is the capability profile. This is the emotional crux, handled in §8.

**3.4 A derived fact worth stating:** because `frontierAfter` folds a `max` over
`L` (or `L − 0.2`), **a fully completed 10-level campaign always lands at `≥ 9.5`** — i.e. at
or adjacent to *Second Nature*. Completing a route means the watermark on that route is
essentially maximal. That is a good property, not a leak: the shelf of completed campaigns
reads as a set of finished climbs, not a set of partial scores.

---

## 4. Data model

### 4.1 Store shape

```ts
type State = {
    user: User | null;
    campaigns: Campaign[];
    /** Exactly one, or null before the first campaign exists. */
    activeCampaignId: string | null;
    debriefs: Debrief[];
    preRatings: Record<string, number>;
    seed: CampaignSeed;
    remindersEnabled: boolean;
};
```

### 4.2 The compatibility move that keeps the diff small

**`useApp().campaign` stays.** It becomes a derived selector returning the *active* campaign:

```ts
const campaign = campaigns.find((c) => c.id === activeCampaignId) ?? null;
```

Every existing consumer — `home.tsx`, `progress.tsx`, `pre-rating.tsx`, `in-progress.tsx`,
`debrief.tsx`, `result.tsx`, `path-reveal.tsx`, `settings.tsx` — keeps working untouched for
the active-campaign case. **Only the campaign-management surfaces and the person-level screens
(S15, S16) need to know there is an array.** This is the single most important implementation
decision in the document.

New context surface:

```ts
campaigns: Campaign[];
activeCampaign: Campaign | null;          // same object as `campaign`
campaignStatus: (id: string) => CampaignStatus;
startCampaign: () => void;                 // → /onboarding/goal
activateCampaign: (id: string) => void;
renameCampaign: (id: string, label: string) => void;
deleteCampaign: (id: string) => void;
debriefsFor: (campaignId: string) => Debrief[];
```

**No archive.** §10 decision 4 cut `archiveCampaign` and `archivedAt`. Deleting already
preserves every debrief and the whole capability profile, so a separate Archive state would
add a field, a toggle, a restore path and a fourth status — for behaviour identical to Delete
except that the card stays visible. Three statuses, one destructive action.

### 4.3 Status is derived, not stored

```ts
export type CampaignStatus = 'active' | 'paused' | 'completed';

export function campaignStatus(c: Campaign, debriefs: Debrief[], activeId: string | null): CampaignStatus;
```

- `completed` — every level has a completion debrief
- `active` — `c.id === activeId`
- `paused` — otherwise

Only `activeCampaignId` is stored; the other two states are computed. That keeps the reducer
from having two sources of truth, which is the bug class that produces a "completed" badge on
a campaign with an unfinished level.

Status is **fully derived** from `campaigns`, `debriefs` and `activeCampaignId`. No status is
ever stored, so a stale badge is not representable.

### 4.4 Debrief attribution and orphans

```ts
export type Debrief = {
    /* …existing… */
    /** Owning campaign. Absent on legacy rows — see §4.5. */
    campaignId?: string;
};
```

**Deleting a campaign never deletes debriefs.** `deleteCampaign` removes the `Campaign` object
and *orphans* its log rows; `debriefs` is untouched. This is the same principle Settings
already claims for regenerate (*"Your mission completion is kept"*), and it means the
capability profile and History are unaffected by campaign management.

Orphaned rows render with a **`Deleted campaign`** chip in History rather than a name.
`debriefsFor(id)` and the capability profile use optional chaining throughout, so a dangling
`campaignId` degrades to "unattributed" and never throws.

### 4.5 Legacy migration

Existing state has one `campaign` and one flat `debriefs`. Migration on first load:

1. `campaigns = [campaign]`, `activeCampaignId = campaign.id`
2. every row in `debriefs` gets `campaignId = campaign.id`
3. `frontierAfter` back-fills per `threshold-points-plan.md` §8

Deterministic and lossless. Guard with a `schemaVersion` field on the persisted state — there
is no persistence yet (`store/app-store.tsx` is in-memory), so today this is a no-op, but the
Supabase seam will need it and the shape should be decided now.

---

## 5. Where campaigns live in the app

**Tab bar stays at three** — Home · **Capability** · Settings (§10 decision 6). Campaigns are a
*setup-and-switch* surface, not a daily one, and four tabs would imply a fourth daily
destination. The rename is the one place the product thesis is visible as navigation: the tab
measures the *person*, not a campaign's progress.

Two entry points, matching the two different jobs:

| Job | Entry | Frequency |
|---|---|---|
| **Switch** (which path am I on?) | Campaign strip on Home → `/campaigns` | frequent |
| **Manage** (rename, archive, new) | Settings → *Your campaigns* → `/campaigns` | rare |

New routes, registered in `src/app/_layout.tsx`:

| Route | File | Presentation |
|---|---|---|
| `/campaigns` | `src/app/campaigns/index.tsx` | `modal` — it is a switcher first |
| `/campaigns/[campaignId]` | `src/app/campaigns/[campaignId].tsx` | `card` — pushed from the modal |

`presentation: 'modal'` is deliberate: the switcher should feel like pulling down a drawer over
Home, not like travelling to another section. Tapping a campaign calls `activateCampaign` then
`router.dismiss()`.

**Not reachable from inside the mission loop.** S11–S14 are a modal stack with a single
purpose, and *"which other path could I be on instead?"* is precisely the escape hatch a
single-track exposure app cannot offer. Campaigns are switched from Home only.

---

## 6. Screen-by-screen

### 6.1 New — Campaigns list (`/campaigns`)

```
┌─────────────────────────────────────────────┐
│  ←   Your campaigns                         │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐  │
│  │ ACTIVE                                │  │
│  │ Network with startup founders         │  │
│  │ 3.8 · Steady              4 of 10     │  │
│  │ ▓▓▓▓░░░░░░                            │  │
│  │ Next: Stay for a five-minute          │  │
│  │       conversation                    │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ PAUSED                                │  │
│  │ Speak up in meetings                  │  │
│  │ 2.0 · First Step          2 of 10     │  │
│  │ ▓▓░░░░░░░░                            │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ COMPLETED                             │  │
│  │ Cold outreach to strangers            │  │
│  │ 9.8 · Second Nature      10 of 10     │  │
│  │ Finished 30 Sep                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [ + Start a new campaign ]                 │
└─────────────────────────────────────────────┘
```

Design notes:

- **The active card shows the next mission by name.** This is the single most useful thing on
  the screen — it answers "what am I doing here?" without opening anything.
- **Paused cards do not show a next mission.** That would be a bid for attention the user has
  not granted. Only name, frontier, progress.
- **No campaign shows a penalty, an "at risk" state, or days idle.** A paused campaign is a
  parked plan. Rendering "12 days since your last mission" here would reintroduce the streak
  pressure the product explicitly forbids (`threshold-mockups-plan.md` §6.1).
- **Frontier decimals are honest about lag.** `3.8` with `4 of 10` done means Level 4 was
  crossed at high friction — the number is not a percentage of the bar and must not be
  rendered as one.
- Sort: active first, then paused by most recent activity, then completed by most recent
  finish. Unbounded — no cap, and no nagging about how many are paused (§10 decision 5).

### 6.2 New — Campaign detail (`/campaigns/[campaignId]`)

Reuses the S09 timeline (`path-reveal.tsx`), in a read-only mode:

- **Header:** editable campaign name (tap to rename, inline `TextField`).
- **Meta row:** status · frontier + rung · `n of 10`.
- **Path timeline:** full 10 missions, each showing level, title, and — for logged ones — the
  archetype label and `expected → actual`. Completed levels are marked; the active level is
  highlighted *only* if this is the active campaign.
- **Actions by status:**

| Status | Actions |
|---|---|
| paused | **Make active** (primary) · Rename · Delete |
| active | Rename · Delete |
| completed | Rename · Delete · **Start a new campaign** |

**Delete confirmation must state exactly what survives:**

> **Delete this campaign?**
> The 10 missions you logged are kept in your history and your capability profile. Only the
> path itself is removed. **Delete** / **Cancel**

That sentence is the difference between a user feeling free to manage campaigns and a user
afraid to touch anything.

### 6.3 S10 — Home

The greeting row's badge is replaced by a **campaign strip**, which is the switcher:

```
WELCOME BACK
Karma

┌──────────────────────────────────────────────┐
│ Network with startup founders            ⌄   │
│ 3.8 · Steady                    4 of 10      │
└──────────────────────────────────────────────┘

ACTIVE MISSION                          L5
Stay for a five-minute conversation
Extend one meetup introduction into a real
five-minute conversation. Still no pitch…
[ Begin mission ]

┌──────────────────────────────────────────────┐
│ Locked                               L6      │
│ Ask a founder one follow-up question…        │
└──────────────────────────────────────────────┘

LAST INSIGHT
It was far easier than you feared. Expected
62, lived 28.
```

- The rung name moves from a `Badge` in the corner to the strip, where it has room to be the
  headline and where the campaign it belongs to is named. *"At Ease"* alone was ambiguous
  across routes; *"Network with startup founders · 3.8 · Steady"* is not.
- The strip is **tappable but visually calm** — a `⌄`, not a button. Switching is available,
  not suggested.
- Everything below the strip is unchanged, since it all reads the active campaign.

### 6.4 S15 — Capability

S15 becomes the **person-level** screen, and the tab is **renamed `Progress` → `Capability`**
(§10 decision 6). This is the largest change and the most important one, because it is where
multi-campaign stops being bookkeeping and starts being a capability picture.

```
CAPABILITY
Your threshold
Growth is measured by what you can handle now — not
by unbroken streaks.

┌──────────┬──────────┬──────────┐
│  16      │   3      │   9      │
│  DONE    │ CAMPAIGNS│ ATTEMPTS │
└──────────┴──────────┴──────────┘

FRICTION DOMAINS
Public async                  L8 · Max 78    13
Comments, posts, DMs          8 done · 2 attempts
                    reality 18 lighter than predicted

Live strangers                L9 · Max 82     8
Meetups, intros               4 done · 3 attempts
                    reality 12 lighter than predicted

Authority figures            L10 · Max 74    12
Founders, investors           4 done · 4 attempts
                    reality 22 lighter than predicted

CALIBRATION
8 of 10 missions were easier than you feared

YOUR CAMPAIGNS                       [ condensed cards → /campaigns ]

[ See full history ]
```

Design notes:

- **No single scalar hero.** §1.2 killed it: there is no one number that honestly summarises
  capability across routes. The hero is three counts, and the domain table is the real
  readout. This is a deliberate removal of a feature the single-campaign design had.
- **The domain row leads with the two numbers that are campaign-independent** — completions and
  attempts — and shows the highest level as *provenance*, not as a score. Attempts sit beside
  completions because the **ratio is the signal**: in the table above, *Authority* has 4
  completions against 4 attempts, and *Public async* 8 against 2. That difference is the most
  useful sentence the app can say, and it is invisible in a single aggregate.
- **`meanExpectancyGap`** per domain (from `threshold-points-plan.md` §7.3) is the honest
  calibration readout. It is signed and free to be negative.
- **Campaigns appear as a roster card**, not as the centrepiece. They are the routes; the
  domains are the capability. The whole card is the tappable target and opens `/campaigns`
  (§10 decision 7).

**`L8 · Max 78` — both figures, per §10 decision 2.** They answer different questions and the
domain row needs both:

| Figure | Kind | Question it answers |
|---|---|---|
| `L8` — highest level completed in this domain | **ordinal**, route-relative | *How far along a path did I get here?* |
| `Max 78` — highest `actual` survived in this domain | **cardinal**, universally comparable | *How much distress can I actually tolerate here?* |

`L8` is provenance: §1.1 says levels are not cardinal across routes, so it is a **citation**
and never arithmetic — never averaged, summed, or compared against another domain's level.
`Max 78` is the opposite: a raw `0–100` reading that means the same thing in every route, which
is exactly what makes it the right companion. A domain showing `L10 · Max 74` and another
showing `L8 · Max 78` reads correctly — the user went further along one path but has tolerated
more in the other, and neither statement is false.

Rendering rules: `L{n}` at the tabular weight, `Max {n}` in fog beside it; when a domain is
untested both are omitted and the row shows only `Untested`. `Max` is **never** shown as a
percentage or with a `%` symbol — it is a difficulty reading, not a completion rate.

### 6.5 S16 — History

Adds attribution and a filter, and nothing else:

```
HISTORY                                      16
[ All ] [ Network with founders ] [ Speak… ]

┌──────────────────────────────────────────────┐
│ L5  Stay for a five-minute conversation      │
│     Network with founders · 12 Oct           │
│     Expected 65 → Actual 68        dist. tol │
├──────────────────────────────────────────────┤
│ L4  Introduce yourself to one person         │
│     ⚑ Approach attempt · 9 Oct               │
│     Held back — timing was wrong             │
├──────────────────────────────────────────────┤
│ L10 Pitch one person on collaboration        │
│     Cold outreach · 30 Sep                   │
│     Expected 80 → Actual 82        dist. tol │
└──────────────────────────────────────────────┘
```

- A chip row filters by campaign, with `All` default. Chips are generated from campaigns
  present *in the log*, so orphaned rows contribute a `Deleted campaign` chip rather than
  disappearing.
- Every row carries its campaign name. Without attribution, a 16-mission mixed list is
  unreadable.
- Attempts render distinctly (⚑) and are **never styled as failures** — same rule as §4.4 of
  the frontier plan.
- The existing empty-state copy is kept.

### 6.6 S17 — Settings

```
┌──────────────────────────────────────────────┐
│  KC   Karma Chou                             │
│       karma@threshold.app                    │
│                                              │
│  Frontier       3.8 · Steady                 │
└──────────────────────────────────────────────┘

CAMPAIGNS
┌──────────────────────────────────────────────┐
│  Your campaigns                          3   │
│  Network with founders · Speak up… · Cold…   │
│                                          ›   │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Start a new campaign                        │
│  A new path from your current baseline   ›   │
└──────────────────────────────────────────────┘

PREFERENCES
  Mission reminders                    [ on ]

CONNECTION
  Campaign service                    [ Live ]

SESSION
  Sign out
```

- The old **"Regenerate campaign"** row is **removed** and replaced by *Start a new campaign*.
  Regenerate was the single-campaign workaround for wanting a different path; with multiple
  campaigns it is a destructive action with a confusing identity. Its old behaviour
  (`signOut()` → re-onboard) also contradicts the *"Completion logs are kept"* promise in its
  own confirmation dialog, which now genuinely holds.
- The identity card shows the **active** campaign's frontier, since that is the number the user
  is currently working.
- The campaigns row shows names inline so the user does not need to open it to remember what
  they have.

---

## 7. Lifecycle and edge cases

### 7.1 Starting a campaign

`startCampaign()` → onboarding (S05 Goal → Friction → Baseline → Generating → S09 Path Reveal),
scoped to a **new campaign object**, with the previous campaign `paused` and
`activeCampaignId` pointing at the new one.

Two specific things to get right:

- **The debrief log must not be cleared.** Onboarding currently ends by replacing state; a new
  campaign must append to `campaigns`, never reset the log. This is the highest-risk
  regression in the whole feature, and it is worth a test.
- **Onboarding answers are per-campaign.** `seed` in the store is a *draft*. Once a campaign is
  generated, its `seed` lives on the campaign object. The draft should be **pre-seeded from the
  active campaign's seed**, so the second campaign's friction question starts from the user's
  last answer as an editable default rather than a blank page.

### 7.2 Switching

`activateCampaign(id)` sets `activeCampaignId` and dismisses the modal. No transition
animation beyond the standard modal dismiss — switching routes is not an event, and staging it
would imply the app thinks it is one.

**In-flight mission:** if the user is mid-loop (S11–S14) the switcher is unreachable (§5), so
there is no in-flight state to migrate. If they leave and the mission is still `active` on a
now-paused campaign, nothing breaks — it resumes when that campaign is reactivated.

### 7.3 Pausing

Implicit: pausing campaign A is the side-effect of activating campaign B. No separate action, no
"pause this campaign?" prompt, no pause button. The user is choosing where to spend attention,
not confessing that they are abandoning something. A separate pause control would create a
decision the user must justify.

### 7.4 Completing

Status becomes `completed` automatically when every level has a completion debrief. What
happens next is the most psychologically loaded moment in the feature, so it is specified
exactly (§8).

### 7.5 Deleting

Covered in §4.4 and §6.2. Summary:

| Action | Campaign | Debriefs | Frontier | Capability profile |
|---|---|---|---|---|
| Pause | kept | kept | kept | kept |
| Archive | kept, hidden | kept | kept | kept |
| Delete | **removed** | **kept**, orphaned | n/a | **kept** |

Deleting is the only destructive action, it is behind a confirmation that states what survives,
and it cannot reach the evidence.

### 7.6 Regenerating an existing campaign

Out of scope. The path is LLM-generated from a seed; regenerating it would invalidate the level
numbers already in the log (`debrief.level` is a citation into `campaign.missions`). A user who
wants a different path starts a new campaign — which is the same outcome, with intact history.

---

## 8. The one hard psychological moment: starting campaign #2

This is the design risk, and it needs to be named and handled rather than discovered in
usability testing.

**The moment:** a user finishes "Network with founders" at `9.8 · Second Nature`, taps *Start a
new campaign*, answers three questions, and lands on Home with a brand-new path showing
**`0.0 · Committed`**. The app has just appeared to erase everything.

Under the single-campaign model this could never happen. Under multi-campaign it happens to
every user who completes a campaign — i.e. exactly the most engaged users.

Four specific interventions, cheapest first:

**8.1 The Path Reveal (S09) carries the carry-over line.** After onboarding a *second or later*
campaign, S09 gains one line above the timeline:

> Your capability profile carries over — 16 missions, 3 friction domains.

This names what persists at the exact moment the new path appears. It is the single highest-value
line in the feature.

**8.2 Home's strip names the route.** *"Speak up in meetings · 0.0 · Committed"* is legible as
**one route's progress**. *"0.0 · Committed"* alone, as a bare badge in the corner, reads as a
global reset. §6.3 already does this; the reason is this section, not layout.

**8.3 The completed campaign goes to a shelf, not to the void.** In the switcher, completed
campaigns persist with their final frontier and finish date (§6.1). The user can see
`9.8 · Second Nature · Finished 30 Sep` sitting directly above their new `0.0` — the visual
argument that the first climb still exists.

**8.4 Paused campaigns keep their numbers visible.** Seeing `3.8 · Steady` on a paused card is
what makes switching feel reversible. If paused campaigns showed a blank state, users would
avoid pausing and the whole model would collapse into "you only ever have one saved game."

**What must not be done:** a congratulatory interstitial about starting fresh, a "New Journey
Begins!" screen, or any copy implying the new campaign is a graduation. It is a new route on
a map the user is keeping.

---

## 9. Acceptance criteria

- [ ] The app has at most one campaign with status `active`; `activeCampaignId` is always a
      member of `campaigns` or `null`.
- [ ] `useApp().campaign` returns the active campaign, and S11–S14 need no changes to keep
      working.
- [ ] **Starting a second campaign preserves every existing debrief.** Explicit test.
- [ ] Deleting a campaign removes no debriefs; its rows render with a `Deleted campaign`
      chip and remain in History and in the capability profile.
- [ ] A dangling `campaignId` never throws in `debriefsFor`, the capability profile, or S16.
- [ ] Status is derived: a campaign missing one level's completion is never shown `completed`.
- [ ] The switcher is unreachable from S11–S14.
- [ ] A second campaign starts at `0.0`; S15's capability counts are unchanged by the reset.
- [ ] S09 shows the carry-over line for campaign #2 and later, and not for campaign #1.
- [ ] The switcher and Home render no days-idle, no "at risk", and no streak figure for paused
      campaigns.
- [ ] A fully completed 10-level campaign reports a frontier `≥ 9.5`.
- [ ] Legacy single-campaign state migrates losslessly (§4.5).
- [ ] `npx tsc --noEmit` and `npx expo lint` pass (`mobile/AGENTS.md`).

---

## 10. Resolved decisions

**Status: approved.** All seven decisions ruled on. Nothing below is a judgement call at build
time; §11 is ordered to match.

| # | Decision | Ruling |
|---|---|---|
| 1 | Parallel vs single active | **Strictly one active campaign.** §2 stands as written. |
| 2 | S15 domain readout | **Both figures** — `L8 · Max 78`. Path provenance *and* cardinal distress tolerance, per §6.4. |
| 3 | Home campaign strip | **Confirmed** — calm strip with `⌄`, opening the `/campaigns` modal. |
| 4 | Archive | **Cut.** No `archiveCampaign`, no `archivedAt`, no archived status. Three statuses: `active`, `paused`, `completed`, plus `deleteCampaign`. |
| 5 | Campaign cap | **Unbounded.** Sort active → paused (by recency) → completed (by finish date). |
| 6 | Tab label | **`Progress` → `Capability`**, tab and S15 header. Mock-up `s15-progress.html` is retitled. |
| 7 | S15 roster card | **Tapping it opens `/campaigns`.** Switching still has exactly one home. |

**On cutting archive (4).** The reasoning is sound and it makes the state machine honest:
`deleteCampaign` already preserves every debrief and every capability stat by orphaning them to
a `Deleted campaign` chip, so an Archive state would have added a field, a toggle, a restore
path and a fourth derived status — to produce behaviour identical to Delete except that the card
stays on screen. Deleting is now the single destructive action, guarded by a confirmation that
states what survives (§6.2). The cost is that there is no "hide but keep" — acceptable, because
campaigns are cheap to keep and a completed one is a shelf item, not clutter.

---

## 11. Order of work

1. `lib/types.ts` — `CampaignStatus`, `Debrief.campaignId`, `Debrief.outcome`, `Debrief`
   frontier fields, `Campaign.activeLevel`. **No `archivedAt` (decision 4).**
2. `lib/calibration.ts` — the whole frontier / archetype / pacing surface per
   [`threshold-points-plan.md`](./threshold-points-plan.md) §7.3, with all constants at their
   resolved values (§13 there). Delete `thresholdScore()` and `frictionDomainStats()`.
3. `lib/campaigns.ts` (new) — `campaignStatus()`, `campaignProgress()`, `debriefsFor()`,
   `capabilityProfile()`, sort/group helpers. Pure, no store dependency.
4. `store/app-store.tsx` — `campaigns` array, `activeCampaignId`, derived `campaign`,
   `startCampaign` / `activateCampaign` / `renameCampaign` / `deleteCampaign`, `logAttempt`,
   `setPacing`, and the legacy migration (§4.5). **Includes the "starting campaign 2 keeps the
   log" test** — the highest-risk regression in the feature.
5. `src/app/campaigns/index.tsx` + `[campaignId].tsx`, registered in `src/app/_layout.tsx` as
   `modal` / `card`.
6. **S14** — archetype-driven result screen. First, because it carries the model.
7. **S15** — the Capability reframe (§6.4), including the `L8 · Max {n}` domain readout
   (decision 2). Rename the tab and header (decision 6).
8. **S11** — Reality Check callout. **S12** — log an attempt + freeze chips.
9. **S10** — campaign strip (decision 3) and the rung rail.
10. **S16** — attribution + filter chips. **S17** — replace *Regenerate* with *Your campaigns*
    + *Start a new campaign*, and show the active campaign's frontier.
11. **S09** — the carry-over line for campaign #2+ (§8.1).
12. Mirror into `mockups/screens/` — new `s18-campaigns.html`, plus `s09`, `s10`, `s11`, `s12`,
    `s14`, `s15`, `s16`, `s17`. Update `mockups/index.html`.
13. Update `mobile/README.md` — screen map (new routes, renamed tab), project structure
    (`lib/campaigns.ts`), the resolved "Open decisions" entries, and "Where the real work goes
    next", since persistence now stores an array.