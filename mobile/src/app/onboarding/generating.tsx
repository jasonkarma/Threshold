import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, LoadingPulse, Screen } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S08 — Generating campaign.
 *
 * The wait state for LLM generation. The rotating status lines come from the
 * service itself (see `campaignService.generate`), so this screen only renders
 * whatever the service reports and then advances once the path exists.
 *
 * There is no back affordance during generation: leaving mid-flight would
 * orphan the campaign record. That is also why a failure is rendered *here*
 * rather than bouncing the user silently back to the baseline step — the only
 * way out of a dead end is an explicit retry.
 */
export default function GeneratingScreen() {
    const router = useRouter();
    const { seed, generateCampaign, generationLabel, generationError } = useApp();
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;

        let cancelled = false;
        generateCampaign()
            .then(() => {
                // Replace so the generation step never reappears on back navigation.
                if (!cancelled) router.replace('/onboarding/path-reveal');
            })
            .catch(() => {
                // Error surfaces via `generationError`; the retry button re-runs it.
            });

        return () => {
            cancelled = true;
        };
    }, [generateCampaign, router]);

    const retry = () => {
        started.current = true;
        generateCampaign()
            .then(() => router.replace('/onboarding/path-reveal'))
            .catch(() => { });
    };

    if (generationError) {
        return (
            <Screen scroll={false} topInset={false} contentStyle={styles.content}>
                <View style={styles.heading}>
                    <Text variant="title" center style={styles.title}>
                        Couldn&rsquo;t build your path
                    </Text>
                    <Subtitle center>{generationError}</Subtitle>
                </View>

                <Card variant="soft">
                    <Subtitle>
                        Your answers are saved. Retry, or go back and adjust the baseline if the mission
                        felt off.
                    </Subtitle>
                </Card>

                <View style={styles.actions}>
                    <Button label="Try again" onPress={retry} />
                    <Button
                        label="Back to baseline"
                        variant="secondary"
                        onPress={() => router.replace('/onboarding/baseline')}
                    />
                </View>
            </Screen>
        );
    }

    return (
        <Screen scroll={false} topInset={false} contentStyle={styles.content}>
            <LoadingPulse />
            <View style={styles.heading}>
                <Text variant="title" center style={styles.title}>
                    Building your path
                </Text>
                <Subtitle center>{generationLabel || 'Preparing your campaign…'}</Subtitle>
            </View>

            <Card variant="soft">
                <Subtitle>
                    <Text variant="caption" color={colors.amber} weight="600">
                        Ambition:{' '}
                    </Text>
                    {seed.ambition}
                    {'\n'}
                    <Text variant="caption" color={colors.amber} weight="600">
                        Friction:{' '}
                    </Text>
                    {seed.friction}
                    {'\n'}
                    <Text variant="caption" color={colors.amber} weight="600">
                        Baseline:{' '}
                    </Text>
                    {seed.baseline}
                </Subtitle>
            </Card>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: {
        justifyContent: 'center',
        alignItems: 'stretch',
        gap: spacing.xxl,
        paddingTop: 0,
    },
    heading: { gap: spacing.sm },
    title: { fontSize: 22 },
    actions: { gap: spacing.md },
});
