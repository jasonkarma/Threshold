import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Screen, ThresholdMark } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme/tokens';

/**
 * S01 — Splash. Brand beat on cold start, then routes to the first-run or
 * returning-user path. Tapping skips the wait.
 */
export default function SplashScreenRoute() {
    const router = useRouter();
    const { user, campaign } = useApp();

    const next = !user ? '/welcome' : campaign ? '/(tabs)/home' : '/onboarding/goal';

    useEffect(() => {
        const timer = setTimeout(() => router.replace(next), 1600);
        return () => clearTimeout(timer);
    }, [next, router]);

    return (
        <Screen scroll={false} contentStyle={styles.content}>
            <View style={styles.center} onStartShouldSetResponder={() => true} onResponderRelease={() => router.replace(next)}>
                <Text variant="wordmark" color={colors.snow}>
                    Threshold
                </Text>
                <ThresholdMark />
                <Text variant="body" color={colors.fog} center style={styles.tagline}>
                    Cross the line between intention and action.
                </Text>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { alignItems: 'center', justifyContent: 'center', paddingBottom: 0 },
    center: { alignItems: 'center' },
    tagline: { marginTop: 20, maxWidth: 260 },
});
