import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, FooterActions, Screen } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S09 — Mission path reveal.
 *
 * Shows the generated path before the user commits to Home, so the campaign
 * feels like a plan rather than an opaque queue. Levels beyond the next few are
 * summarised rather than listed to avoid overwhelming the reveal.
 */
export default function PathRevealScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { campaign } = useApp();
    const missions = campaign?.missions ?? [];
    const preview = missions.slice(0, 5);
    const remaining = Math.max(0, missions.length - preview.length);

    return (
        <>
            <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
                <Text variant="subhead" weight="600" center>
                    Your mission path
                </Text>
            </View>
            <Screen topInset={false}>
                <Subtitle>
                    {missions.length} progressive missions from your baseline toward{' '}
                    {campaign?.label.toLowerCase()}.
                </Subtitle>

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
    header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
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
