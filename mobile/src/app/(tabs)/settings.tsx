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
import { thresholdScore } from '@/lib/calibration';
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
 * Regenerating deliberately keeps the debrief log: the user's recorded
 * evidence should survive a campaign rebuild, otherwise the progress graph
 * would be a lie.
 */
export default function SettingsScreen() {
    const router = useRouter();
    const { user, campaign, debriefs, remindersEnabled, setReminders, signOut } = useApp();

    const score = thresholdScore(debriefs);

    const confirmRegenerate = () => {
        const run = () => {
            signOut();
            router.replace('/welcome');
        };

        if (Platform.OS === 'web') {
            // Alert is a no-op on web in some browsers, so confirm via the global.
            if (typeof window !== 'undefined' && window.confirm('Regenerate your campaign? Your mission log is kept.')) {
                run();
            }
            return;
        }

        Alert.alert(
            'Regenerate campaign',
            'This rebuilds your mission path from your onboarding answers. Completion logs are kept.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Regenerate', style: 'destructive', onPress: run },
            ],
        );
    };

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
                        Campaign
                    </Text>
                    <Text variant="caption" style={styles.metaValue} numberOfLines={2}>
                        {campaign?.label ?? 'None yet'}
                    </Text>
                </View>

                <View style={styles.metaRow}>
                    <Text variant="caption" color={colors.fog}>
                        Threshold
                    </Text>
                    <Badge label={String(score)} />
                </View>
            </Card>

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
                <SectionTitle>Campaign</SectionTitle>
                <Card variant="soft">
                    <ListRow
                        title="Regenerate campaign"
                        subtitle="Keeps past completion logs"
                        trailing={<Chevron />}
                        onPress={confirmRegenerate}
                        last
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
});
