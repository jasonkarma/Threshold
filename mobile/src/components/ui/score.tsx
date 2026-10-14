/**
 * Fear-vs-reality readouts and the Frontier displays.
 *
 * There is no points total, no receipt and no near-miss countdown anywhere in
 * this file. The Frontier is a **watermark of altitude**, not a balance
 * (`plans/threshold-points-plan.md` §1).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from './text';
import { RUNGS } from '@/lib/calibration';
import { colors, radius, spacing } from '@/theme/tokens';

export function ScoreBox({
    label,
    value,
    tone = 'neutral',
    compact = false,
}: {
    label: string;
    value: string;
    tone?: 'neutral' | 'positive' | 'negative';
    compact?: boolean;
}) {
    const color =
        tone === 'positive' ? colors.success : tone === 'negative' ? colors.danger : colors.snow;

    return (
        <View style={styles.box}>
            <Text variant="micro" color={colors.fog} style={styles.boxLabel}>
                {label.toUpperCase()}
            </Text>
            <Text
                variant={compact ? 'mono' : 'monoLarge'}
                color={color}
                style={compact ? styles.boxValueCompact : styles.boxValue}>
                {value}
            </Text>
        </View>
    );
}

export function ScoreRow({
    expected,
    actual,
    delta,
    compact = false,
    /**
     * Render the signed delta in colour. Set false when the gap is *not* the
     * point — e.g. Distress Tolerance, where painting it green would read as a
     * verdict on a mission that was genuinely hard.
     */
    emphasiseDelta = true,
}: {
    expected: number;
    actual: number;
    delta: number;
    compact?: boolean;
    emphasiseDelta?: boolean;
}) {
    const deltaTone = !emphasiseDelta
        ? 'neutral'
        : delta > 0
            ? 'positive'
            : delta < 0
                ? 'negative'
                : 'neutral';

    return (
        <View style={styles.row}>
            <ScoreBox label="Expected" value={String(expected)} compact={compact} />
            <ScoreBox label="Actual" value={String(actual)} compact={compact} />
            <ScoreBox label="Delta" value={formatDelta(delta)} tone={deltaTone} compact={compact} />
        </View>
    );
}

/** Deltas always carry an explicit sign so "easier" reads unambiguously. */
export function formatDelta(delta: number): string {
    return `${delta > 0 ? '+' : ''}${delta}`;
}

/* ---------------------------------------------------------------- ring ---- */

/**
 * The Frontier ring. Unlike the old 0–100 score ring this is a *position on a
 * fixed scale* (1.0–10.0), so it takes min/max rather than a percentage, and it
 * renders a full ring with a distinct terminal treatment at the last rung.
 */
export function ThresholdRing({
    value,
    min = 1,
    max = 10,
    label,
    sublabel,
    size = 132,
}: {
    value: number;
    min?: number;
    max?: number;
    /** Large text inside the ring — normally the frontier to one decimal. */
    label: string;
    /** Small caption under it — normally the rung name. */
    sublabel?: string;
    size?: number;
}) {
    const stroke = 8;
    const radiusValue = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radiusValue;
    const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const complete = pct >= 1;

    return (
        <View style={[styles.ringWrap, { width: size, height: size }]}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radiusValue}
                    stroke={colors.slate}
                    strokeWidth={stroke}
                    fill="none"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radiusValue}
                    stroke={complete ? colors.success : colors.amber}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct)}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <View style={styles.ringLabel} pointerEvents="none">
                <Text variant="monoLarge" color={colors.snow} style={styles.ringNumber}>
                    {label}
                </Text>
                {sublabel ? (
                    <Text variant="micro" color={colors.fog} style={styles.ringCaption}>
                        {sublabel}
                    </Text>
                ) : null}
            </View>
        </View>
    );
}

/* ------------------------------------------------------------ rung rail ---- */

/**
 * Seven dots, one per rung, with the current position filled. Used in the Home
 * campaign strip, where it needs to be glanceable and passive.
 *
 * Deliberately **not** a progress bar: the frontier can lag the path position,
 * and rendering it as a percentage would misstate it.
 */
export function RungRail({ rungIndex }: { rungIndex: number }) {
    return (
        <View style={styles.rail}>
            {RUNGS.map((rung) => {
                const reached = rung.index <= rungIndex;
                const current = rung.index === rungIndex;
                return (
                    <View
                        key={rung.name}
                        style={[
                            styles.railDot,
                            reached && styles.railDotReached,
                            current && styles.railDotCurrent,
                        ]}
                    />
                );
            })}
        </View>
    );
}

/**
 * The full rung ladder for S15: a map, not a progress bar. Every name is shown
 * so the user can see what the next one costs, and reached rungs are marked.
 */
export function FrontierLadder({ rungIndex, frontier }: { rungIndex: number; frontier: number }) {
    return (
        <View style={styles.ladder}>
            {RUNGS.map((rung, index) => {
                const reached = rung.index <= rungIndex;
                const current = rung.index === rungIndex;
                const last = index === RUNGS.length - 1;

                return (
                    <View key={rung.name} style={styles.ladderItem}>
                        <View style={styles.ladderRail}>
                            <View
                                style={[
                                    styles.ladderDot,
                                    reached && styles.ladderDotReached,
                                    current && styles.ladderDotCurrent,
                                ]}
                            />
                            {!last ? (
                                <View style={[styles.ladderConnector, reached && styles.ladderConnectorReached]} />
                            ) : null}
                        </View>

                        <View style={[styles.ladderBody, last && styles.ladderBodyLast]}>
                            <Text
                                variant="subhead"
                                color={reached ? colors.snow : colors.muted}
                                weight={current ? '700' : '600'}>
                                {rung.name}
                            </Text>
                            {current ? (
                                <Text variant="caption" color={colors.fog}>
                                    {rung.blurb}
                                </Text>
                            ) : (
                                <Text variant="micro" color={colors.muted}>
                                    {rung.floor.toFixed(1)}+
                                </Text>
                            )}
                        </View>
                    </View>
                );
            })}

            <Text variant="caption" color={colors.fog} style={styles.ladderFootnote}>
                You&rsquo;re at {frontier.toFixed(1)} on a 1.0–10.0 scale. The number is the highest level of friction
                you can currently walk into and hold — it never goes down.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing.md },
    box: {
        flex: 1,
        backgroundColor: colors.void,
        borderWidth: 1,
        borderColor: colors.slate,
        borderRadius: radius.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        gap: 6,
    },
    boxLabel: { letterSpacing: 0.5 },
    boxValue: { fontSize: 22 },
    boxValueCompact: { fontSize: 18 },
    ringWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
    ringLabel: { position: 'absolute', alignItems: 'center' },
    ringNumber: { fontSize: 30 },
    ringCaption: { letterSpacing: 0.6, marginTop: 2 },

    rail: { flexDirection: 'row', gap: 5, alignItems: 'center' },
    railDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.slate,
        backgroundColor: 'transparent',
    },
    railDotReached: { backgroundColor: colors.muted, borderColor: colors.muted },
    railDotCurrent: { backgroundColor: colors.amber, borderColor: colors.amber, width: 9, height: 9, borderRadius: 5 },

    ladder: { gap: 0 },
    ladderItem: { flexDirection: 'row', gap: spacing.md },
    ladderRail: { width: 16, alignItems: 'center' },
    ladderDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.slate,
        backgroundColor: colors.void,
        marginTop: 4,
    },
    ladderDotReached: { borderColor: colors.muted, backgroundColor: colors.muted },
    ladderDotCurrent: { borderColor: colors.amber, backgroundColor: colors.amber },
    ladderConnector: { flex: 1, width: 2, backgroundColor: colors.slate, minHeight: spacing.lg },
    ladderConnectorReached: { backgroundColor: colors.muted },
    ladderBody: { flex: 1, paddingBottom: spacing.lg, gap: 2 },
    ladderBodyLast: { paddingBottom: spacing.xs },
    ladderFootnote: { marginTop: spacing.sm },
});
