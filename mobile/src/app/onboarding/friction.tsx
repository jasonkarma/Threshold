import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackHeader, Button, Card, FooterActions, Screen, TextField } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S06 — Onboarding step 2 of 3: the friction point.
 *
 * Copy steers the user toward naming the freeze moment, because the generator
 * needs a fear to calibrate against — a skill gap gives it nothing to work with.
 */
export default function FrictionScreen() {
    const router = useRouter();
    const { seed, updateSeed } = useApp();
    const [text, setText] = useState(seed.friction);

    const continueNext = () => {
        updateSeed({ friction: text.trim() || seed.friction });
        router.push('/onboarding/baseline');
    };

    return (
        <>
            <BackHeader title="What's blocking you" fallback="/onboarding/goal" />
            <Screen topInset={false} contentStyle={styles.content}>
                <View style={styles.intro}>
                    <Text variant="micro" color={colors.fog} style={styles.step}>
                        STEP 2 OF 3
                    </Text>
                    <Text variant="title" style={styles.heading}>
                        What&rsquo;s currently holding you back?
                    </Text>
                    <Subtitle>Name the freeze moment — the fear, not the skill gap.</Subtitle>
                </View>

                <TextField
                    label="Friction point"
                    value={text}
                    onChangeText={setText}
                    multiline
                    placeholder="e.g. Fear of awkward cold approaches"
                />

                <Card variant="soft">
                    <Subtitle>
                        Be specific. &ldquo;Approaching strangers at meetups&rdquo; beats &ldquo;I&rsquo;m shy.&rdquo;
                    </Subtitle>
                </Card>

                <FooterActions>
                    <Button label="Continue" onPress={continueNext} disabled={!text.trim()} />
                </FooterActions>
            </Screen>
        </>
    );
}

const styles = StyleSheet.create({
    content: { gap: spacing.xxl, paddingTop: spacing.sm },
    intro: { gap: spacing.sm },
    step: { letterSpacing: 1.2 },
    heading: { fontSize: 24 },
});
