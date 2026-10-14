/**
 * Fear-vs-reality readouts: the three-box score row (S14/S16) and the
 * threshold progress ring (S15).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from './text';
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
}: {
    expected: number;
    actual: number;
    delta: number;
    compact?: boolean;
}) {
    return (
        <View style={styles.row}>
            <ScoreBox label="Expected" value={String(expected)} compact={compact} />
            <ScoreBox label="Actual" value={String(actual)} compact={compact} />
            <ScoreBox
                label="Delta"
                value={formatDelta(delta)}
                tone={delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'}
                compact={compact}
            />
        </View>
    );
}

/** Deltas always carry an explicit sign so "easier" reads unambiguously. */
export function formatDelta(delta: number): string {
    return `${delta > 0 ? '+' : ''}${delta}`;
}

export function ThresholdRing({ score, size = 120 }: { score: number; size?: number }) {
    const stroke = 8;
    const radiusValue = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radiusValue;
    const pct = Math.max(0, Math.min(100, score)) / 100;

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
                    stroke={colors.amber}
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
                    {score}
                </Text>
                <Text variant="micro" color={colors.fog} style={styles.ringCaption}>
                    SCORE
                </Text>
            </View>
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
    ringNumber: { fontSize: 28 },
    ringCaption: { letterSpacing: 1, marginTop: 2 },
});
