import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, FooterActions, NavHeader, Screen, TextField } from '@/components/ui';
import { DifficultySlider } from '@/components/ui/difficulty-slider';
import { Subtitle, Text } from '@/components/ui/text';
import { missionById } from '@/lib/calibration';
import { useGoBack } from '@/lib/navigation';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S13 — Post-mission debrief.
 *
 * Both the actual-difficulty reading and a short reflection are required
 * (Story 3 acceptance criteria). The reflection is what turns a number into
 * something the user can reread the next time the same fear shows up.
 */
export default function DebriefScreen() {
    const router = useRouter();
    const { missionId } = useLocalSearchParams<{ missionId: string }>();
    const { campaign, expectedFor, completeMission } = useApp();
    const goBack = useGoBack('/(tabs)/home');

    // A bridge is stored on the campaign rather than derived here, so the copy
    // the user acted on cannot drift between screens.
    const mission = missionById(campaign, missionId);
    const expected = expectedFor(missionId);
    const [actual, setActual] = useState(30);
    const [notes, setNotes] = useState('');
    const [submitted, setSubmitted] = useState(false);

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

    const canSubmit = notes.trim().length > 0;

    const submit = () => {
        if (!canSubmit || submitted) return;
        setSubmitted(true);
        completeMission({
            missionId: mission.id,
            level: mission.level,
            missionTitle: mission.title,
            // Frozen onto the log so a later campaign deletion cannot drop this
            // mission out of the capability profile.
            domain: mission.domain,
            expectedDifficulty: expected ?? Math.round(actual),
            actualDifficulty: Math.round(actual),
            notes: notes.trim(),
            viaBridge: Boolean(mission.bridgeOf),
        });
        // The result screen resolves the debrief by the mission id it was
        // logged under, which for a bridge is the bridge's own id.
        router.replace(`/mission/${mission.id}/result`);
    };

    return (
        <>
            <NavHeader title="Debrief" onBack={goBack} />
            <Screen topInset={false} contentStyle={styles.content}>
                <View style={styles.intro}>
                    <Text variant="kicker">Level {mission.level} complete?</Text>
                    <Text variant="title" style={styles.heading}>
                        How hard was it actually?
                    </Text>
                    <Subtitle>Capture reality while it&rsquo;s fresh. Both fields required.</Subtitle>
                </View>

                <DifficultySlider label="Actual difficulty" value={actual} onChange={setActual} />

                <TextField
                    label="Quick reflection"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    placeholder="What actually happened, in one or two sentences?"
                />

                <Card variant="soft" style={styles.previous}>
                    <Text variant="caption" color={colors.fog}>
                        Previously expected
                    </Text>
                    <Text variant="monoLarge" color={colors.snow} style={styles.previousValue}>
                        {expected ?? '—'}
                    </Text>
                </Card>

                <FooterActions>
                    <Button label="Submit debrief" onPress={submit} disabled={!canSubmit} loading={submitted} />
                    {!canSubmit ? (
                        <Text variant="caption" color={colors.fog} center>
                            A reflection is required to log this mission.
                        </Text>
                    ) : null}
                </FooterActions>
            </Screen>
        </>
    );
}

const styles = StyleSheet.create({
    content: { gap: spacing.xxl, paddingTop: spacing.sm },
    intro: { gap: spacing.sm },
    heading: { fontSize: 22 },
    previous: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    previousValue: { fontSize: 20 },
});
