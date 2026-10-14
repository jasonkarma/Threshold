import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Card, FooterActions, LevelPill, Screen } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { useApp } from '@/store/app-store';
import { spacing } from '@/theme/tokens';

/** S02 — Welcome. Chooses the auth path; "Continue as Demo" seeds a session. */
export default function WelcomeScreen() {
    const router = useRouter();
    const { signIn } = useApp();

    return (
        <Screen contentStyle={styles.content}>
            <View style={styles.hero}>
                <Text variant="kicker">Threshold</Text>
                <Text variant="title">Cross the threshold.</Text>
                <Subtitle>
                    Break intimidating goals into real-world missions. Track fear vs reality — not streaks.
                </Subtitle>
            </View>

            <Card variant="soft">
                <View style={styles.pitchRow}>
                    <LevelPill label="1" />
                    <View style={styles.pitchBody}>
                        <Text variant="body" weight="600">
                            Exposure over gamification
                        </Text>
                        <Subtitle>
                            Rate how hard a mission feels before and after. Grow your actual capability map.
                        </Subtitle>
                    </View>
                </View>
            </Card>

            <FooterActions>
                <Button label="Sign Up" onPress={() => router.push('/sign-up')} />
                <Button label="Sign In" variant="secondary" onPress={() => router.push('/sign-in')} />
                <Button
                    label="Continue as Demo"
                    variant="ghost"
                    onPress={() => {
                        signIn();
                        router.replace('/onboarding/goal');
                    }}
                />
            </FooterActions>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { paddingTop: spacing.xxl },
    hero: { gap: spacing.md, marginBottom: spacing.sm },
    pitchRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    pitchBody: { flex: 1, gap: 4 },
});
