# Threshold — The Frontier, Debrief Archetypes, and the Pacing Engine

**Status:** proposed · replaces "Threshold Points" (rejected, §1)
**Owner:** Karma
**Related:** [`../mobile/README.md`](../mobile/README.md) · [`./threshold-mockups-plan.md`](./threshold-mockups-plan.md) §6

---

## 1. Why Threshold Points was rejected

The **diagnosis** of the old `thresholdScore()` (`lib/calibration.ts:27`) survives untouched: a
flat mean of `|expected − actual|` is inverted, punishes courage, accumulates nothing, and has
two meaningless endpoints.

The **prescription** did not survive. Three fatal defects:

### 1.1 The abort hole — decisive

Paying 5 per attempt with no level gate means 100 aborts = 500 points = the "Widening" rung
that a genuine Level 8 completion also reaches. A threshold measures the **altitude** of
friction someone can currently initiate, not how many times they tapped a button. The old
model conflated a watermark with a tally. This objection is correct, and the replacement
closes it by construction rather than by a cap someone could later raise (§3.1.1).

### 1.2 Overjustification

The rung strip, the itemised receipt and "41 points to Steady" convert an intrinsic mastery
loop into an extrinsic point loop. Self-Determination Theory predicts the mechanism precisely:
once an activity is instrumentally rewarded, the reward becomes the reason, and the behaviour
collapses when the reward stops arriving. Habitica is the cautionary example, not the model.

### 1.3 It put a price on the user's honesty

Rewarding `expected − actual` pays the user for shaping two numbers. The old cap analysis
showed the exploit was bounded at 61 against 100 for an honest hard run — so it was not
*profitable*. But bounded-and-unprofitable is not the same as harmless: it assigns a value to
the user's self-report, and the honest reading of a genuinely hard mission was the one case
the insight term valued at zero. That is fatal for a tool whose only input is a self-report.

### 1.4 One point of disagreement, and why it shapes the replacement

The claim that a predicted-80/actual-80 survival earned "+0" was true of the *insight term*,
not of the mission — that mission still paid `10 + level×6 + 15`. But the **requirement** is
one I share completely, and it is a requirement the old model could not express: *an honest
rating must never feel penalised just because reality stayed hard.* §4 exists to guarantee
exactly that, and `calibration_match` (§4.5) exists for the adjacent case the four specified
archetypes leave uncovered.

### 1.5 Carried forward, and deleted

| From the old draft | Fate |
|---|---|
| Diagnosis of `thresholdScore()` | **Kept** (above) |
| Rung names | **Kept** — reduced to 7, re-anchored to the 1.0–10.0 scale (§3.2) |
| Monotonic ratchet | **Kept** — re-expressed as a level watermark, not a counter (§3) |
| Attempts logged, and never unlocking | **Kept** — the Approach Attempt archetype, worth zero (§4.4) |
| `meanOverestimation` + "X of Y" headline | **Kept** — repurposed as a live engine, not a prize (§6) |
| Points, receipts, near-miss banners | **Deleted** |
| `thresholdScore()`, `RUNGS` as a points table | **Deleted** |

---

## 2. The three mechanisms

Three orthogonal pieces. Keeping them separate is what prevents the old model's
one-number-does-everything failure.

```
 ┌──────────────────────────────────────────────────────────────────────┐
 │ ①  FRONTIER — the watermark                                          │
 │    1.0 – 10.0. The highest level reliably executed. Monotonic.       │
 │    Aborts and repetition cannot move it.                             │
 │    Rule:  §3                                                         │
 ├──────────────────────────────────────────────────────────────────────┤
 │ ②  ARCHETYPES — the verdict                                          │
 │    Every logged outcome classifies into exactly one of six states.   │
 │    Determines S14 copy. Rewards nothing.                             │
 │    Rule:  §4                                                         │
 ├──────────────────────────────────────────────────────────────────────┤
 │ ③  PACING — which mission is active next                             │
 │    Advance, repeat, or swap to a bridge alternative.                 │
 │    Rule:  §5                                                         │
 └──────────────────────────────────────────────────────────────────────┘
```

They touch but never merge. **The archetype is copy; the ratchet is the watermark; pacing is
the leading edge.** A mission can be a Distress Tolerance verdict while the watermark barely
moves and the path advances anyway — and that divergence is the system working, not a bug
(§5.3).

---

## 3. Threshold Frontier

### 3.1 The rule

A single number, `1.0 – 10.0`, displayed to one decimal. It answers one question: *what is the
hardest level of friction I can currently walk into and hold?*

Given a logged outcome at level `L`:

| Condition | Frontier becomes |
|---|---|
| empty log | `0.0` — the "Committed" state |
| completed, `actual <= 55` — manageable execution | `max(prev, L)` |
| completed, `actual > 55` — high-friction execution | `max(prev, L − 0.2)` |
| completed via a **bridge** alternative (§5.1) | `max(prev, L − 0.5)` |
| **attempted, not completed** | `prev` — **unchanged** |
| first-ever completion, any path | floored at `1.0` |

Ceiling `10.0`. Always one decimal. A bridge that clears `L` supersedes the 0.2 discount —
the discount applies only when the completion was *both* high-friction and non-bridge.

Four properties are structural, not incidental:

**3.1.1 Aborts are worth zero, permanently.** Not a small number — zero, and structurally
incapable of accumulating. A user with 100 logged attempts sits at exactly the frontier their
completions earned, because `attempted` returns `prev` unchanged. §1.1 is closed by
construction, not by a cap.

**3.1.2 Repetition cannot substitute for altitude.** Twenty completions at Level 1 yield
`1.0`, because the rule is a `max`, not a sum. Grinding is *arithmetically inert*.

**3.1.3 The 0.2 discount is a reservation, not a penalty.** Sitting at `3.8` after surviving a
Level 4 at 74/100 is a true statement: *you crossed Level 4, but not yet comfortably.* The
full `4.0` is available on a repeat — the number names a real, reachable next step rather than
subtracting something the user already owned. Nothing is ever taken away.

**3.1.4 The frontier can lag the path.** It is a watermark of what is *held*, not what is
*attempted*. The pacing engine runs ahead of it by design (§5.3).

### 3.2 Rungs — 7 names over 1.0–10.0

Names describe **capability**, matching the brand rule against "gamified rainbow badges"
(`threshold-mockups-plan.md` §2.1). No fantasy ranks, no tiers, no point thresholds.

| Range | Rung | Line shown beneath |
|---|---|---|
| `0.0` | **Committed** (state, not a rung) | "You named what you avoid and built a path." |
| `1.0 – 2.0` | **First Step** | "You did something you'd been dodging." |
| `2.1 – 3.3` | **In Motion** | "Doing it is becoming routine, not an event." |
| `3.4 – 4.6` | **Steady** | "You're choosing the harder version on purpose." |
| `4.7 – 6.0` | **At Ease** | "The old fear is getting boring." |
| `6.1 – 7.4` | **Widening** | "You're carrying it into new rooms and new people." |
| `7.5 – 8.9` | **Beyond Your Path** | "You're doing things you never put on a list." |
| `9.0 – 10.0` | **Second Nature** | "It stopped being a decision." |

The anchoring is deliberate, not decorative: rung boundaries sit *at mission levels*, so `3.4`
means "solidly past Level 3," and the user can see exactly what the next name costs. The scale
is bounded at 10.0 — a finite ladder, because an unbounded number is a treadmill and this
app's endpoint is capability, not volume.

### 3.3 Without the points, what actually moves the user?

This is the load-bearing question, and it is the one the old model answered with
`+59`. The replacement answers it with four things, none of which is a reward:

1. **The rung name is the payoff.** "You're someone who's At Ease with this now" outperforms
   any number. Copy leads with the name; the decimal sits underneath as provenance.
2. **The Frontier literally rising** — `3.8 → 4.0` after a repeat — is visible, earned, and
   *irreversible*. A ratchet the user cannot lose is a different psychological object from a
   balance they are spending down.
3. **The Reality Check (§6)** supplies the pre-action motivation that points can only supply
   after the fact.
4. **The archetype verdict (§4)** supplies the post-action meaning, which is what a debrief is
   actually for.

---

## 4. Debrief archetypes

Every logged outcome classifies into **exactly one** archetype. The classifier is a pure
function of stored fields, evaluated in strict precedence order.

### 4.0 Precedence table — exhaustive by construction

| # | Archetype | Condition | Arm |
|---|---|---|---|
| 1 | **Approach Attempt** | `outcome === 'attempted'` | user |
| 2 | **Underestimate** | `delta <= −15` | added §4.6 |
| 3 | **Expectancy Violation** | `delta >= 15` | user |
| 4 | **Distress Tolerance** | `actual >= 60` | user |
| 5 | **Calibration Match** | `actual >= 45` | added §4.5 |
| 6 | **Baseline Mastery** | *default* — no condition | user |

First match wins; the final row is a catch-all, so **the classifier is total and can never
return `undefined`**. Arms 2 and 5 are additions closing coverage gaps in the original four —
proven in §4.7, and flagged in §13 for the user to cut.

### 4.1 Expectancy Violation — fear disconfirmed

**Condition:** completed AND `delta >= 15`.
**Reads as:** the threat prediction overestimated reality. The core promise of the app.
**S14 copy:** leads with the gap, plainly — `Expected 75 → Actual 35`.
*"Your fear wrote a bigger number than reality did."*
**Engine:** ratchet to `max(prev, L)`; pacing `advance → L + 1`.

### 4.2 Distress Tolerance — courage breakthrough

**Condition:** completed AND `actual >= 60` AND `delta < 15`.
**Reads as:** it was genuinely hard, the prediction was roughly right, and they did it anyway.
Capability means acting while friction stays high.
**S14 copy:** validates the difficulty rather than the gap — `Expected 75 → Actual 78`.
*"Both numbers are honest. You did it anyway."*
**Engine:** ratchet to `max(prev, L − 0.2)` — crossed, not yet comfortable — then hands the
choice to the user (§4.2.1).

**4.2.1 The autonomy beat.** S14 offers two explicit options, and the app does not recommend
one:

> **Run Level 4 once more to make it comfortable**
> **Push to Level 5 anyway**

This is the SDT-correct place for choice: it supports autonomy instead of prescribing the
"correct" next step, and either branch is a legitimate answer. It also removes the app's most
likely source of pressure — an implicit *"you're not done here."*

### 4.3 Baseline Mastery — consolidation

**Condition:** completed, `actual < 45` (with `|delta| < 15` already implied by precedence).
**Reads as:** this tier is routine in reality. The frontier is genuinely held.
**S14 copy:** low-key confirmation, not celebration — *"This tier is routine now. Nothing to
prove here."*
**Engine:** ratchet to `max(prev, L)`; pacing `advance → L + 1`. Fast-tracked: no autonomy
choice, because there is no open question.

### 4.4 Approach Attempt — stepped up, held back

**Condition:** the user selects **"Log an attempt / I held back"** on S12.
**Reads as:** approach behaviour occurred, completion did not. The behaviour treatment
actually reinforces is the approach; completing is an outcome the user cannot control.

**S14 copy — and this is the whole point:** *never* pity, *never* a consolation prize, *never*
a number. The attempt is framed as diagnostic data:
*"You walked up to the edge. That counts as data, not a failure."*

The user is asked **one** question — `freezeTrigger` — captured on S12 as chips, not a
free-text essay:

> **What tripped the freeze?**
> Didn't know what to say · Timing was wrong · Fear spiked · Got a bad response · Other

Then one line about what changed: *"We've lowered the step for Level 6."*

**Engine:** frontier **unchanged**; pacing `bridge → L` (§5.1). The user is never left parked
on the exact mission that beat them, and the bridge is a smaller threshold, not a demotion.

### 4.5 Calibration Match — accurate read, held anyway *(added)*

**Condition:** completed, `actual >= 45`, not already claimed by a higher row. Covers the
`45 ≤ actual < 60` band with `|delta| < 15`.
**Why it must exist:** without it, a user who predicts `50 / 55` — an honest, moderate,
accurate read of a moderate mission — falls through every specified archetype (§4.7). Their
completion would produce *no* verdict, on the screen that exists to give them one.
**Reads as:** the prediction was right and the load was real. Not a disconfirmation, not a
crisis — a good measurement that held.
**S14 copy:** *"You called it at 52, it landed at 58. You knew what you were walking into, and
you walked in."*
**Engine:** ratchet to `max(prev, L)`; pacing `advance → L + 1`.

### 4.6 Underestimate — reality exceeded the prediction *(added)*

**Condition:** completed AND `delta <= −15`.
**Why it must exist:** a user who predicted 30 and met 60 has a materially important,
materially different experience, and none of the four arms claim it (`delta >= 15` fails,
`actual >= 60` *may* fail, `expected < 45 && actual < 45` fails at `actual 60`). Left
unclassified, the single most instructive outcome in the system — *I underestimated this* —
would produce generic copy.
**Reads as:** the miss is real and it is information. The level is currently above reach.
**S14 copy:** *"Reality ran heavier than your prediction — by 30. That's the first real
measurement of this edge, and it's worth more than a comfortable run would have been."*
**Engine:** ratchet to `max(prev, L − 0.2)`; pacing `repeat → L`, reason `'above_reach'`.
Advancing here would be the engine ignoring the user's own report.

### 4.7 Coverage proof

The four specified arms leave reachable input classes uncovered. All are occupied by realistic
ratings.

| Case | expected / actual | delta | Specified arms | Verdict |
|---|---|---|---|---|
| Accurate moderate read | 50 / 55 | −5 | ✗ V (needs ≥15) · ✗ DT (needs ≥60) · ✗ BM (needs both <45) | **gap → §4.5** |
| Under-predicted, real difficulty | 35 / 60 | −25 | ✗ V · ✓ DT *by accident* | **gap → §4.6** |
| Under-predicted, mid-band | 40 / 55 | −15 | ✗ V (−15 < 15) · ✗ DT · ✗ BM | **gap → §4.6** |
| Accurate hard read | 80 / 80 | 0 | ✓ DT | covered |
| Feared it, it was nothing | 75 / 25 | +50 | ✓ V | covered |
| Routine tier | 30 / 20 | +10 | ✓ BM | covered |

Row 2 is the sharpest. `35 / 60` *would* match Distress Tolerance, whose copy tells the user
*"both numbers are honest, you did it anyway"* — when in fact the numbers were 25 apart and
the app should say so. Placing Underestimate **before** Distress Tolerance in precedence fixes
both the misread and the moderate-band gap.

The default arm (§4.0 row 6) adds a **structural guarantee**: the function is total over all
`(outcome, expected, actual)`. No input yields no archetype.

---

## 5. The pacing engine

### 5.1 Bridge alternatives

A bridge is the **same level, lighter content** — a micro-step down in friction, not a
demotion and not a different task. It exists so an approach attempt produces forward motion
rather than a parked user.

Derived **deterministically from existing mission fields** — no server round-trip, no latency
at the worst possible moment, no LLM dependency:

| Signal | Bridge rule |
|---|---|
| `tags` include `In person` | Move it async — same introduction, over DM |
| `tags` include `Direct ask` | Drop the ask — same contact, no request |
| `tags` include `Public` | Make it private — same words, one recipient |
| `tags` include `Sustained` / `Extended` | Halve the duration |
| default | Execute the first half only |

`bridgeFor(mission)` is pure. The bridge keeps the parent's `level` with a `bridgeOf` marker so
history reads honestly. An LLM-generated bridge tuned to the specific `freezeTrigger` is a
later enhancement; the deterministic rule ships first and cannot fail.

### 5.2 The decision table

| Last outcome | Pacing |
|---|---|
| Expectancy Violation | `advance → L + 1` |
| Calibration Match | `advance → L + 1` |
| Baseline Mastery | `advance → L + 1` |
| Distress Tolerance | `choose` — repeat `L` or advance to `L + 1` |
| Underestimate | `repeat → L`, reason `above_reach` |
| Approach Attempt | `bridge → L` |

### 5.3 Why frontier and path diverge deliberately

After a Distress Tolerance at Level 4, the frontier sits at `3.8` while pacing offers Level 5.
That is not an inconsistency: **the frontier records what is held; pacing probes what is
possible.** If pacing were gated on the watermark, a user could never attempt anything they had
not already mastered — the exact opposite of an exposure ladder. `activeLevel` may legitimately
exceed `frontier` while ascending; it may never *replace* it.

---

## 6. Pre-mission cognitive reframing

Calibration becomes an **input to the mission**, not a payout afterwards.

### 6.1 The stat

```ts
meanOverestimation(debriefs) =
    mean(expected − actual) over completions where expected > actual
```

plus the headline you proposed, `fearWasWrongRate()`: **"8 of 10 missions were easier than you
feared."** This is the app's entire thesis as one countable fact about the user's own data —
and a far stronger motivator than any extrinsic reward, because it is *evidence*.

### 6.2 The Reality Check callout (S11)

Gates on all four:

| Gate | Value | Why |
|---|---|---|
| `expected >= 50` | `REFRAME.minExpected` | Below this there is no fear to reframe |
| prior completions `>= 2` | `REFRAME.minCompletions` | One data point is an anecdote, not a pattern |
| `meanOverestimation >= 5` | `REFRAME.minMeanOverestimation` | Don't cite a gap that isn't there |
| not already shown for this mission | — | Once per mission, so it lands |

```
        ┌──────────────────────────────────────────────┐
        │  REALITY CHECK                               │
        │                                              │
        │  You're predicting 72/100. Across your past  │
        │  missions, reality ran an average of 18      │
        │  points lighter than your fear predicted.    │
        │                                              │
        │  8 of 10 missions were easier than you       │
        │  feared.                                     │
        └──────────────────────────────────────────────┘
```

**What it must never say.** No "so this will probably be easy." That is a forecast the app
cannot make, and if it is wrong once the user stops trusting every number on the screen. It is
framed strictly as a **fact about their history** — evidence, not prediction. The user decides
what to do with it.

> **Screen-ID note.** Pre-rating is **S11** in `threshold-mockups-plan.md`
> (`s11-pre-rating.html`, `mission/[missionId]/pre-rating.tsx`); **S12**
> (`s12-in-progress.html`) is the in-progress screen carrying the abort path. The brief
> grouped both under S12 — they are separated below.

### 6.3 Why this is the anti-overjustification move

The old model paid the user after the fact. This one gives them their own evidence *before*
they act — which is what actually reduces avoidance (a disconfirming prediction, available in
advance). Nothing is earned, nothing is consumed, and there is no number to chase. Motivation
stays where the thesis needs it: on the real-world action.

---

## 7. Data model

### 7.1 The one stored value, and why

`calibration.ts` opens with *"Nothing here is stored — it is all computed from the debrief log,
so the numbers can never drift out of sync with reality."* That doctrine is right for
diagnostics and **unsafe for a ratchet.**

If the frontier were recomputed on every read, retuning `manageableActual` from 55 to 50, or
`highFrictionDiscount` from 0.2 to 0.3, would silently move a watermark the user had already
earned — in either direction. A monotonic value enforced by a formula humans will inevitably
edit is not monotonic.

**So: the frontier delta is computed once, at logging time, and frozen onto the debrief.**
Totals, rungs, archetypes and every diagnostic remain derived. The log stays the single source
of truth; the ratchet rule is applied at write time instead of read time.

### 7.2 `lib/types.ts`

```ts
export type MissionOutcome = 'completed' | 'attempted';

export type Debrief = {
    missionId: string;
    level: number;
    missionTitle: string;
    expectedDifficulty: number;
    actualDifficulty: number;
    notes: string;
    completedAt: string;

    /** Absent on rows logged before this change; treated as 'completed'. */
    outcome?: MissionOutcome;
    /** Frozen at write time — the frontier this mission produced. Never recomputed. */
    frontierAfter?: number;
    /** True when completed through the bridge alternative for this level. */
    viaBridge?: boolean;
    /** Set only on approach attempts. One chip, not an essay. */
    freezeTrigger?: string;
};

export type Campaign = {
    /* …existing… */
    /** Level the pacing engine is working. May exceed the frontier. */
    activeLevel: number;
    /** Set when the active mission is a bridge rather than the canonical mission. */
    activeIsBridge?: boolean;
};
```

### 7.3 `lib/calibration.ts` — exact interfaces

```ts
/* ─────────────────────────── constants ─────────────────────────── */

export const FRONTIER = {
    floor: 1.0,
    ceiling: 10.0,
    /** actual <= this at level L ratchets the frontier to L outright. */
    manageableActual: 55,
    /** actual > manageableActual: credit L minus this. */
    highFrictionDiscount: 0.2,
    /** completed via a bridge: credit L minus this. */
    bridgeDiscount: 0.5,
} as const;

export const ARCHETYPE = {
    /** |delta| at or past this is a material expectancy gap. */
    deltaBand: 15,
    /** actual at or above this is a genuinely hard mission. */
    distressActual: 60,
    /** actual at or above this is real, moderate friction. */
    moderateActual: 45,
} as const;

export const REFRAME = {
    minExpected: 50,
    minCompletions: 2,
    minMeanOverestimation: 5,
} as const;

/* ─────────────────────────── frontier ──────────────────────────── */

export type FrontierRung = {
    index: number;
    name: string;
    /** Inclusive lower bound on the 1.0–10.0 scale. */
    floor: number;
    blurb: string;
};

export type ThresholdFrontier = {
    /** 0.0 before the first completion, then 1.0–10.0, one decimal. */
    value: number;
    rung: FrontierRung;
    next: FrontierRung | null;
    /** 0–1 across the whole 1.0–10.0 scale, for the ring arc. */
    ratio: number;
    /** Level pacing is working. May exceed `value`. */
    activeLevel: number;
};

export const RUNGS: FrontierRung[];                      // §3.2, 7 entries
export const COMMITTED: FrontierRung;                    // the 0.0 state

/** Pure. The whole ratchet rule, §3.1. */
export function frontierAfter(
    prev: number,
    input: {
        level: number;
        actual: number;
        outcome: MissionOutcome;
        viaBridge?: boolean;
    },
): number;

/** Fold of `frontierAfter` over the log in completedAt order. */
export function frontierValue(debriefs: Debrief[]): number;

export function frontier(debriefs: Debrief[], campaign: Campaign | null): ThresholdFrontier;
export function rungFor(value: number): FrontierRung;

/* ─────────────────────────── archetypes ────────────────────────── */

export type DebriefArchetype =
    | 'expectancy_violation'
    | 'distress_tolerance'
    | 'baseline_mastery'
    | 'approach_attempt'
    | 'calibration_match'      // added, §4.5
    | 'underestimate';         // added, §4.6

export type ArchetypeReadout = {
    archetype: DebriefArchetype;
    /** Kernel label for the S14 badge, e.g. "Fear disconfirmed". */
    label: string;
    /** One-line S14 headline. */
    headline: string;
    /** Two-sentence supporting copy. */
    body: string;
    /** Render the expected → actual gap prominently? */
    emphasiseGap: boolean;
};

/** Pure, total, deterministic. Precedence per §4.0 — never returns undefined. */
export function classifyDebrief(debrief: Debrief): DebriefArchetype;
export function archetypeReadout(debrief: Debrief): ArchetypeReadout;

/* ──────────────────────────── pacing ───────────────────────────── */

export type PacingOption = {
    id: 'repeat' | 'advance';
    label: string;
    blurb: string;
    level: number;
};

export type PacingDecision =
    | { kind: 'advance'; level: number }
    | { kind: 'repeat'; level: number; reason: 'consolidate' | 'above_reach' }
    | { kind: 'bridge'; level: number; mission: Mission }
    | { kind: 'choose'; level: number; options: PacingOption[] };

export function bridgeFor(mission: Mission): Mission;
export function paceNext(
    debrief: Debrief,
    mission: Mission,
    campaign: Campaign,
): PacingDecision;

/* ─────────────────────── calibration readouts ──────────────────── */

export type DomainFrontier = {
    domain: FrictionDomain;
    label: string;
    blurb: string;
    /** Highest level completed in this domain. null when untested. */
    localFrontier: number | null;
    completions: number;
    attempts: number;
    /** Mean of (expected − actual) over completions where expected > actual. */
    meanExpectancyGap: number | null;
    standing: DomainStanding;
};

export function domainFrontiers(
    debriefs: Debrief[],
    campaign: Campaign | null,
): DomainFrontier[];

export function meanOverestimation(debriefs: Debrief[]): number | null;
export function fearWasWrongRate(debriefs: Debrief[]): { easier: number; total: number };

export type Reframe = {
    expected: number;
    meanOverestimation: number;
    sampleSize: number;
    easier: number;
    total: number;
    headline: string;
    body: string;
};

/** null when any gate in §6.2 fails. */
export function reframeFor(expected: number, debriefs: Debrief[]): Reframe | null;
```

### 7.4 Removed

| Symbol | Reason |
|---|---|
| `thresholdScore()` | §1 — the mean of absolute error |
| `RUNGS` as a points table | replaced by `FrontierRung` |
| `ThresholdProgress`, `MissionAward`, `POINTS`, `awardFor`, `thresholdPoints`, `totalAward` | never shipped; no longer exists in any form |
| `frictionDomainStats()` | superseded by `domainFrontiers()` — same shape plus `localFrontier` |

`averageDelta()`, `currentLevel()`, `activeMission()`, `nextMission()`, `insightFor()` are
retained. `insightFor()` becomes fallback copy for archetypes that do not override it.

---

## 8. `store/app-store.tsx`

```ts
completeMission(debrief: Omit<Debrief, 'completedAt' | 'frontierAfter' | 'outcome'>)
logAttempt({ missionId, level, missionTitle, freezeTrigger })
setPacing(decision: PacingDecision)      // resolves a 'choose' from S14
```

- `completeMission` computes `frontierAfter` via `frontierAfter(current, …)`, computes the
  `PacingDecision`, but does **not** apply it — S14 owns the reveal, and for
  `distress_tolerance` the user must choose.
- `logAttempt` writes `outcome: 'attempted'`, leaves `frontierAfter` **unchanged**, and
  computes a `bridge` decision.
- `setPacing` is what actually moves `campaign.activeLevel` / `activeIsBridge`. Default at
  campaign creation: `activeLevel = 1`, `activeIsBridge = false`.
- **Legacy rows** (`outcome` absent): treated as `completed`, `viaBridge: false`, with
  `frontierAfter` back-filled by folding `frontierAfter` over the log in `completedAt` order.
  Deterministic from stored fields, so the back-fill is exact and the ratchet holds across the
  whole history.
- `recordPreRating` also stores whether the Reality Check was shown for that mission, so §6.2's
  once-per-mission gate survives a navigation away and back.

---

## 9. Worked example — a full campaign

The demo networking path, with realistic ratings. Note the insert at M7.

| # | L | exp → act | delta | Archetype | Frontier after | Pacing |
|---|---|---|---|---|---|---|
| 1 | 1 | 62 → 28 | +34 | Expectancy Violation | `max(0.0, 1)` → **1.0** | advance → 2 |
| 2 | 2 | 55 → 30 | +25 | Expectancy Violation | `max(1.0, 2)` → **2.0** | advance → 3 |
| 3 | 3 | 50 → 42 | +8 | Baseline Mastery | `max(2.0, 3)` → **3.0** | advance → 4 |
| 4 | 4 | 78 → 74 | +4 | Distress Tolerance | `max(3.0, 3.8)` → **3.8** | **choose** |
| 5 | 4 | 70 → 55 | +15 | Expectancy Violation | `max(3.8, 4)` → **4.0** | advance → 5 |
| 6 | 5 | 65 → 68 | −3 | Distress Tolerance | `max(4.0, 4.8)` → **4.8** | **choose** → push |
| 7 | 6 | — | — | **Approach Attempt** | **4.8** unchanged | **bridge → L6** |
| 8 | 6ᵇ | 55 → 50 | +5 | Calibration Match | `max(4.8, 5.5)` → **5.5** | advance → 7 |
| 9 | 7 | 72 → 58 | +14 | Calibration Match | `max(5.5, 7)` → **7.0** | advance → 8 |
| 10 | 8 | 80 → 82 | −2 | Distress Tolerance | `max(7.0, 7.8)` → **7.8** | **choose** |

Final: **7.8 — Beyond Your Path** (7.5–8.9). Rung crossings at M1, M3, M6, M10.

Three properties the model exists for, all visible above:

- **M7 cost nothing.** The attempt left the frontier at exactly 4.8. Ten attempts would also
  leave it at 4.8. §3.1.1 holds arithmetically.
- **M5 explains the discount.** The repeat at Level 4 converted `3.8` into a clean `4.0` — the
  0.2 was a reservation, not a loss.
- **M8 shows the bridge being honest.** Completing the *lighter* Level 6 earned `5.5`, not the
  `6.0` the canonical mission would have paid. Crossing in a smaller form is worth slightly
  less altitude, and the number says so without comment.

**Versus the rejected model.** The old abort hole paid M7 five points, and 100 attempts would
have reached the "Widening" rung that M10's genuine Level 8 survival also reaches. Here both
are structurally impossible, and no screen ever displays a farmable number.

---

## 10. UI changes

### S11 — Pre-Rating (`mission/[missionId]/pre-rating.tsx`)

| Change | Detail |
|---|---|
| **Reality Check callout** | New card above the slider, shown when `reframeFor(expected, debriefs)` is non-null. Re-evaluates live as the slider crosses 50. Copy verbatim from §6.2. Never predictive (§6.2). |
| Slider unchanged | The pre-rating stays the user's free, unpriced estimate. It is no longer an input to any award, which is what makes it trustworthy. |
| Record `reframeShown` | Once-per-mission gate (§8). |

### S12 — In Progress (`mission/[missionId]/in-progress.tsx`)

| Change | Detail |
|---|---|
| Ghost action renamed | **"Log an attempt"** (was Abort/pause). Copy: *"Finishing isn't required to log this. Trying counts."* |
| Freeze-trigger chips | Tapping the ghost action reveals the five chips from §4.4 inline — one tap to answer, not a screen transition. |
| **No number anywhere** | The attempt path shows no points, no streak, nothing to lose. The existing "no streak clock" line stays and is now literally true. |
| Bridge arrives on Home | After logging, the bridge is the active mission when the user returns — the swap is silent, and the copy names it (*"We've lowered the step for Level 6"*). |

### S14 — Result (`mission/[missionId]/result.tsx`)

This screen is rewritten around the archetype. **No receipt, no points, no delta-as-currency.**

| Change | Detail |
|---|---|
| Archetype-driven hero | Badge label, headline and body from `archetypeReadout()`. Six variants, one per §4 arm. |
| `emphasiseGap` | When true, the expected → actual row is the visual anchor. When false (Distress Tolerance), the *actual* value is the anchor and the gap is de-emphasised — the numbers must not read as a verdict. |
| Kept verbatim | The existing `ScoreRow` and `insightFor()` copy stay for the fallback path. |
| Distress Tolerance only | The §4.2.1 autonomy buttons. Both call `setPacing`. Neither is styled as the recommended one. |
| Approach Attempt only | Diagnostic framing card, `freezeTrigger` echoed back, and one line: *"We've lowered the step for Level 6."* |
| Underestimate only | The above-reach framing; CTA is **"Go again"** rather than "Next level." |
| Frontier readout | The new frontier value, one decimal, with the rung name. Shown as **provenance, not payment** — it is the same number on S15, and nothing was added to a balance. |

### S15 — Progress (`src/app/(tabs)/progress.tsx`)

| Change | Detail |
|---|---|
| Ring | Shows the frontier `1.0–10.0` with a full-scale arc, one decimal inside. The current `ThresholdRing` (`components/ui/score.tsx:71`) changes from `score: 0–100` to `value`/`min`/`max`/`label`. |
| Rung display | Rung name is the headline; the decimal is subordinate. Rung ladder as a 7-step rail with the current position marked — **a map, not a progress bar**. |
| Summary boxes | **Frontier · Rung · Missions done.** Replaces `Done / Avg Δ / Level`; `Avg Δ` was a diagnostic masquerading as a score. |
| Calibration card | Signed mean delta **plus** "8 of 10 missions were easier than you feared." This is where the honest diagnostic lives, clearly separated from the watermark. |
| Domain breakdown | `domainFrontiers()` — each domain shows its own `localFrontier` certificate (e.g. *"Live strangers · L4"*), completions, attempts, and mean expectancy gap. Standing chip from `DomainStanding`. |
| Subtitle kept | *"Growth is measured by what you can handle now — not by unbroken streaks."* Still true, more so. |

### S10 — Home (`src/app/(tabs)/home.tsx`)

| Change | Detail |
|---|---|
| Badge | Rung name, not a number. (`Threshold 34` → `At Ease`.) |
| Frontier strip | Replaces the points strip: `4.8 · At Ease` with a 7-dot rung rail. **No delta-to-next-rung.** The next rung is shown as a name, not as a countdown — a countdown is the overjustification failure in miniature. |
| Post-attempt framing | When the last log was an attempt, the insight card reads *"Last time you held back at Level 6. Your next step is a lighter version — same level, smaller move."* Factual, no consolation. |
| Post-choice framing | After a Distress Tolerance choice, the card reflects the decision back: *"You're repeating Level 4."* |
| Campaign-complete card | Shows the closing frontier and rung. |

### S16 — History (`src/app/history.tsx`)

| Change | Detail |
|---|---|
| Archetype per row | Badge with the archetype label; attempts shown distinctly from completions. |
| Dropped | The per-row award total from the rejected model. |
| Frontier column | `frontierAfter` per row, so the ratchet is auditable by the user. |

### S17 — Settings (`src/app/(tabs)/settings.tsx`)

| Change | Detail |
|---|---|
| `Threshold` row → `Frontier` | `String(score)` becomes `value.toFixed(1)` with the rung name beside it. |

---

## 11. Acceptance criteria

- [ ] `frontierAfter(prev, attempted)` returns `prev` exactly — for every `prev`, `L`, `actual`.
- [ ] Twenty completions at Level 1 yield `1.0`, not a growing number (§3.1.2).
- [ ] `classifyDebrief` returns a valid archetype for every `(outcome, expected, actual)` in
      `0–100 × 0–100`, proven by the catch-all arm (§4.0 row 6).
- [ ] `60/60` and `75/78` both classify as Distress Tolerance and read as validation, not as
      a zero (§4.2).
- [ ] `35/60` classifies as **Underestimate**, not Distress Tolerance (§4.7 row 2).
- [ ] `50/55` classifies as **Calibration Match**, not `undefined` (§4.7 row 1).
- [ ] Approach Attempt pays nothing, is recorded in history, and never advances the frontier
      (§4.4, §3.1.1).
- [ ] Approach Attempt replaces the active mission with a bridge at the same level, never a
      parked repeat of the same mission (§4.4, §5.1).
- [ ] `reframeFor` returns `null` for each gate in §6.2 independently: `expected < 50`,
      `< 2` completions, `meanOverestimation < 5`.
- [ ] Reality Check copy contains no predictive language (§6.2).
- [ ] No screen renders a points total, a receipt, a near-miss countdown, or a streak.
- [ ] S15 does not render a signed negative delta as a headline score.
- [ ] Frontier is frozen per debrief; legacy rows back-fill deterministically (§7.1, §8).
- [ ] The §9 table reproduces exactly: final `7.8`, "Beyond Your Path", crossings at M1/M3/M6/M10.
- [ ] `npx tsc --noEmit` and `npx expo lint` pass (`mobile/AGENTS.md`).

---

## 12. Order of work

1. `lib/calibration.ts` — constants, `frontierAfter`, `frontierValue`, `rungFor`, `frontier`,
   `classifyDebrief`, `archetypeReadout`, `bridgeFor`, `paceNext`, `domainFrontiers`,
   `meanOverestimation`, `fearWasWrongRate`, `reframeFor`. Delete `thresholdScore()` and
   `frictionDomainStats()`.
2. `lib/types.ts` — `MissionOutcome`, `Debrief` extensions, `Campaign.activeLevel`.
3. `store/app-store.tsx` — `frontierAfter` computed in `completeMission`; add `logAttempt` and
   `setPacing`; back-fill legacy rows.
4. `components/ui/score.tsx` — `ThresholdRing` takes `value`/`min`/`max`/`label`. Add
   `RungRail` (S10) and `FrontierLadder` (S15).
5. **S14** first, then **S15** — these carry the model, and reviewing them together is how the
   three-mechanism separation gets checked.
6. **S11** (Reality Check) and **S12** (log an attempt + chips) — the two behavioural changes.
7. **S10**, **S17**, **S16**.
8. Mirror into `mockups/screens/` — `s10`, `s11`, `s12`, `s14`, `s15`, `s16`, `s17` — so the
   HTML and the app still read as the same product (`mobile/README.md`).
9. Update `mobile/README.md`: the standing "Open decisions" entry for the Threshold Score
   formula is resolved by this document and should point here.

---

## 13. Resolved decisions

**Status: approved.** All seven decisions are resolved in favour of the simplest deterministic
implementation that matches the Frontier / Archetype / Pacing model. Nothing below is a
judgement call at build time.

| # | Decision | Ruling |
|---|---|---|
| 1 | Six-arm classifier | **Confirmed as specified.** `calibration_match` (§4.5) and `underestimate` (§4.6) are kept, with precedence exactly as tabulated in §4.0. |
| 2 | `manageableActual` | **`55`.** A mission must be clearly rough before the 0.2 reservation applies. |
| 3 | `deltaBand` | **`15`.** Boundary between "disconfirmed" and "as predicted." |
| 4 | Freeze-trigger chips | **Chips, five options**, exactly as listed in §4.4. No free text. |
| 5 | Bridge derivation | **Deterministic from `tags`** (§5.1). No LLM call in the abort path. |
| 6 | Domain frontier | **No cross-domain frontier.** The domain table is the nuance; there is no composite headline number. |
| 7 | Terminal state | **Ladder ends at `10.0`.** S15 then leads with the capability profile and history. |

### 13.1 What "simplest deterministic" settles beyond the list

Three implementation-shape questions that follow from the same principle:

- **Frontier start.** `0.0` before the first completion, then floored at `1.0` — a user with a
  log but no completion sits at `0.0 · Committed`.
- **Constants are module-level `as const`**, never configurable at runtime. `FRONTIER`,
  `ARCHETYPE` and `REFRAME` are edited in source and reviewed like any other code.
- **The classifier is a single `if/else` chain in precedence order**, not a scored or
  weighted system. First match wins; the final branch is unconditional.

### 13.2 Remaining at build time

Nothing blocking. Two cosmetic values are settled by §6 rather than by opinion: the Reality
Check gate is `expected >= 50` (§6.2), and the freeze-trigger chip set is the five strings in
§4.4. Both are constants in `lib/calibration.ts` and can be retuned without touching a screen.
