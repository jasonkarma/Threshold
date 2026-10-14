import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, ListRow, Screen, ScoreRow, ThresholdRing } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import {
    averageDelta,
    completedCount,
    domainStanding,
    frictionDomainStats,
    thresholdScore,
} from '@/lib/calibration';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S15 — Progress / threshold level.
 *
 * Growth is framed as capability, never as a streak. There is intentionally no
 * "days since last mission" figure anywhere on this screen: the plan's first
 * UX principle is that gaps between missions are not penalised.
 */
export default function ProgressScreen() {
    const router = useRouter();
    const { campaign, debriefs, level } = useApp();

    const score = thresholdScore(debriefs);
    const delta = averageDelta(debriefs);
    const stats = frictionDomainStats(debriefs, campaign);
    const recent = debriefs[debriefs.length - 1] ?? null;

    return (
        <Screen hasTabBar>
            <View style={styles.header}>
                <Text variant="kicker">Capability</Text>
                <Text variant="title" style={styles.heading}>
                    Your threshold
                </Text>
                <Subtitle>
                    Growth is measured by what you can handle now — not by unbroken streaks.
                </Subtitle>
            </View>

            <ThresholdRing score={score} />

            <View style={styles.summaryRow}>
                <SummaryBox label="Done" value={String(completedCount(debriefs))} />
                <SummaryBox
                    label="Avg Δ"
                    value={`${delta > 0 ? '+' : ''}${delta}`}
                    tone={delta > 0 ? colors.success : delta < 0 ? colors.danger : colors.snow}
                />
                <SummaryBox label="Level" value={String(level)} />
            </View>

            {recent ? (
                <Card>
                    <Text variant="kicker">Last recorded mission</Text>
                    <Text variant="subhead">{recent.missionTitle}</Text>
                    <ScoreRow
                        expected={recent.expectedDifficulty}
                        actual={recent.actualDifficulty}
                        delta={recent.expectedDifficulty - recent.actualDifficulty}
                        compact
                    />
                </Card>
            ) : null}

            <Card>
                <Text variant="kicker">Friction domains</Text>
                {stats.map((stat, index) => (
                    <ListRow
                        key={stat.domain}
                        title={stat.label}
                        subtitle={stat.blurb}
                        last={index === stats.length - 1}
                        trailing={
                            <Badge
                                label={standingLabel(domainStanding(stat))}
                                tone={domainStanding(stat) === 'rising' ? 'success' : 'muted'}
                            />
                        }
                    />
                ))}
            </Card>

            <Button label="See full history" variant="secondary" onPress={() => router.push('/history')} />
        </Screen>
    );
}

function SummaryBox({ label, value, tone }: { label: string; value: string; tone?: string }) {
    return (
        <View style={styles.summaryBox}>
            <Text variant="micro" color={colors.fog} style={styles.summaryLabel}>
                {label.toUpperCase()}
            </Text>
            <Text variant="monoLarge" color={tone ?? colors.snow} style={styles.summaryValue}>
                {value}
            </Text>
        </View>
    );
}

function standingLabel(standing: 'untested' | 'rising' | 'resistant'): string {
    if (standing === 'rising') return 'Rising';
    if (standing === 'resistant') return 'Resistant';
    return 'Untested';
}

const styles = StyleSheet.create({
    header: { gap: spacing.sm },
    heading: { fontSize: 26 },
    summaryRow: { flexDirection: 'row', gap: spacing.md },
    summaryBox: {
        flex: 1,
        backgroundColor: colors.void,
        borderWidth: 1,
        borderColor: colors.slate,
        borderRadius: 8,
        paddingVertical: spacing.md,
        alignItems: 'center',
        gap: 6,
    },
    summaryLabel: { letterSpacing: 0.5 },
    summaryValue: { fontSize: 20 },
});
