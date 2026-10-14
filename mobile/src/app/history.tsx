import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { BackHeader, Badge, Card, LevelPill, Screen, ScoreRow, Chip, ChipRow } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { archetypeReadout, classifyDebrief } from '@/lib/calibration';
import { logOwners } from '@/lib/campaigns';
import { useApp } from '@/store/app-store';
import type { Debrief } from '@/lib/types';
import { colors, spacing } from '@/theme/tokens';

/**
 * S16 — Mission history.
 *
 * Adds attribution, because a mixed list of 16 missions from three campaigns is
 * unreadable without it, and a filter so the user can read one route's story at
 * a time.
 *
 * Deliberately shows no count of skipped days — the closing copy states outright
 * that gaps are not penalised, which is the point of the whole product. Attempts
 * render distinctly and are never styled as failures.
 */
export default function HistoryScreen() {
    const { campaigns, debriefs } = useApp();
    const [filter, setFilter] = useState<string | null | 'all'>('all');

    // Chips come from campaigns present *in the log*, so a deleted campaign's
    // rows keep their own chip instead of vanishing from the filter.
    const owners = useMemo(() => logOwners(campaigns, debriefs), [campaigns, debriefs]);

    const ordered = useMemo(() => {
        const rows = [...debriefs].reverse();
        if (filter === 'all') return rows;
        return rows.filter((d) => (d.campaignId ?? null) === filter);
    }, [debriefs, filter]);

    return (
        <>
            <BackHeader title="Mission history" fallback="/(tabs)/progress" />
            <Screen scroll={false} padded={false} contentStyle={styles.content}>
                <View style={styles.intro}>
                    <Subtitle>
                        Every action you logged, with expected vs actual difficulty. Gaps between missions never reset
                        your progress.
                    </Subtitle>
                </View>

                {owners.length > 1 ? (
                    <View style={styles.filters}>
                        <ChipRow>
                            <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
                            {owners.map((owner, index) => (
                                <Chip
                                    key={owner.id ?? `orphan-${index}`}
                                    label={owner.label}
                                    active={filter === owner.id}
                                    onPress={() => setFilter(owner.id)}
                                />
                            ))}
                        </ChipRow>
                    </View>
                ) : null}

                <FlatList
                    data={ordered}
                    keyExtractor={(item) => `${item.completedAt}-${item.missionId}`}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <HistoryCard
                            debrief={item}
                            campaignName={
                                item.campaignId
                                    ? (campaigns.find((c) => c.id === item.campaignId)?.label ?? 'Deleted campaign')
                                    : 'Deleted campaign'
                            }
                        />
                    )}
                    ListEmptyComponent={
                        <Card variant="soft" style={styles.empty}>
                            <Subtitle center>
                                No missions logged yet. Your first completed mission will appear here.
                            </Subtitle>
                        </Card>
                    }
                    ListFooterComponent={
                        <Card variant="soft" style={styles.empty}>
                            <Subtitle center>
                                More history appears as you cross thresholds. No penalty for taking days between missions.
                            </Subtitle>
                        </Card>
                    }
                />
            </Screen>
        </>
    );
}

function HistoryCard({ debrief, campaignName }: { debrief: Debrief; campaignName: string }) {
    const readout = archetypeReadout(debrief);
    const attempted = classifyDebrief(debrief) === 'approach_attempt';

    return (
        <Card>
            <View style={styles.cardHeader}>
                <LevelPill label={`L${debrief.level}`} />
                <Text variant="caption" color={colors.fog}>
                    {formatWhen(debrief.completedAt)}
                </Text>
            </View>

            <Text variant="body" weight="600">
                {debrief.missionTitle}
            </Text>

            <Text variant="caption" color={colors.fog}>
                {campaignName}
            </Text>

            {attempted ? (
                <View style={styles.attemptRow}>
                    <Badge label={`⚑ ${readout.label}`} tone="muted" />
                    <Subtitle>
                        {debrief.freezeTrigger
                            ? `Held back — ${debrief.freezeTrigger.toLowerCase()}.`
                            : 'Held back. Logged as data, not a failure.'}
                    </Subtitle>
                </View>
            ) : (
                <>
                    <ScoreRow
                        expected={debrief.expectedDifficulty}
                        actual={debrief.actualDifficulty}
                        delta={debrief.expectedDifficulty - debrief.actualDifficulty}
                        compact
                        emphasiseDelta={readout.emphasiseGap}
                    />
                    <Badge label={readout.label} tone="muted" />
                </>
            )}

            <Subtitle>“{debrief.notes}”</Subtitle>
        </Card>
    );
}

function formatWhen(iso: string): string {
    const date = new Date(iso);
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return sameDay
        ? `Today · ${time}`
        : `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`;
}

const styles = StyleSheet.create({
    content: { paddingTop: spacing.sm },
    intro: { paddingHorizontal: spacing.xl },
    filters: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    listContent: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    attemptRow: { gap: spacing.sm },
    empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
});
