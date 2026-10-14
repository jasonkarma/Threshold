import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { BackHeader, Badge, Button, Card, LevelPill, Screen, TextField } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { archetypeReadout, formatFrontier, frontier, rungFor } from '@/lib/calibration';
import { campaignDebriefs, campaignProgress } from '@/lib/campaigns';
import { useApp } from '@/store/app-store';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * Campaign detail — rename, switch, delete.
 *
 * Read-only path view, reusing the S09 timeline. The active level is highlighted
 * *only* when this is the active campaign, so a paused card does not imply the
 * user should be acting on it.
 *
 * There is no archive: deleting already preserves every debrief and every
 * capability stat, so a separate hidden-but-kept state would add a field, a
 * toggle and a restore path to produce identical behaviour
 * (`plans/threshold-multi-campaign-plan.md` §10 decision 4).
 */
export default function CampaignDetailScreen() {
    const router = useRouter();
    const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
    const {
        campaigns,
        debriefs,
        activeCampaignId,
        activateCampaign,
        renameCampaign,
        deleteCampaign,
    } = useApp();

    const campaign = campaigns.find((c) => c.id === campaignId) ?? null;
    const [renaming, setRenaming] = useState(false);
    const [draft, setDraft] = useState(campaign?.label ?? '');

    if (!campaign) {
        return (
            <>
                <BackHeader title="Campaign" fallback="/campaigns" />
                <Screen topInset={false}>
                    <Card variant="soft">
                        <Subtitle>
                            This campaign no longer exists. Its missions are still in your history and capability
                            profile.
                        </Subtitle>
                    </Card>
                </Screen>
            </>
        );
    }

    const progress = campaignProgress(campaign, debriefs, activeCampaignId);
    const own = campaignDebriefs(campaign, debriefs);
    const current = frontier(own, campaign);
    const isActive = campaign.id === activeCampaignId;

    const saveRename = () => {
        const label = draft.trim();
        if (label) renameCampaign(campaign.id, label);
        setRenaming(false);
    };

    const confirmDelete = () => {
        const run = () => {
            deleteCampaign(campaign.id);
            if (router.canDismiss()) {
                router.dismiss();
                return;
            }
            router.replace('/campaigns');
        };

        // The confirmation states exactly what survives. That sentence is the
        // difference between a user who manages campaigns freely and one who is
        // afraid to touch anything.
        const title = 'Delete this campaign?';
        const message = `The ${progress.completions} mission${progress.completions === 1 ? '' : 's'} you logged are kept in your history and your capability profile. Only the path itself is removed.`;

        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) run();
            return;
        }
        Alert.alert(title, message, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: run },
        ]);
    };

    return (
        <>
            <BackHeader title="Campaign" fallback="/campaigns" />
            <Screen topInset={false} contentStyle={styles.content}>
                <Card>
                    {renaming ? (
                        <>
                            <TextField
                                label="Campaign name"
                                value={draft}
                                onChangeText={setDraft}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={saveRename}
                            />
                            <Button label="Save" onPress={saveRename} />
                            <Button label="Cancel" variant="ghost" onPress={() => setRenaming(false)} />
                        </>
                    ) : (
                        <>
                            <View style={styles.headerRow}>
                                <Badge
                                    label={progress.status === 'completed' ? 'Completed' : isActive ? 'Active' : 'Paused'}
                                    tone={progress.status === 'completed' ? 'success' : isActive ? 'amber' : 'muted'}
                                />
                                <Text variant="micro" color={colors.fog}>
                                    {progress.completions} of {progress.total}
                                </Text>
                            </View>
                            <Text variant="headline">{campaign.label}</Text>
                            <Pressable accessibilityRole="button" onPress={() => setRenaming(true)} hitSlop={8}>
                                <Text variant="caption" color={colors.amber}>
                                    Rename
                                </Text>
                            </Pressable>
                        </>
                    )}
                </Card>

                <View style={styles.summaryRow}>
                    <SummaryBox
                        label="Frontier"
                        value={progress.completions > 0 ? formatFrontier(current.value) : '0.0'}
                    />
                    <SummaryBox label="Rung" value={rungFor(current.value).name} />
                    <SummaryBox label="Attempts" value={String(progress.attempts)} />
                </View>

                <Card variant="soft">
                    <Text variant="kicker">The path</Text>
                    <Subtitle>
                        Levels are ordinal within this campaign only — Level 4 here is not Level 4 of another path.
                    </Subtitle>
                    {campaign.missions.map((mission, index) => {
                        const log = [...own].reverse().find((d) => d.level === mission.level);
                        const isCurrent = isActive && mission.level === campaign.activeLevel;

                        return (
                            <View
                                key={mission.id}
                                style={[styles.pathRow, index < campaign.missions.length - 1 && styles.pathDivider]}>
                                <View style={styles.pathRail}>
                                    <LevelPill label={`L${mission.level}`} />
                                </View>
                                <View style={styles.pathBody}>
                                    <Text
                                        variant="body"
                                        weight="600"
                                        color={log || isCurrent ? colors.snow : colors.muted}>
                                        {mission.title}
                                    </Text>
                                    {log ? (
                                        <Subtitle>
                                            {archetypeReadout(log).label} · expected {log.expectedDifficulty} →
                                            actual {log.actualDifficulty}
                                            {log.outcome === 'attempted' ? ' · held back' : ''}
                                        </Subtitle>
                                    ) : isCurrent ? (
                                        <Subtitle>Active now</Subtitle>
                                    ) : (
                                        <Subtitle>{mission.tags.join(' · ')}</Subtitle>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </Card>

                {!isActive ? (
                    <Button
                        label="Make active"
                        onPress={() => {
                            activateCampaign(campaign.id);
                            router.replace('/(tabs)/home');
                        }}
                    />
                ) : null}

                <Button label="Start a new campaign" variant="secondary" onPress={() => router.push('/onboarding/goal')} />
                <Button label="Delete campaign" variant="ghost" onPress={confirmDelete} style={styles.delete} />
            </Screen>
        </>
    );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.summaryBox}>
            <Text variant="micro" color={colors.fog} style={styles.summaryLabel}>
                {label.toUpperCase()}
            </Text>
            <Text variant="body" weight="700" numberOfLines={1} style={styles.summaryValue}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    content: { gap: spacing.lg, paddingTop: spacing.sm },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryRow: { flexDirection: 'row', gap: spacing.md },
    summaryBox: {
        flex: 1,
        backgroundColor: colors.void,
        borderWidth: 1,
        borderColor: colors.slate,
        borderRadius: radius.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        gap: 4,
    },
    summaryLabel: { letterSpacing: 0.5 },
    summaryValue: { fontSize: 16, textAlign: 'center' },
    pathRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
    pathDivider: { borderBottomWidth: 1, borderBottomColor: colors.slate },
    pathRail: { width: 44 },
    pathBody: { flex: 1, gap: 2 },
    delete: { marginTop: spacing.sm },
});
