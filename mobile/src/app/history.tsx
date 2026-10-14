import { FlatList, StyleSheet, View } from 'react-native';

import { BackHeader, Card, LevelPill, Screen, ScoreRow } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { useApp } from '@/store/app-store';
import type { Debrief } from '@/lib/types';
import { colors, spacing } from '@/theme/tokens';

/**
 * S16 — Mission history.
 *
 * A flat reverse-chronological list of debriefs. Deliberately shows no counts
 * of skipped days — the closing copy states outright that gaps are not
 * penalised, which is the point of the whole product.
 */
export default function HistoryScreen() {
    const { debriefs } = useApp();
    const ordered = [...debriefs].reverse();

    return (
        <>
            <BackHeader title="Mission history" fallback="/(tabs)/progress" />
            <Screen scroll={false} padded={false} contentStyle={styles.content}>
                <View style={styles.intro}>
                    <Subtitle>
                        Completed actions with expected vs actual difficulty. Gaps between missions never reset your
                        progress.
                    </Subtitle>
                </View>

                <FlatList
                    data={ordered}
                    keyExtractor={(item) => item.completedAt}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => <HistoryCard debrief={item} />}
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

function HistoryCard({ debrief }: { debrief: Debrief }) {
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
            <ScoreRow
                expected={debrief.expectedDifficulty}
                actual={debrief.actualDifficulty}
                delta={debrief.expectedDifficulty - debrief.actualDifficulty}
                compact
            />
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
    listContent: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    empty: { paddingVertical: spacing.xxl, alignItems: 'center' },
});
