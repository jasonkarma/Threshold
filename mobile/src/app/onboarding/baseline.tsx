import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackHeader, Button, Chip, ChipRow, FooterActions, Screen, TextField } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

const SUGGESTIONS = ['Like a founder post', 'Write a public comment', 'Reply in a Discord', 'Send a short DM'];

/**
 * S07 — Onboarding step 3 of 3: the baseline.
 *
 * The baseline anchors Level 1, so the generated path always starts inside the
 * user's current comfort zone instead of assuming any.
 */
export default function BaselineScreen() {
    const router = useRouter();
    const { seed, updateSeed } = useApp();
    const [text, setText] = useState(seed.baseline);

    const generate = () => {
        const baseline = text.trim() || seed.baseline;
        updateSeed({ baseline });
        router.push('/onboarding/generating');
    };

    return (
        <>
            <BackHeader title="Baseline action" fallback="/onboarding/friction" />
            <Screen topInset={false} contentStyle={styles.content}>
                <View style={styles.intro}>
                    <Text variant="micro" color={colors.fog} style={styles.step}>
                        STEP 3 OF 3
                    </Text>
                    <Text variant="title" style={styles.heading}>
                        What&rsquo;s a tiny action you can already do?
                    </Text>
                    <Subtitle>
                        This anchors Level 1 so missions expand from your real comfort zone.
                    </Subtitle>
                </View>

                <TextField
                    label="Baseline"
                    value={text}
                    onChangeText={setText}
                    placeholder="e.g. Comment thoughtfully on one founder's post"
                />

                <ChipRow>
                    {SUGGESTIONS.map((s) => (
                        <Chip key={s} label={s} active={text === s} onPress={() => setText(s)} />
                    ))}
                </ChipRow>

                <FooterActions>
                    <Button label="Generate my mission path" onPress={generate} disabled={!text.trim()} />
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
