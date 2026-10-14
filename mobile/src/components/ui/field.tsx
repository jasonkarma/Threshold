/**
 * Inputs: `TextField`, `TextArea` and `Chip` (the tappable suggestion pills).
 * Ports `.input` / `.textarea` / `.chip` from `mockups/css/components.css`.
 */
import React from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './text';
import { colors, radius, spacing, type } from '@/theme/tokens';

type FieldProps = TextInputProps & {
    label?: string;
    helper?: string;
    multiline?: boolean;
    error?: string;
};

export function TextField({ label, helper, multiline, error, style, ...rest }: FieldProps) {
    return (
        <View style={styles.field}>
            {label ? (
                <Text variant="caption" color={colors.fog} weight="500">
                    {label}
                </Text>
            ) : null}
            <TextInput
                {...rest}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
                placeholderTextColor={colors.muted}
                style={[
                    styles.input,
                    multiline && styles.textarea,
                    error ? styles.inputError : null,
                    style,
                ]}
            />
            {error ? (
                <Text variant="caption" color={colors.danger}>
                    {error}
                </Text>
            ) : null}
            {helper && !error ? (
                <Text variant="caption" color={colors.fog}>
                    {helper}
                </Text>
            ) : null}
        </View>
    );
}

export function Chip({
    label,
    active = false,
    onPress,
}: {
    label: string;
    active?: boolean;
    onPress?: () => void;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={onPress}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}>
            <Text variant="caption" color={active ? colors.amber : colors.fog}>
                {label}
            </Text>
        </Pressable>
    );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
    return <View style={styles.chipRow}>{children}</View>;
}

const styles = StyleSheet.create({
    field: { gap: spacing.sm, width: '100%' },
    input: {
        width: '100%',
        backgroundColor: colors.charcoal,
        borderWidth: 1,
        borderColor: colors.slate,
        borderRadius: radius.sm,
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        color: colors.snow,
        fontSize: type.body,
    },
    textarea: { minHeight: 120, paddingTop: 14 },
    inputError: { borderColor: colors.danger },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        borderWidth: 1,
        borderColor: colors.slate,
        backgroundColor: colors.charcoal,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    chipActive: { borderColor: colors.amber },
    chipPressed: { opacity: 0.7 },
});
