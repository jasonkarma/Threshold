import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Divider, FooterActions, NavHeader, Screen } from '@/components/ui';
import { DifficultySlider } from '@/components/ui/difficulty-slider';
import { Subtitle, Text } from '@/components/ui/text';
import { useGoBack } from '@/lib/navigation';
import { useApp } from '@/store/app-store';
import { colors, spacing, type } from '@/theme/tokens';

/**
 * S11 — Active mission pre-rating.
 *
 * The expected-difficulty reading is mandatory before the mission can start.
 * Without a pre-rating there is no prediction to be wrong about, and the whole
 * calibration loop has nothing to measure (Story 2 acceptance criteria).
 */
export default function PreRatingScreen() {
    const router = useRouter();
    const { missionId } = useLocalSearchParams<{ missionId: string }>();
    const { campaign, recordPreRating, expectedFor } = useApp();
    // The mission stack is a modal over the tabs, so an empty history means the
    // user landed here by deep link — Home is the only sensible place to go.
    const goBack = useGoBack('/(tabs)/home');

    const mission = campaign?.missions.find((m) => m.id === missionId) ?? null;
    const [value, setValue] = useState(expectedFor(missionId) ?? 50);

    if (!mission) {
        return (
            <>
                <NavHeader title="Mission unavailable" onBack={goBack} />
                <Screen>
                    <Subtitle>This mission is no longer part of your campaign.</Subtitle>
                </Screen>
            </>
        );
    }

    const start = () => {
        recordPreRating(mission.id, Math.round(value));
        router.push(`/mission/${mission.id}/in-progress`);
    };

    return (
        <>
            <NavHeader title="Before you go" onBack={goBack} />
            <Screen topInset={false} contentStyle={styles.content}>
                <Card>
                    <View style={styles.cardHeader}>
                        <Badge label={`Level ${mission.level}`} />
                        <Text variant="micro" color={colors.fog}>
                            {mission.tags.join(' · ')}
                        </Text>
                    </View>
                    <Text variant="headline">{mission.title}</Text>
                    <Subtitle>{mission.description}</Subtitle>
                    <Divider />
                    <Text variant="caption" color={colors.fog}>
                        <Text variant="caption" color={colors.snow} weight="700">
                            Context:{' '}
                        </Text>
                        {mission.context}
                    </Text>
                </Card>

                <DifficultySlider
                    label="Expected"
                    helper="How intimidating does this feel right now? (0 = none, 100 = freeze)"
                    value={value}
                    onChange={setValue}
                />

                <FooterActions>
                    <Button label="I'm ready — start" onPress={start} />
                    <Button label="Cancel" variant="ghost" onPress={goBack} />
                </FooterActions>
            </Screen>
        </>
    );
}

const styles = StyleSheet.create({
    content: { gap: spacing.xxl, paddingTop: spacing.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sliderLabel: { fontSize: type.title },
});
