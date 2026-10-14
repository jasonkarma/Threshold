/**
 * Buttons. Pill-shaped, matching `.btn-primary` / `.btn-secondary` /
 * `.btn-ghost` in the mock-ups.
 */
import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import { Text } from './text';
import { colors, fonts, radius, spacing, type } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type Props = {
    label: string;
    onPress?: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
    /** `ghost` buttons hug their label instead of filling the row. */
    fullWidth?: boolean;
    style?: StyleProp<ViewStyle>;
    testID?: string;
};

export function Button({
    label,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
    fullWidth,
    style,
    testID,
}: Props) {
    const isGhost = variant === 'ghost';
    const stretch = fullWidth ?? !isGhost;
    const inactive = disabled || loading;

    return (
        <Pressable
            testID={testID}
            accessibilityRole="button"
            accessibilityState={{ disabled: inactive, busy: loading }}
            disabled={inactive}
            onPress={onPress}
            style={({ pressed }) => [
                styles.base,
                variantStyles[variant],
                isGhost ? styles.ghostSize : styles.block,
                !stretch && styles.selfCenter,
                inactive && styles.inactive,
                pressed && !inactive && styles.pressed,
                style,
            ]}>
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? colors.void : colors.amber} />
            ) : (
                <Text
                    variant="label"
                    weight="600"
                    color={labelColor[variant]}
                    style={{ fontSize: type.body }}>
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

const labelColor: Record<ButtonVariant, string> = {
    primary: colors.void,
    secondary: colors.snow,
    ghost: colors.amber,
};

const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.amber },
    secondary: { borderWidth: 1, borderColor: colors.slate, backgroundColor: 'transparent' },
    ghost: { backgroundColor: 'transparent' },
};

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
        borderRadius: radius.pill,
        paddingVertical: 14,
        paddingHorizontal: spacing.xl,
        minHeight: 50,
    },
    block: { width: '100%' },
    ghostSize: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 40 },
    selfCenter: { alignSelf: 'center' },
    inactive: { opacity: 0.4 },
    pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
    monospace: { fontFamily: fonts.mono },
});
