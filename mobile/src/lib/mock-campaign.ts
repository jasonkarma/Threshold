/**
 * Demo campaign content.
 *
 * This is the stand-in for the LLM generator: given an onboarding seed it
 * returns a 10-level exposure path. `FRICTION_DOMAIN_BY_LEVEL` and the mission
 * copy mirror the sample campaign in `plans/threshold-mockups-plan.md` so the
 * native app and the HTML mock-ups show the same story.
 */
import type { Campaign, CampaignSeed, FrictionDomain, Mission } from './types';

export const DEMO_SEED: CampaignSeed = {
    ambition: 'Network with startup founders and build real relationships in the ecosystem',
    friction:
        "Fear of awkward cold approaches — I talk myself out of introducing myself because I assume I'll seem irrelevant or needy.",
    baseline: 'Comment thoughtfully on one founder’s public post',
};

type MissionSeed = Omit<Mission, 'id' | 'status'>;

const MISSIONS: MissionSeed[] = [
    {
        level: 1,
        title: 'Meaningful comment on a founder post',
        description:
            'Open X or LinkedIn, find one founder post, and leave a specific comment that adds value. Do not pitch yourself.',
        tags: ['Specific', 'Public', 'No pitch'],
        domain: 'public_async',
        context: 'Public async · Low social risk · ~5 minutes',
        tip: 'Name one concrete detail from their post. Specificity lowers awkwardness more than length.',
    },
    {
        level: 2,
        title: 'Send one non-ask DM',
        description:
            'Message one founder you admire and share genuine appreciation for something specific they made or wrote. Ask for nothing.',
        tags: ['Private', 'One-to-one', 'No ask'],
        domain: 'public_async',
        context: 'Private message · Low risk · ~6 minutes',
        tip: 'End the message without a question. An ask-free message is easier to send and more likely to be remembered.',
    },
    {
        level: 3,
        title: 'Ask one question in a community',
        description:
            'Post one real question in a founder Slack or Discord you already lurk in. Public, but asynchronous and on-topic.',
        tags: ['Community', 'Public', 'Async'],
        domain: 'public_async',
        context: 'Community channel · Medium visibility · ~8 minutes',
        tip: 'Ask something you actually want the answer to. Curiosity reads as confidence.',
    },
    {
        level: 4,
        title: 'Introduce yourself to one person at a meetup',
        description:
            'At an event, walk up to one person and introduce yourself. Keep it under two minutes, then you are free to leave.',
        tags: ['In person', 'Stranger', 'Two minutes'],
        domain: 'live_strangers',
        context: 'Live event · High visibility · ~3 minutes',
        tip: 'Give yourself an exit line before you walk over. Knowing how you leave removes most of the pressure.',
    },
    {
        level: 5,
        title: 'Stay for a five-minute conversation',
        description:
            'Extend one meetup introduction into a real five-minute conversation. Still no pitch — just curiosity about their work.',
        tags: ['In person', 'Extended', 'No pitch'],
        domain: 'live_strangers',
        context: 'Live event · Sustained contact · ~10 minutes',
        tip: 'Ask about the problem they are stuck on. People relax when the topic moves away from themselves.',
    },
    {
        level: 6,
        title: 'Ask a founder one follow-up question in DMs',
        description:
            'Reply to a thread from Level 2 or 3 with a genuine follow-up. This is your first two-turn exchange.',
        tags: ['Private', 'Two-turn', 'Follow-up'],
        domain: 'authority',
        context: 'Private message · Medium risk · ~8 minutes',
        tip: 'Reference the earlier conversation. Continuity is what turns a stranger into a contact.',
    },
    {
        level: 7,
        title: 'Request a 15-minute intro call',
        description:
            'Ask one founder for a short call with a clear, small scope. State why them, and offer to work around their calendar.',
        tags: ['Direct ask', 'Time-bound', '15 minutes'],
        domain: 'authority',
        context: 'Direct request · Rejection possible · ~10 minutes',
        tip: 'Name the exact thing you want to learn. Vague asks get ignored; specific ones get answered.',
    },
    {
        level: 8,
        title: 'Share your own work publicly',
        description:
            'Post something you made, with a short note on what you learned. Public exposure of your own output, not just engagement with others.',
        tags: ['Public', 'Your work', 'Visible'],
        domain: 'public_async',
        context: 'Public post · Visible to peers · ~20 minutes',
        tip: 'Include the part that did not work. Honest build notes attract the right people.',
    },
    {
        level: 9,
        title: 'Run a 10-minute conversation at a meetup',
        description:
            'Hold a sustained conversation at an event where you are steering the topic, not just responding to it.',
        tags: ['In person', 'Leading', 'Sustained'],
        domain: 'live_strangers',
        context: 'Live event · Leading · ~15 minutes',
        tip: 'Come with two topics you genuinely want to discuss. You are hosting, not performing.',
    },
    {
        level: 10,
        title: 'Pitch one person on a real collaboration',
        description:
            'Make a concrete ask of a founder — feedback, a pilot, or an introduction — and handle the answer, whatever it is.',
        tags: ['Direct ask', 'High stakes', 'Rejection possible'],
        domain: 'authority',
        context: 'Direct pitch · Outcome unknown · ~30 minutes',
        tip: 'Ask for the smallest real version first. A pilot is easier to say yes to than a partnership.',
    },
];

/** Level 1 is the user's declared baseline, so it inherits their wording. */
function withBaseline(missions: MissionSeed[], baseline: string): MissionSeed[] {
    return missions.map((m) => (m.level === 1 ? { ...m, title: baseline || m.title } : m));
}

export function buildDemoCampaign(seed: CampaignSeed = DEMO_SEED, id = 'campaign-demo'): Campaign {
    return {
        id,
        seed,
        label: shortenAmbition(seed.ambition),
        createdAt: new Date().toISOString(),
        activeLevel: 1,
        missions: withBaseline(MISSIONS, seed.baseline).map((m, index) => ({
            ...m,
            id: `m${m.level}`,
            status: index === 0 ? 'active' : 'locked',
        })),
    };
}

/** "Network with startup founders and build real relationships…" → "Network with startup founders". */
export function shortenAmbition(ambition: string): string {
    const trimmed = ambition.trim();
    if (!trimmed) return 'Your campaign';
    const [firstClause] = trimmed.split(/\s+(?:and|so|to|that)\s+/i);
    const label = (firstClause || trimmed).replace(/[.,;:]$/, '');
    return label.length > 48 ? `${label.slice(0, 45).trimEnd()}…` : label;
}

/** Rotating status lines for the generating screen (mirrors S08). */
export const GENERATION_STEPS = [
    'Breaking goal into levels…',
    'Calibrating exposure curve…',
    'Sequencing real-world missions…',
    'Locking Level 1 to your baseline…',
] as const;

export const DOMAIN_BY_LEVEL: Record<number, FrictionDomain> = MISSIONS.reduce(
    (acc, m) => ({ ...acc, [m.level]: m.domain }),
    {} as Record<number, FrictionDomain>,
);
