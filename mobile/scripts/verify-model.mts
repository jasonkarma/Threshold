/**
 * Verification harness for the Frontier / Archetype / Pacing model.
 *
 * ```
 * nvm use 22
 * npm run verify
 * ```
 *
 * `.mts` (not `.ts`) so Node runs it as a native ES module without a
 * `"type": "module"` flag in `package.json`, which would break the Expo app.
 * It is deliberately excluded from `tsconfig`'s `**\/*.ts` include for the same
 * reason — the app is bundled by Metro and never typechecks this file.
 *
 * This is a plain assertion script, not a test framework: it pins the properties
 * the design documents claim, so retuning a constant cannot silently break one.
 * It encodes the acceptance criteria in `plans/threshold-points-plan.md` §11 and
 * `plans/threshold-multi-campaign-plan.md` §9 — most importantly the two that are
 * easy to lose: attempts are worth exactly zero, and repetition is inert.
 */
import {
    ARCHETYPE_THRESHOLDS,
    FRONTIER,
    RUNGS,
    archetypeReadout,
    bridgeFor,
    classifyDebrief,
    fearWasWrongRate,
    formatFrontier,
    frontierAfter,
    frontierValue,
    isCampaignComplete,
    paceNext,
    reframeFor,
    rungFor,
} from '../src/lib/calibration.ts';
import { campaignStatus, campaignProgress, migrateDebriefs } from '../src/lib/campaigns.ts';
import {
    buildDemoCampaign,
    DEMO_CAMPAIGN_NAME,
    DEMO_SEED,
    shortenAmbition,
} from '../src/lib/mock-campaign.ts';

let passed = 0;
const failures: string[] = [];

function check(label: string, condition: boolean, detail?: unknown) {
    if (condition) {
        passed += 1;
        return;
    }
    failures.push(`${label}${detail === undefined ? '' : ` — got ${JSON.stringify(detail)}`}`);
}

function eq(label: string, actual: unknown, expected: unknown) {
    check(`${label} (expected ${JSON.stringify(expected)})`, actual === expected, actual);
}

/* ------------------------------------------------------- 1. the abort hole ---- */

// Attempts are worth zero *structurally*: for any prev, level and actual.
for (const prev of [0, 1, 3.8, 7, 10]) {
    for (const level of [1, 4, 10]) {
        for (const actual of [0, 50, 100]) {
            eq(
                `frontierAfter(attempted) is a no-op`,
                frontierAfter(prev, { level, actual, outcome: 'attempted' }),
                prev,
            );
        }
    }
}

// 100 attempts can never exceed what completions earned.
let grinding = 0;
for (let i = 0; i < 100; i += 1) {
    grinding = frontierAfter(grinding, { level: 1, actual: 90, outcome: 'attempted' });
}
eq('100 attempts leave the frontier untouched', grinding, 0);

/* ------------------------------------------------- 2. repetition is inert ---- */

let repeated = 0;
for (let i = 0; i < 20; i += 1) {
    repeated = frontierAfter(repeated, { level: 1, actual: 20, outcome: 'completed' });
}
eq('20 completions at Level 1 yield 1.0, not a growing number', repeated, 1);

/* --------------------------------------------------------- 3. the ratchet ---- */

eq('manageable execution ratchets cleanly to L', frontierAfter(0, { level: 4, actual: 55, outcome: 'completed' }), 4);
eq('high friction reserves 0.2 below L', frontierAfter(0, { level: 4, actual: 74, outcome: 'completed' }), 3.8);
eq('a bridge reserves 0.5 below L', frontierAfter(0, { level: 6, actual: 50, outcome: 'completed', viaBridge: true }), 5.5);
eq('the discount is a reservation: a repeat converts 3.8 into 4.0', frontierAfter(3.8, { level: 4, actual: 50, outcome: 'completed' }), 4);
eq('the ratchet is a max, never a sum', frontierAfter(7, { level: 2, actual: 10, outcome: 'completed' }), 7);
eq('the first completion is floored at 1.0', frontierAfter(0, { level: 1, actual: 100, outcome: 'completed' }), 1);
eq('the ceiling holds', frontierAfter(10, { level: 10, actual: 10, outcome: 'completed' }), 10);
check('no award is ever negative', frontierAfter(0, { level: 10, actual: 100, outcome: 'completed' }) >= 0);

/* ---------------------------------------------- 4. classifier is total ---- */

let undefinedCount = 0;
for (const outcome of ['completed', 'attempted'] as const) {
    for (let expected = 0; expected <= 100; expected += 1) {
        for (let actual = 0; actual <= 100; actual += 1) {
            const debrief = {
                missionId: 'm1',
                level: 1,
                missionTitle: 't',
                expectedDifficulty: expected,
                actualDifficulty: actual,
                notes: '',
                completedAt: '2026-01-01T00:00:00.000Z',
                outcome,
            };
            const archetype = classifyDebrief(debrief);
            if (!archetype) undefinedCount += 1;
            // Every readout must be renderable without throwing.
            archetypeReadout(debrief);
        }
    }
}
eq('classifier is total over the whole 0–100 × 0–100 grid', undefinedCount, 0);

/* ----------------------------------------- 5. §4.7 coverage proof rows ---- */

const at = (expected: number, actual: number) => ({
    missionId: 'm', level: 4, missionTitle: 't',
    expectedDifficulty: expected, actualDifficulty: actual,
    notes: '', completedAt: '2026-01-01T00:00:00.000Z',
});

eq('50/55 gets a verdict (calibration_match)', classifyDebrief(at(50, 55)), 'calibration_match');
eq('35/60 is Underestimate, not Distress Tolerance', classifyDebrief(at(35, 60)), 'underestimate');
eq('40/55 is Underestimate', classifyDebrief(at(40, 55)), 'underestimate');
eq('60/60 is Distress Tolerance', classifyDebrief(at(60, 60)), 'distress_tolerance');
eq('75/78 is Distress Tolerance', classifyDebrief(at(75, 78)), 'distress_tolerance');
eq('75/25 is Expectancy Violation', classifyDebrief(at(75, 25)), 'expectancy_violation');
eq('30/20 is Baseline Mastery', classifyDebrief(at(30, 20)), 'baseline_mastery');

// The Distress Tolerance readout must validate, not grade.
const dt = archetypeReadout(at(75, 78));
check('Distress Tolerance reads as validation', /honest/i.test(dt.headline), dt.headline);
check('Distress Tolerance does not emphasise the gap', dt.emphasiseGap === false);

const attempt = archetypeReadout({ ...at(70, 70), outcome: 'attempted' });
check('an attempt is never pity-framed', /data, not a failure/i.test(attempt.body), attempt.body);

/* ------------------------------------------------------ 6. pacing table ---- */

const campaign = buildDemoCampaign(DEMO_SEED, 'c1');
const mission4 = campaign.missions.find((m) => m.level === 4)!;

eq('Expectancy Violation advances', paceNext(at(75, 25), mission4, campaign).kind, 'advance');
eq('Calibration Match advances', paceNext(at(50, 55), mission4, campaign).kind, 'advance');
eq('Baseline Mastery advances', paceNext(at(30, 20), mission4, campaign).kind, 'advance');
eq('Distress Tolerance offers a choice', paceNext(at(75, 78), mission4, campaign).kind, 'choose');
eq('Underestimate repeats (above reach)', paceNext(at(35, 60), mission4, campaign).kind, 'repeat');
eq('an attempt bridges', paceNext({ ...at(70, 70), outcome: 'attempted' }, mission4, campaign).kind, 'bridge');

const choice = paceNext(at(75, 78), mission4, campaign);
check(
    'Distress Tolerance never recommends a branch',
    choice.kind === 'choose' && choice.options.length === 2,
);

/* ---------------------------------------------------------- 7. bridges ---- */

const inPerson = campaign.missions.find((m) => m.tags.includes('In person'))!;
const bridge = bridgeFor(inPerson);
check('a bridge keeps the parent level', bridge.level === inPerson.level);
check('a bridge records its parent', bridge.bridgeOf === inPerson.id);
check('a bridge has its own id', bridge.id !== inPerson.id);
check('an In person mission bridges to async', /DM instead/.test(bridge.title), bridge.title);

const directAsk = campaign.missions.find((m) => m.tags.includes('Direct ask'))!;
check('a Direct ask bridges by dropping the ask', /no ask/i.test(bridgeFor(directAsk).title));

/* -------------------------------------------------- 8. Reality Check gates ---- */

const strong = [
    at(70, 40), at(65, 35), at(80, 45),
];
check('mean overestimation >= 5 with 3 completions opens the callout', reframeFor(72, strong) !== null);
eq('expected < 50 closes it', reframeFor(40, strong), null);
eq('fewer than 2 completions closes it', reframeFor(72, [at(70, 40)]), null);
eq('a flat history closes it', reframeFor(72, [at(50, 50), at(60, 58)]), null);

const reframe = reframeFor(72, strong)!;
check('the callout cites the mean gap', reframe.meanOverestimation > 0, reframe.meanOverestimation);
check('the callout cites the easier-than-feared count', /of 3/.test(reframe.body), reframe.body);
check(
    'the callout is never predictive',
    !/probably|likely|will be easy|should be easy/i.test(`${reframe.headline} ${reframe.body}`),
    reframe.body,
);

/* --------------------------------------------------- 9. worked example §9 ---- */

/**
 * The §9 table. If this drifts, either a constant moved or the ratchet broke —
 * both are worth failing loudly over.
 */
const scripted: { level: number; expected: number; actual: number }[] = [
    { level: 1, expected: 62, actual: 28 },
    { level: 2, expected: 55, actual: 30 },
    { level: 3, expected: 50, actual: 42 },
    { level: 4, expected: 78, actual: 74 },
    { level: 4, expected: 70, actual: 55 },
    { level: 5, expected: 65, actual: 68 },
    { level: 6, expected: 55, actual: 50 },
    { level: 7, expected: 72, actual: 58 },
    { level: 8, expected: 80, actual: 82 },
];

let running = 0;
for (const step of scripted) {
    running = frontierAfter(running, { ...step, outcome: 'completed' });
}
eq('§9 worked example ends at 7.8', running, 7.8);
eq('§9 rung is Beyond Your Path', rungFor(running).name, 'Beyond Your Path');

// Insert the attempt at §9 M7 and confirm it costs nothing.
let withAttempt = 0;
for (const step of scripted.slice(0, 6)) {
    withAttempt = frontierAfter(withAttempt, { ...step, outcome: 'completed' });
}
const before = withAttempt;
withAttempt = frontierAfter(withAttempt, { level: 6, actual: 50, outcome: 'attempted' });
eq('the §9 M7 attempt costs exactly zero', withAttempt, before);

/* ------------------------------------------ 10. a completed path is >= 9.5 ---- */

let fullPath = 0;
for (let level = 1; level <= 10; level += 1) {
    fullPath = frontierAfter(fullPath, { level, actual: 70, outcome: 'completed' });
}
check('a completed 10-level campaign lands >= 9.5', fullPath >= 9.5, fullPath);
eq('...and reaches Second Nature', rungFor(fullPath).name, 'Second Nature');

/* ------------------------------------------------------ 11. rungs & format ---- */

eq('rung boundaries sit at mission levels', rungFor(3.4).name, 'Steady');
eq('0.0 is the Committed state', rungFor(0).name, 'Committed');
eq('formatFrontier uses one decimal', formatFrontier(3.75), '3.8');
eq('seven rungs', RUNGS.length, 7);

/* ---------------------------------------------------- 12. constants pinned ---- */

eq('manageableActual', FRONTIER.manageableActual, 55);
eq('deltaBand', ARCHETYPE_THRESHOLDS.deltaBand, 15);
eq('distressActual', ARCHETYPE_THRESHOLDS.distressActual, 60);

/* ------------------------------------------------ 13. stats are completions ---- */

const mixed = [...strong, { ...at(70, 70), outcome: 'attempted' as const }];
eq('fear-was-wrong counts completions only', fearWasWrongRate(mixed).total, 3);
eq('frontierValue ignores attempts', frontierValue(mixed), frontierValue(strong));

/* ------------------------------------------- 14. the migration contract ---- */

const legacy = migrateDebriefs(
    scripted.map((s, i) => ({
        missionId: `m${s.level}`,
        level: s.level,
        missionTitle: `L${s.level}`,
        expectedDifficulty: s.expected,
        actualDifficulty: s.actual,
        notes: '',
        completedAt: new Date(Date.UTC(2026, 0, i + 1)).toISOString(),
    })),
    'c1',
);
eq('migration drops nothing', legacy.length, scripted.length);
check('migration attributes every row', legacy.every((d) => d.campaignId === 'c1'));
check('migration freezes the ratchet', legacy.every((d) => typeof d.frontierAfter === 'number'));
eq('migrated log reproduces the same frontier', frontierValue(legacy), 7.8);

// A frozen row must survive a constant change: simulate by pre-setting a value.
const frozen = legacy.map((d, i) => (i === 0 ? { ...d, frontierAfter: 9.9 } : d));
const remigrated = migrateDebriefs(frozen, 'c1');
eq('a frozen row is never recomputed', remigrated[0].frontierAfter, 9.9);
eq('migration is idempotent', migrateDebriefs(remigrated, 'c1').length, remigrated.length);

/* --------------------------------- 15. multi-campaign status & progress ---- */

const second = buildDemoCampaign({ ...DEMO_SEED, ambition: 'Speak up in meetings' }, 'c2');
const campaigns = [campaign, second];
const onlyFirst = legacy;

eq('the active campaign is Active', campaignStatus(campaign, onlyFirst, 'c1'), 'active');
eq('the other is Paused', campaignStatus(second, onlyFirst, 'c1'), 'paused');
// `legacy` covers levels 1–8 of a 10-level path, so the campaign is incomplete.
// A path with any level unlogged must never read Completed, active or not —
// this is the bug class a stored status field produces.
check(
    'an incomplete path is never Completed while paused',
    campaignStatus(campaign, onlyFirst, 'c2') !== 'completed',
    campaignStatus(campaign, onlyFirst, 'c2'),
);
eq(
    'an incomplete paused path reads Paused',
    campaignStatus(campaign, onlyFirst, 'c2'),
    'paused',
);
check(
    'an incomplete path is never Completed while active',
    campaignStatus(campaign, onlyFirst, 'c1') !== 'completed',
);

const partial = legacy.slice(0, 3);
eq(
    'a barely-started path reads Paused',
    campaignStatus(campaign, partial, 'c2'),
    'paused',
);

// The positive case: a genuinely finished path does read Completed, and stops
// reporting Active once it is done.
const fullPathLog = campaign.missions.map((m, i) => ({
    ...at(60, 40),
    missionId: m.id,
    level: m.level,
    missionTitle: m.title,
    campaignId: campaign.id,
    completedAt: new Date(Date.UTC(2026, 1, i + 1)).toISOString(),
}));
eq(
    'a fully logged path reads Completed',
    campaignStatus(campaign, fullPathLog, 'c2'),
    'completed',
);

// Deleting a campaign must not remove its missions from the capability profile.
const orphaned = { ...legacy[0], campaignId: 'deleted-campaign' };
const orphansSurvive = migrateDebriefs([orphaned], null);
eq('an orphaned row survives migration', orphansSurvive.length, 1);
check('an orphaned row is not re-attributed', orphansSurvive[0].campaignId === 'deleted-campaign');

// Campaign 2 starts at 0.0 and does not inherit campaign 1's frontier.
const fresh = campaignProgress(second, legacy, 'c2');
eq('a new campaign starts at 0.0', fresh.frontier, 0);

eq(
    'campaign completion is per-campaign',
    isCampaignComplete(second, legacy),
    false,
);

/* --------------------------------------------- 16. the campaign is named ---- */

/**
 * A campaign name states the goal, and is generated with the path — it is not
 * the first few words of the ambition. The failure this pins: `shortenAmbition`
 * used to be the naming rule, so the demo path was called "Network with startup
 * founders", which is the *input* sentence truncated and says nothing about
 * where the path goes.
 */
eq('the demo campaign is named for its goal', campaign.label, DEMO_CAMPAIGN_NAME);
check(
    'the name is not the opening words of the ambition',
    !campaign.label.toLowerCase().startsWith('network with startup founders'),
    campaign.label,
);
check('the name carries no ellipsis', !campaign.label.includes('…'), campaign.label);
check('the name fits the 48-char display budget', campaign.label.length <= 48, campaign.label.length);

// `shortenAmbition` survives only as the fallback for an unnamed seed, so it
// must still work — but it must no longer be what names the demo path.
eq(
    'an unknown seed still falls back to trimming the ambition',
    buildDemoCampaign({ ...DEMO_SEED, ambition: 'Speak up in meetings and be heard' }, 'c3').label,
    shortenAmbition('Speak up in meetings and be heard'),
);
eq(
    'the fallback trims at the first conjunction',
    shortenAmbition('Speak up in meetings and be heard'),
    'Speak up in meetings',
);

/* --------------------------------------------------------------- report ---- */

console.log(`\n${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
    for (const failure of failures) console.log(`  ✗ ${failure}`);
    process.exit(1);
}
console.log('Frontier / archetypes / pacing: all properties hold.');
