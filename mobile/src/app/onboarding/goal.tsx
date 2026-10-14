import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BackHeader, Button, Chip, ChipRow, FooterActions, Screen, TextField } from '@/components/ui';
import { Subtitle, Text } from '@/components/ui/text';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

const SUGGESTIONS = ['Networking with founders', 'Cold outreach', 'Public speaking'];

/** S05 — Onboarding step 1 of 3: the ambition. */
export default function GoalScreen() {
    const router = useRouter();
    const { seed, updateSeed } = useApp();
    const [text, setText] = useState(seed.ambition);

    const continueNext = () => {
        updateSeed({ ambition: text.trim() || seed.ambition });
        router.push('/onboarding/friction');
    };

    return (
        <>
            <BackHeader title="Your ambition" fallback="/welcome" />
            <Screen topInset={false} contentStyle={styles.content}>
                <View style={styles.intro}>
                    <Text variant="micro" color={colors.fog} style={styles.step}>
                        STEP 1 OF 3
                    </Text>
                    <Text variant="title" style={styles.heading}>
                        What high-stakes ambition are you avoiding?
                    </Text>
                    <Subtitle>Name the outcome that intimidates you — not a daily habit.</Subtitle>
                </View>

                <TextField
                    label="Ambition"
                    value={text}
                    onChangeText={setText}
                    multiline
                    placeholder="e.g. Network with startup founders"
                />

                <View style={styles.suggestions}>
                    <Text variant="caption" color={colors.fog}>
                        Suggestions
                    </Text>
                    <ChipRow>
                        {SUGGESTIONS.map((s) => (
                            <Chip
                                key={s}
                                label={s}
                                active={text.toLowerCase().includes(s.split(' ')[0].toLowerCase())}
                                onPress={() => setText(s)}
                            />
                        ))}
                    </ChipRow>
                </View>

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
    suggestions: { gap: spacing.sm },
});
