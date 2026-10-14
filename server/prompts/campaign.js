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
        'harder than the last, ending somewhere near the ambition they named.',
        '',
        'The name — what this path is for, in 2-5 words:',
        '',
        `1. Name the goal itself, not the user's sentence. "Build a founder network", "Speak up in meetings", "Cold outreach to strangers".`,
        `2. Never reuse the opening words of the ambition, never restate the friction, and never mention how the user feels. The ambition text is the input; the name is the destination.`,
        `3. Sentence case, under 48 characters, no trailing period, no quotation marks. Name the action, not the person: "Write in public" beats "A better networker".`,
        '',
        'The path — 8 to 10 missions, easiest first:',
        '',
        `1. Produce 8 to 10 missions, ordered from easiest to hardest. Level numbers must be gapless starting at 1.`,
        `2. Level 1 must BE the user's declared baseline action — same action, and keep their wording where it is already specific. Do not substitute an easier warm-up.`,
        `3. Ramp difficulty gradually. Each mission should be a believable next step from the one before it, not a jump.`,
        `4. Increase exposure across the path: begin with low-visibility or asynchronous actions, move toward in-person contact, and finish with a direct ask.`,
        `5. Every mission must be achievable by one person, alone, within a day, with no special access, money, or credentials.`,
        `6. Write for the user's actual friction. The missions should repeatedly place them in front of the specific discomfort they described, not around it.`,
        `7. Be specific and concrete. "Comment on a founder post" is usable; "engage more with your network" is not.`,
        `8. Never suggest anything illegal, deceptive, harassing, or that would damage the user's reputation. No spam, no mass-messaging, no misleading claims.`,
        `9. Do not include motivational filler. Every sentence should describe something the user does.`,
        '',
        'Domain values — choose the one that genuinely fits each mission; do not spread them evenly for',
        'their own sake:',
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
