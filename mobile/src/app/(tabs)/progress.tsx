import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, FrontierLadder, ListRow, Screen, ThresholdRing } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { averageDelta, domainStandingLabel, formatFrontier, frontier } from '@/lib/calibration';
import { campaignProgress, capabilityProfile, sortCampaigns } from '@/lib/campaigns';
import { useApp } from '@/store/app-store';
import type { DomainCapability } from '@/lib/types';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * S15 — **Capability** (renamed from Progress).
 *
 * This is the person-level screen, and the rename is the point: it measures the
 * *user*, not one campaign's progress (`plans/threshold-multi-campaign-plan.md`
 * §6.4). Growth is framed as capability, never as a streak — there is
 * intentionally no "days since last mission" figure anywhere here.
 *
 * Two deliberate absences:
 *
 * - **No single scalar hero.** There is no one number that honestly summarises
 *   capability across routes, so the hero is counts and the domain table is the
 *   real readout.
 * - **No aggregate frontier.** Campaigns reset their frontier legitimately; the
 *   domain axis is the stable coordinate system across all of them.
 */
export default function CapabilityScreen() {
    const router = useRouter();
    const { campaigns, debriefs, activeCampaignId, campaign } = useApp();

    const profile = capabilityProfile(campaigns, debriefs);
    const delta = averageDelta(debriefs);
    const current = frontier(debriefs, campaign);
    const roster = sortCampaigns(campaigns, debriefs, activeCampaignId);

    return (
        <Screen hasTabBar>
            <View style={styles.header}>
                <Text variant="kicker">Capability</Text>
                <Text variant="title" style={styles.heading}>
                    Your threshold
                </Text>
                <Subtitle>
                    Growth is measured by what you can handle now — not by unbroken streaks. These numbers span every
                    campaign you&rsquo;ve run.
                </Subtitle>
            </View>

            <ThresholdRing
                value={current.isCommitted ? 0 : current.value}
                min={0}
                max={10}
                label={current.isCommitted ? '0.0' : formatFrontier(current.value)}
                sublabel={current.rung.name.toUpperCase()}
            />

            <View style={styles.summaryRow}>
                <SummaryBox label="Done" value={String(profile.completions)} />
                <SummaryBox label="Campaigns" value={String(profile.campaigns)} />
                <SummaryBox label="Attempts" value={String(profile.attempts)} />
            </View>

            <Card>
                <Text variant="kicker">Friction domains</Text>
                <Subtitle>
                    The stable axis across every campaign. Attempts sit beside completions because the ratio is the
                    signal — 8 done against 2 attempts reads very differently from 4 against 4.
                </Subtitle>
                {profile.domains.map((domain, index) => (
                    <DomainRow
                        key={domain.domain}
                        domain={domain}
                        last={index === profile.domains.length - 1}
                    />
                ))}
            </Card>

            <Card>
                <Text variant="kicker">Calibration</Text>
                {profile.fearWasWrong.total > 0 ? (
                    <Text variant="subhead">
                        {profile.fearWasWrong.easier} of {profile.fearWasWrong.total} missions were easier than you
                        feared.
                    </Text>
                ) : null}
                <Subtitle>
                    {profile.fearWasWrong.total > 0 &&
                        profile.fearWasWrong.easier < profile.fearWasWrong.total
                        ? `That's ${profile.fearWasWrong.easier} of ${profile.fearWasWrong.total} — and you kept going on the rest. `
                        : ''}
                    Average prediction error across completed missions:{' '}
                    <Text variant="caption" color={delta >= 0 ? colors.success : colors.fog} weight="700">
                        {delta > 0 ? '+' : ''}
                        {delta}
                    </Text>
                    . Negative means reality ran heavier than your fear predicted — that is data, not failure.
                </Subtitle>
            </Card>

            <Card variant="soft">
                <Text variant="kicker">Your rungs</Text>
                <FrontierLadder rungIndex={current.rung.index} frontier={current.value} />
            </Card>

            <Card>
                <View style={styles.rosterHeader}>
                    <Text variant="kicker">Your campaigns</Text>
                    <Text variant="micro" color={colors.fog}>
                        {roster.length}
                    </Text>
                </View>
                {roster.map((item, index) => {
                    const progress = campaignProgress(item, debriefs, activeCampaignId);
                    return (
                        <ListRow
                            key={item.id}
                            title={item.label}
                            subtitle={`${progress.completions} of ${progress.total} · ${formatFrontier(progress.frontier)} frontier`}
                            last={index === roster.length - 1}
                            trailing={
                                <Badge
                                    label={statusLabel(progress.status)}
                                    tone={progress.status === 'active' ? 'amber' : 'muted'}
                                />
                            }
                        />
                    );
                })}
                <Button
                    label="Switch campaign"
                    variant="secondary"
                    onPress={() => router.push('/campaigns')}
                />
            </Card>

            <Button label="See full history" variant="secondary" onPress={() => router.push('/history')} />
        </Screen>
    );
}

function DomainRow({ domain, last }: { domain: DomainCapability; last: boolean }) {
    const untested = domain.completions === 0 && domain.attempts === 0;

    return (
        <ListRow
            last={last}
            title={domain.label}
            subtitle={
                untested
                    ? domain.blurb
                    : [
                        `${domain.completions} done · ${domain.attempts} attempt${domain.attempts === 1 ? '' : 's'}`,
                        domain.meanExpectancyGap !== null && domain.meanExpectancyGap > 0
                            ? `reality ${domain.meanExpectancyGap} lighter than predicted`
                            : null,
                    ]
                        .filter(Boolean)
                        .join(' · ')
            }
            trailing={
                <View style={styles.domainTrailing}>
                    {untested ? (
                        <Badge label="Untested" tone="muted" />
                    ) : (
                        <>
                            {/*
                              Both figures, because they answer different questions:
                              `L{n}` is ordinal and route-relative (a citation into
                              one campaign's scale), while `Max {n}` is a cardinal
                              0–100 reading that means the same thing everywhere.
                            */}
                            <Text variant="mono" color={colors.snow}>
                                {domain.localFrontier !== null ? `L${domain.localFrontier}` : '—'}
                                {domain.maxActualHandled !== null ? (
                                    <Text variant="mono" color={colors.fog}>
                                        {'  '}Max {domain.maxActualHandled}
                                    </Text>
                                ) : null}
                            </Text>
                            <Badge
                                label={domainStandingLabel(domain.standing)}
                                tone={domain.standing === 'rising' ? 'success' : 'muted'}
                            />
                        </>
                    )}
                </View>
            }
        />
    );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.summaryBox}>
            <Text variant="micro" color={colors.fog} style={styles.summaryLabel}>
                {label.toUpperCase()}
            </Text>
            <Text variant="monoLarge" style={styles.summaryValue}>
                {value}
            </Text>
        </View>
    );
}

function statusLabel(status: 'active' | 'paused' | 'completed'): string {
    if (status === 'active') return 'Active';
    if (status === 'completed') return 'Complete';
    return 'Paused';
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
        borderRadius: radius.sm,
        paddingVertical: spacing.md,
        alignItems: 'center',
        gap: 6,
    },
    summaryLabel: { letterSpacing: 0.5 },
    summaryValue: { fontSize: 20 },
    domainTrailing: { alignItems: 'flex-end', gap: spacing.xs },
    rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
