import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BackHeader, Badge, Card, CountBar, Screen } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { formatFrontier, frontier, activeMission } from '@/lib/calibration';
import { campaignProgress, sortCampaigns, type CampaignProgress } from '@/lib/campaigns';
import { useApp } from '@/store/app-store';
import type { Campaign } from '@/lib/types';
import { colors, spacing } from '@/theme/tokens';

/**
 * Campaigns — the switcher.
 *
 * Presented as a **modal** over the tabs (`src/app/_layout.tsx`): pulling down a
 * drawer over Home, not travelling to another section. Tapping a card switches
 * and dismisses; the chevron goes deeper, to the read-only path view.
 *
 * Three rules on this screen, all deliberate:
 *
 * - **Only the active card shows its next mission.** A paused card showing a
 *   next step would be a bid for attention the user has not granted.
 * - **No days-idle, no "at risk", no streak.** A paused campaign is a parked
 *   plan, not a lapse. "12 days since your last mission" would reintroduce
 *   exactly the pressure the product forbids.
 * - **Completed campaigns persist on a shelf.** Seeing `9.8 · Second Nature`
 *   sitting above a new `0.0` is the visual argument that starting campaign #2
 *   did not erase campaign #1.
 */
export default function CampaignsScreen() {
    const router = useRouter();
    const { campaigns, debriefs, activeCampaignId, activateCampaign } = useApp();

    const ordered = sortCampaigns(campaigns, debriefs, activeCampaignId);

    const switchTo = (id: string) => {
        activateCampaign(id);
        if (router.canDismiss()) {
            router.dismiss();
            return;
        }
        router.replace('/(tabs)/home');
    };

    return (
        <>
            <BackHeader title="Your campaigns" fallback="/(tabs)/home" />
            <Screen topInset={false} contentStyle={styles.content}>
                {ordered.length === 0 ? (
                    <Card variant="soft">
                        <Subtitle center>No campaigns yet. Start one and it will appear here.</Subtitle>
                    </Card>
                ) : (
                    ordered.map((campaign) => (
                        <CampaignCard
                            key={campaign.id}
                            campaign={campaign}
                            progress={campaignProgress(campaign, debriefs, activeCampaignId)}
                            active={campaign.id === activeCampaignId}
                            nextTitle={
                                campaign.id === activeCampaignId
                                    ? (activeMission(campaign, debriefs)?.title ?? null)
                                    : null
                            }
                            onPress={() => switchTo(campaign.id)}
                            onOpen={() => router.push(`/campaigns/${campaign.id}`)}
                        />
                    ))
                )}

                <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push('/onboarding/goal')}
                    style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
                    <Text variant="body" weight="600" color={colors.amber}>
                        + Start a new campaign
                    </Text>
                    <Text variant="caption" color={colors.fog}>
                        A new path from your current baseline. Nothing you have logged is affected.
                    </Text>
                </Pressable>
            </Screen>
        </>
    );
}

function CampaignCard({
    campaign,
    progress,
    active,
    nextTitle,
    onPress,
    onOpen,
}: {
    campaign: Campaign;
    progress: CampaignProgress;
    active: boolean;
    nextTitle: string | null;
    onPress: () => void;
    onOpen: () => void;
}) {
    // The per-campaign frontier is what this route has climbed. It is NOT a
    // percentage of the count bar — the two can legitimately disagree.
    const own = progress.frontier;
    const rung = frontier([], { ...campaign, activeLevel: campaign.activeLevel }).rung;
    const completed = progress.status === 'completed';

    return (
        <Card style={active ? styles.activeCard : undefined}>
            <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
                <View style={styles.cardHeader}>
                    <Badge
                        label={completed ? 'Completed' : active ? 'Active' : 'Paused'}
                        tone={completed ? 'success' : active ? 'amber' : 'muted'}
                    />
                    <Text variant="micro" color={colors.fog}>
                        {progress.completions} of {progress.total}
                    </Text>
                </View>

                <Text variant="headline" style={styles.cardTitle}>
                    {campaign.label}
                </Text>

                <View style={styles.metaRow}>
                    <Text variant="mono" color={colors.snow}>
                        {completed || progress.completions > 0 ? formatFrontier(own) : '0.0'}
                    </Text>
                    <Text variant="caption" color={colors.fog}>
                        {rungName(campaign, progress, rung.name)}
                    </Text>
                </View>

                <CountBar value={progress.completions} total={progress.total} />

                {nextTitle ? (
                    <Subtitle>Next: {nextTitle}</Subtitle>
                ) : completed ? (
                    <Subtitle>Finished {formatFinished(progress.finishedAt)}</Subtitle>
                ) : null}
            </Pressable>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${campaign.label}`}
                onPress={onOpen}
                hitSlop={8}
                style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}>
                <Text variant="body" color={colors.fog}>
                    ›
                </Text>
            </Pressable>
        </Card>
    );
}

/** The rung for a campaign card is derived from that campaign's own log. */
function rungName(campaign: Campaign, progress: CampaignProgress, fallback: string): string {
    if (progress.completions === 0) return 'Committed';
    return fallback || campaign.label;
}

function formatFinished(iso: string | null): string {
    if (!iso) return 'recently';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
    content: { gap: spacing.lg, paddingTop: spacing.sm },
    activeCard: { borderColor: colors.amberDim },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { marginTop: spacing.sm },
    metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.xs },
    openButton: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButton: {
        borderWidth: 1,
        borderColor: colors.slate,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: spacing.lg,
        gap: spacing.xs,
        alignItems: 'center',
    },
    pressed: { opacity: 0.7 },
});
