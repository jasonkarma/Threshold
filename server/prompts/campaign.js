/**
 * The campaign prompt and its output schema.
 *
 * Kept in its own module (rather than inline in the orchestration) because
 * mock-up A01 — *Prompt Rules*, Story 5 — exists precisely to let templates be
 * edited without shipping a new app binary. When that admin screen grows a
 * backend, this module is the seam it writes through.
 *
 * ## Field names are load-bearing
 *
 * `mockups/screens/a01-prompt-rules.html` documents the payload as
 * `levelNumber` / `missionTitle` / `targetContext`. The app does **not** read
 * those names. `normalizeMission` in `mobile/src/lib/campaign-service.ts` reads
 * `level` / `title` / `description` / `tags` / `domain` / `context` / `tip`, and
 * silently discards anything else — producing ten cards titled "Level 1" with
 * no error raised anywhere. So the schema below uses the **app's** names, and
 * `validate.js` enforces them.
 *
 * ## The campaign name
 *
 * `name` is the one field outside the mission array the model owns. It is mapped
 * onto the app's `label` by `validate.js`. It is generated rather than sliced out
 * of the ambition on purpose: the opening words of the ambition are the *input*,
 * and a name built from them says nothing about where the path is going —
 * `campaigns.js` carries the full reasoning.
 *
 * ## The destination
 *
 * The path has two anchored ends, and only one of them used to be stated. Level 1
 * is the user's declared baseline (rule 2 below), but nothing required the *final*
 * level to be the ambition — the intro said "ending somewhere near the ambition
 * they named", and "near" was load-bearing in the wrong direction.
 *
 * The defect that exposed it, reproduced with the seed "Ask my manager for a raise":
 * the model spent the ask at level 8, then closed the path on level 9 — "Pin the
 * answer down in writing", a written recap of the reply. The last step of the
 * campaign was admin *past* the goal rather than the goal. The same seed also
 * produced two off-theme filler missions ("ask the barista to remake the drink",
 * "negotiate one small fee or price"): rule 4's instruction to ramp through
 * domains read as a template to climb (async → live → authority) rather than as a
 * vocabulary for labelling friction, so it imported generic social-fitness tasks
 * that had nothing to do with the ambition.
 *
 * Both are fixed in the prompt text below rather than in `validate.js`. The failure
 * is semantic — "is this last mission the ambition, or a wrap-up?" — and no
 * deterministic check in the validator can answer it without false-positiving on
 * legitimate final missions. Anchoring the ends, and naming wrap-up steps as
 * forbidden, is the available lever.
 */

/** The three friction domains the app understands (`mobile/src/lib/types.ts`). */
export const DOMAINS = ['public_async', 'live_strangers', 'authority'];

/** How the app renders each domain, so the model writes matching copy. */
const DOMAIN_GUIDE = [
    'public_async   — commenting, posting, or messaging where others can see it but timing is flexible',
    'live_strangers — approaching or conversing with unfamiliar people in person, in real time',
    'authority      — direct asks of people with more status, experience, or power (founders, investors, managers)',
];

/**
 * JSON Schema for the tool/function the model is forced to call. This *is* the
 * response contract — `validate.js` can be lenient about nothing here.
 */
export const CAMPAIGN_SCHEMA = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            description:
                'Campaign name — the goal this path pursues, in 2-5 words, e.g. "Build a founder network". ' +
                'Sentence case, under 48 characters, no trailing period, no quotes. Never the opening words ' +
                'of the ambition, and never a description of the friction.',
        },
        missions: {
            type: 'array',
            minItems: 8,
            maxItems: 10,
            description: 'The mission path, ordered easiest to hardest. Level 1 is the baseline action.',
            items: {
                type: 'object',
                properties: {
                    level: {
                        type: 'integer',
                        minimum: 1,
                        description: 'Position in the path, 1-based and gapless.',
                    },
                    title: {
                        type: 'string',
                        description: 'Short imperative name for the mission. Under 60 characters, no trailing period.',
                    },
                    description: {
                        type: 'string',
                        description: 'One or two sentences describing exactly what the user does.',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 2,
                        maxItems: 3,
                        description: 'Two or three one-word qualifiers, e.g. ["Public", "No pitch"].',
                    },
                    domain: {
                        type: 'string',
                        enum: DOMAINS,
                        description: 'Which flavour of friction this mission tests.',
                    },
                    context: {
                        type: 'string',
                        description:
                            'Single line describing the setting and the risk, in the app\'s format: ' +
                            '"Public async · Low social risk · ~5 minutes".',
                    },
                    tip: {
                        type: 'string',
                        description: 'One practical, concrete hint for making the mission easier. Not a platitude.',
                    },
                },
                required: ['level', 'title', 'description', 'tags', 'domain', 'context', 'tip'],
                additionalProperties: false,
            },
        },
    },
    required: ['name', 'missions'],
    additionalProperties: false,
};

export const TOOL_NAME = 'emit_campaign';

/**
 * Builds the system prompt for one generation.
 *
 * Deliberately parameterised rather than a frozen string: the friction and the
 * ambition are the whole input, and the instruction to respect the baseline as
 * Level 1 is what makes the generated path feel like a continuation of the
 * user's own declared starting point rather than a generic ladder.
 */
export function systemPrompt() {
    return [
        'You are the Threshold Mission Planner.',
        '',
        'Threshold helps someone approach an ambition they find intimidating by turning it into a',
        'progressive path of real-world exposure missions. The user is not looking for advice or',
        'affirmations — they want a concrete sequence of things to actually do, each one slightly',
        'harder than the last, and the last one is the ambition itself, done for real.',
        '',
        'The destination — settle this before you build anything:',
        '',
        `1. The final mission must BE the ambition, restated as one concrete action the user performs. If the ambition is "present my work at the quarterly all-hands", the last mission is that presentation: the real agenda, the real room, the real audience.`,
        `2. The path ends there. Never append a follow-up, a written recap, a reflection, a review, a celebration, or an "ask what comes next" step. Admin is not a level, and a tidy ending is not a mission.`,
        `3. Do not spend the ambition early. If a mission already is the ambition, it is the last one — never level 7 with later levels continuing past it.`,
        `4. Every other mission must be a rehearsal for, or a strictly smaller version of, that same final scene. Before keeping any mission, ask whether it moves the user toward that exact moment. If it does not, cut it.`,
        '',
        'The name — what this path is for, in 2-5 words:',
        '',
        `1. Name the goal itself, not the user's sentence. "Build a founder network", "Speak up in meetings", "Cold outreach to strangers".`,
        `2. Never reuse the opening words of the ambition, never restate the friction, and never mention how the user feels. The ambition text is the input; the name is the destination.`,
        `3. Sentence case, under 48 characters, no trailing period, no quotation marks. Name the action, not the person: "Write in public" beats "A better networker".`,
        '',
        'The path — 8 to 10 missions, easiest first, building to the ambition:',
        '',
        `1. Produce 8 to 10 missions, ordered from easiest to hardest. Level numbers must be gapless starting at 1.`,
        `2. Level 1 must BE the user's declared baseline action — same action, and keep their wording where it is already specific. Do not substitute an easier warm-up.`,
        `3. The last level is the ambition. Decide that mission first, then work backwards: each earlier mission is the believable step before the one after it, and no step may jump.`,
        `4. Escalate inside the ambition's own scenario. Do not import unrelated social-fitness tasks — practising on baristas, shop staff, or strangers who have nothing to do with the goal. They are off-theme unless the ambition itself is about strangers.`,
        `5. Write for the user's actual friction. The missions should repeatedly place them in front of the specific discomfort they described, not around it.`,
        `6. Every mission must be achievable by one person, alone, within a day, with no special access, money, or credentials.`,
        `7. Be specific and concrete. "Comment on a founder post" is usable; "engage more with your network" is not.`,
        `8. Never suggest anything illegal, deceptive, harassing, or that would damage the user's reputation. No spam, no mass-messaging, no misleading claims.`,
        `9. Do not include motivational filler. Every sentence should describe something the user does.`,
        '',
        'Domain values — choose the one that genuinely fits each mission. The three label the friction;',
        'they are not a fixed ladder to climb, and the ambition decides what the final mission carries:',
        ...DOMAIN_GUIDE.map((line) => `  ${line}`),
        '',
        'The `context` field must follow this exact shape, with the same separator character:',
        '  "Public async · Low social risk · ~5 minutes"',
        '',
        'Call the emit_campaign function with the name and the completed path. Do not reply with prose.',
    ].join('\n');
}

/**
 * The user turn: the three onboarding answers, quoted so the model treats them
 * as data rather than as instructions to follow.
 */
export function userPrompt(seed) {
    return [
        'The user wrote the following during onboarding.',
        '',
        '<ambition>',
        seed.ambition,
        '</ambition>',
        '',
        '<friction>',
        seed.friction,
        '</friction>',
        '',
        '<baseline>',
        seed.baseline,
        '</baseline>',
        '',
        'Build the path.',
    ].join('\n');
}

/**
 * Appended after a failed validation, so the model can correct itself. Feeding
 * back the specific failure is far more effective than a bare "try again".
 */
export function repairPrompt(reason) {
    return [
        'Your previous output was rejected by the schema validator:',
        '',
        reason,
        '',
        'Return the complete corrected path via emit_campaign. Do not explain the fix.',
    ].join('\n');
}
