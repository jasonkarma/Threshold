import { useRouter } from 'expo-router';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import {
    Badge,
    Card,
    Chevron,
    ListRow,
    Screen,
    SectionTitle,
    ToggleRow,
    type BadgeTone,
} from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { formatFrontier, frontier } from '@/lib/calibration';
import { sortCampaigns } from '@/lib/campaigns';
import { apiBaseUrl, apiKey, isApiConfigured } from '@/lib/config';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

const APP_VERSION = '0.1.0';

/**
 * Which campaign generator is live. Surfaced in Settings because "why is my
 * path always the same networking one?" is otherwise indistinguishable from a
 * broken backend — the answer is usually a missing `.env`.
 */
const apiStatus: { label: string; badge: string; tone: BadgeTone } = isApiConfigured
    ? {
        label: apiBaseUrl,
        badge: apiKey ? 'Live' : 'No key',
        tone: apiKey ? 'success' : 'danger',
    }
    : {
        label: 'No API URL configured — using the demo path',
        badge: 'Demo',
        tone: 'muted',
    };

/**
 * S17 — Settings / profile.
 *
 * The old **"Regenerate campaign"** row is gone. It was the single-campaign
 * workaround for wanting a different path, and it is replaced by *Start a new
 * campaign* — which is the same outcome with intact history, and which finally
 * makes its own "your logs are kept" promise true.
 */
export default function SettingsScreen() {
    const router = useRouter();
    const {
        user,
        campaigns,
        debriefs,
        activeCampaignId,
        campaign,
        remindersEnabled,
        setReminders,
        signOut,
    } = useApp();

    const current = frontier(
        campaign ? debriefs.filter((d) => d.campaignId === campaign.id) : [],
        campaign,
    );
    const roster = sortCampaigns(campaigns, debriefs, activeCampaignId);

    const confirmSignOut = () => {
        if (Platform.OS === 'web') {
            signOut();
            router.replace('/welcome');
            return;
        }

        Alert.alert('Sign out', 'You can sign back in any time.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign out',
                style: 'destructive',
                onPress: () => {
                    signOut();
                    router.replace('/welcome');
                },
            },
        ]);
    };

    return (
        <Screen hasTabBar>
            <View style={styles.header}>
                <Text variant="kicker">Account</Text>
                <Text variant="title" style={styles.heading}>
                    Settings
                </Text>
            </View>

            <Card>
                <View style={styles.identity}>
                    <View style={styles.avatar}>
                        <Text variant="body" weight="700" color={colors.amber}>
                            {user?.initials ?? 'TH'}
                        </Text>
                    </View>
                    <View style={styles.identityText}>
                        <Text variant="body" weight="700">
                            {user?.name ?? 'Guest'}
                        </Text>
                        <Text variant="caption" color={colors.fog}>
                            {user?.email ?? 'not signed in'}
                        </Text>
                    </View>
                </View>

                <View style={styles.metaRow}>
                    <Text variant="caption" color={colors.fog}>
                        Active campaign
                    </Text>
                    <Text variant="caption" style={styles.metaValue} numberOfLines={2}>
                        {campaign?.label ?? 'None yet'}
                    </Text>
                </View>

                <View style={styles.metaRow}>
                    <Text variant="caption" color={colors.fog}>
                        Frontier
                    </Text>
                    <View style={styles.metaTrailing}>
                        <Text variant="mono" color={colors.snow}>
                            {current.isCommitted ? '0.0' : formatFrontier(current.value)}
                        </Text>
                        <Badge label={current.rung.name} />
                    </View>
                </View>
            </Card>

            <View>
                <SectionTitle>Campaigns</SectionTitle>
                <Card variant="soft">
                    <ListRow
                        title="Your campaigns"
                        subtitle={
                            roster.length
                                ? `${roster.length} total · ${roster.map((c) => c.label).join(' · ')}`
                                : 'None yet'
                        }
                        trailing={<Chevron />}
                        onPress={() => router.push('/campaigns')}
                    />
                    <ListRow
                        title="Start a new campaign"
                        subtitle="A new path from your current baseline. Nothing you logged is affected."
                        trailing={<Chevron />}
                        onPress={() => router.push('/onboarding/goal')}
                        last
                    />
                </Card>
            </View>

            <View>
                <SectionTitle>Preferences</SectionTitle>
                <Card variant="soft">
                    <ToggleRow
                        title="Mission reminders"
                        subtitle="Occasional nudge for the active mission"
                        value={remindersEnabled}
                        onChange={setReminders}
                    />
                </Card>
            </View>

            <View>
                <SectionTitle>Connection</SectionTitle>
                <Card variant="soft">
                    <ListRow
                        title="Campaign service"
                        subtitle={apiStatus.label}
                        trailing={<Badge label={apiStatus.badge} tone={apiStatus.tone} />}
                        last
                    />
                </Card>
            </View>

            <View>
                <SectionTitle>Session</SectionTitle>
                <Card variant="soft">
                    <ListRow title="Sign out" trailing={<Chevron />} onPress={confirmSignOut} titleColor={colors.danger} last />
                </Card>
            </View>

            <Subtitle center>Threshold · v{APP_VERSION}</Subtitle>
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: { gap: spacing.xs },
    heading: { fontSize: 26 },
    identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    identityText: { flex: 1, gap: 2 },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.amberSoftStrong,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.lg },
    metaValue: { flex: 1, textAlign: 'right' },
    metaTrailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
