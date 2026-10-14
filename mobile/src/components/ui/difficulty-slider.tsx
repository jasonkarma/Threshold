/**
 * Difficulty rating control (0–100). Used on both the pre-rating (S11) and the
 * debrief (S13) screens, so the two readings feel like the same instrument.
 */
import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { colors, spacing, type } from '@/theme/tokens';

type Props = {
    label: string;
    value: number;
    onChange: (value: number) => void;
    /** Optional helper copy under the label. */
    helper?: string;
    minLabel?: string;
    maxLabel?: string;
    disabled?: boolean;
};

export function DifficultySlider({
    label,
    value,
    onChange,
    helper,
    minLabel = 'Easy',
    maxLabel = 'Freeze',
    disabled,
}: Props) {
    return (
        <View style={styles.wrap}>
            {helper ? (
                <Text variant="caption" color={colors.fog}>
                    {helper}
                </Text>
            ) : null}

            <View style={styles.valueRow}>
                <Text variant="caption" color={colors.fog}>
                    {label}
                </Text>
                <Text variant="monoLarge" color={colors.amber}>
                    {Math.round(value)}
                </Text>
            </View>

            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={value}
                disabled={disabled}
                onValueChange={onChange}
                minimumTrackTintColor={colors.amber}
                maximumTrackTintColor={colors.slate}
                thumbTintColor={colors.amber}
                accessibilityLabel={`${label}, ${Math.round(value)} out of 100`}
            />

            <View style={styles.scaleRow}>
                <Text variant="micro" color={colors.muted}>
                    {minLabel}
                </Text>
                <Text variant="micro" color={colors.muted}>
                    {maxLabel}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: spacing.sm },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    slider: { width: '100%', height: 40 },
    scaleRow: { flexDirection: 'row', justifyContent: 'space-between' },
    valueText: { fontSize: type.title },
});
