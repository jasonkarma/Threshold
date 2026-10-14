import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, FooterActions, Screen } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { formatFrontier, frontier, rungFor } from '@/lib/calibration';
import { campaignDebriefs, campaignProgress } from '@/lib/campaigns';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

const PREVIEW_COUNT = 5;

/**
 * S09 — Mission path reveal.
 *
 * Shows the generated path before the user commits to Home, so the campaign
 * feels like a plan rather than an opaque queue. Levels beyond the next few are
 * summarised rather than listed to avoid overwhelming the reveal.
 *
 * **The carry-over line is the most important thing on this screen.** A user who
 * finishes a campaign at `9.8` and starts a second lands here showing `0.0` on a
 * brand-new path — and without this line the app appears to have erased
 * everything. It happens to exactly the most engaged users, so it names what
 * persists at the precise moment the new path appears
 * (`plans/threshold-multi-campaign-plan.md` §8.1).
 */
export default function PathRevealScreen() {
    const router = useRouter();
    const { campaign, campaigns, debriefs, activeCampaignId } = useApp();
    const missions = campaign?.missions ?? [];
    const preview = missions.slice(0, PREVIEW_COUNT);
    const remaining = Math.max(0, missions.length - preview.length);

    const isFirstCampaign = campaigns.length <= 1;
    const priorCampaigns = campaigns.filter((c) => c.id !== activeCampaignId);
    const priorCompletions = priorCampaigns.reduce(
        (sum, c) => sum + campaignProgress(c, debriefs, activeCampaignId).completions,
        0,
    );
    const domainCount = new Set(
        debriefs
            .filter((d) => (d.outcome ?? 'completed') === 'completed' && d.domain)
            .map((d) => d.domain),
    ).size;

    // The path this campaign is *leaving behind*, named so the shelf is visible.
    const finishedCampaign = priorCampaigns.find(
        (c) => campaignProgress(c, debriefs, activeCampaignId).status === 'completed',
    );
    const finishedFrontier = finishedCampaign
        ? frontier(campaignDebriefs(finishedCampaign, debriefs), finishedCampaign).value
        : null;

    return (
        <>
            <View style={styles.header}>
                <Text variant="subhead" weight="600" center>
                    Your mission path
                </Text>
            </View>
            <Screen topInset={false}>
                <Subtitle>
                    {missions.length} progressive missions from your baseline toward{' '}
                    {campaign?.label.toLowerCase()}.
                </Subtitle>

                {!isFirstCampaign ? (
                    <Card variant="soft" style={styles.carryOver}>
                        <Text variant="kicker">This carries over</Text>
                        <Text variant="subhead">
                            {priorCompletions} mission{priorCompletions === 1 ? '' : 's'}
                            {domainCount > 0 ? ` · ${domainCount} friction domain${domainCount === 1 ? '' : 's'}` : ''}
                            {priorCampaigns.length > 1 ? ` · ${priorCampaigns.length} earlier campaigns` : ''}
                        </Text>
                        <Subtitle>
                            Your capability profile spans every campaign you&rsquo;ve run. This new path starts at 0.0
                            because the route is new — not because anything was lost.
                            {finishedCampaign && finishedFrontier !== null
                                ? ` “${finishedCampaign.label}” closed at ${formatFrontier(finishedFrontier)} · ${rungFor(finishedFrontier).name}.`
                                : ''}
                        </Subtitle>
                    </Card>
                ) : null}

                <View style={styles.timeline}>
                    {preview.map((mission, index) => (
                        <View key={mission.id} style={styles.item}>
                            <View style={styles.rail}>
                                <View style={[styles.dot, index === 0 && styles.dotActive]}>
                                    <Text variant="micro" weight="700" color={index === 0 ? colors.amber : colors.fog}>
                                        {mission.level}
                                    </Text>
                                </View>
                                {index < preview.length - 1 || remaining > 0 ? <View style={styles.connector} /> : null}
                            </View>

                            <Card variant="soft" style={styles.itemCard}>
                                <Text variant="body" weight="600">
                                    {mission.title}
                                </Text>
                                <Subtitle>{mission.description.split('. ')[0]}.</Subtitle>
                            </Card>
                        </View>
                    ))}

                    {remaining > 0 ? (
                        <View style={styles.item}>
                            <View style={styles.rail}>
                                <View style={styles.dot}>
                                    <Text variant="micro" weight="700" color={colors.fog}>
                                        …
                                    </Text>
                                </View>
                            </View>
                            <Card variant="soft" style={styles.itemCard}>
                                <Subtitle>
                                    {remaining} more unlock as you complete missions and calibration updates.
                                </Subtitle>
                            </Card>
                        </View>
                    ) : null}
                </View>

                <FooterActions>
                    <Button label="Start Level 1" onPress={() => router.replace('/(tabs)/home')} />
                </FooterActions>
            </Screen>
        </>
    );
}

const styles = StyleSheet.create({
    header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, paddingTop: spacing.xxxl },
    carryOver: { borderColor: colors.amberDim },
    timeline: { gap: 0 },
    item: { flexDirection: 'row', gap: spacing.md },
    rail: { width: 28, alignItems: 'center' },
    dot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: colors.slate,
        backgroundColor: colors.charcoal,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotActive: { borderColor: colors.amber, backgroundColor: colors.amberSoft },
    connector: { flex: 1, width: 2, backgroundColor: colors.slate, minHeight: spacing.lg },
    itemCard: { flex: 1, marginBottom: spacing.lg, gap: spacing.xs },
});
