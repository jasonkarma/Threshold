import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, LevelPill, RungRail, Screen } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import {
    activeMission,
    archetypeReadout,
    formatFrontier,
    frontier,
    lastDebrief,
    nextMission,
    predictionError,
    insightFor,
} from '@/lib/calibration';
import { campaignStatus } from '@/lib/campaigns';
import { useApp } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * S10 — Home dashboard.
 *
 * The corner badge is replaced by a **campaign strip**: the rung name needs the
 * route named next to it, because `At Ease` alone is ambiguous once a user has
 * more than one path. `4.8 · At Ease` under "Speak up in meetings" is not.
 *
 * The strip is the switcher. It is tappable but visually calm — a chevron, not
 * a button. Switching is available, never suggested.
 */
export default function HomeScreen() {
    const router = useRouter();
    const { user, campaign, campaigns, debriefs, activeCampaignId } = useApp();

    const current = campaign ? activeMission(campaign, debriefs) : null;
    const upcoming = campaign ? nextMission(campaign, debriefs) : null;
    const recent = lastDebrief(debriefs);
    const progress = frontier(campaign ? debriefs.filter((d) => d.campaignId === campaign.id) : [], campaign);
    const status = campaign ? campaignStatus(campaign, debriefs, activeCampaignId) : null;

    return (
        <Screen hasTabBar>
            <View style={styles.greeting}>
                <Text variant="caption" color={colors.fog}>
                    Welcome back
                </Text>
                <Text variant="title" style={styles.name}>
                    {user?.name.split(' ')[0] ?? 'Friend'}
                </Text>
            </View>

            {campaign ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Switch campaign"
                    onPress={() => router.push('/campaigns')}
                    style={({ pressed }) => [styles.strip, pressed && styles.pressed]}>
                    <View style={styles.stripHeader}>
                        <Text variant="body" weight="600" numberOfLines={1} style={styles.stripLabel}>
                            {campaign.label}
                        </Text>
                        <Text variant="body" color={colors.fog}>
                            ⌄
                        </Text>
                    </View>

                    <View style={styles.stripMeta}>
                        <Text variant="mono" color={colors.snow}>
                            {progress.isCommitted ? '0.0' : formatFrontier(progress.value)}
                        </Text>
                        <Text variant="caption" color={colors.fog}>
                            {progress.rung.name}
                        </Text>
                        <View style={styles.stripSpacer} />
                        <Text variant="caption" color={colors.fog}>
                            {campaigns.length > 1 ? `${campaigns.length} campaigns` : 'Your path'}
                        </Text>
                    </View>

                    <RungRail rungIndex={progress.isCommitted ? -1 : progress.rung.index} />
                </Pressable>
            ) : null}

            {current ? (
                <Card>
                    <View style={styles.cardHeader}>
                        <Text variant="kicker">Active mission</Text>
                        <LevelPill label={`L${current.level}`} />
                    </View>
                    <Text variant="headline">{current.title}</Text>
                    <Subtitle>{current.description}</Subtitle>
                    <Button label="Begin mission" onPress={() => router.push(`/mission/${current.id}/pre-rating`)} />
                </Card>
            ) : (
                <Card>
                    <Text variant="kicker">
                        {status === 'completed' ? 'Campaign complete' : 'Nothing active'}
                    </Text>
                    <Text variant="headline">
                        {status === 'completed' ? 'You crossed every level.' : 'No active mission.'}
                    </Text>
                    <Subtitle>
                        {campaign
                            ? 'Start a new campaign from Settings, or switch to another path. Everything you logged carries over.'
                            : 'Sign in and complete onboarding to generate your mission path.'}
                    </Subtitle>
                </Card>
            )}

            {upcoming ? (
                <Card variant="soft" style={styles.lockedCard}>
                    <View style={styles.cardHeader}>
                        <Badge label="Locked" tone="muted" />
                        <LevelPill label={`L${upcoming.level}`} />
                    </View>
                    <Text variant="subhead">{upcoming.title}</Text>
                    <Subtitle>Unlocks after Level {upcoming.level - 1}.</Subtitle>
                </Card>
            ) : null}

            <Card variant="soft">
                <Text variant="kicker">Last recorded</Text>
                {recent ? (
                    <>
                        <Text variant="subhead">{archetypeReadout(recent).label}</Text>
                        <Subtitle>
                            {recent.outcome === 'attempted'
                                ? `You held back at Level ${recent.level}. Your next step is a lighter version — same level, smaller move.`
                                : `${insightFor(
                                    predictionError(recent.expectedDifficulty, recent.actualDifficulty),
                                )} Expected ${recent.expectedDifficulty}, lived ${recent.actualDifficulty}.`}
                        </Subtitle>
                    </>
                ) : (
                    <Subtitle>
                        No missions logged yet. Your first prediction error will show here.
                    </Subtitle>
                )}
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    greeting: { gap: spacing.xs },
    name: { fontSize: 26 },
    strip: {
        backgroundColor: colors.charcoal,
        borderWidth: 1,
        borderColor: colors.slate,
        borderRadius: radius.md,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    stripHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    stripLabel: { flex: 1 },
    stripMeta: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    stripSpacer: { flex: 1 },
    pressed: { opacity: 0.75 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lockedCard: { borderRadius: radius.md },
});
