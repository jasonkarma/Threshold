/**
 * Layout scaffolding: the screen frame, nav header, loading pulse and the
 * amber threshold mark used on the splash and welcome screens.
 */
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './text';
import { useGoBack } from '@/lib/navigation';
import { colors, radius, spacing, TAB_BAR_HEIGHT } from '@/theme/tokens';

/* ------------------------------------------------------------- Screen ----- */

type ScreenProps = {
    children: React.ReactNode;
    /** Set when a bottom tab bar is rendered, so content clears it. */
    hasTabBar?: boolean;
    /** Wrap content in a scroll view (default) or render it in a fixed column. */
    scroll?: boolean;
    /** Content alignment inside the scroll view. */
    contentStyle?: StyleProp<ViewStyle>;
    /** Disable the horizontal screen padding for edge-to-edge rows. */
    edgeToEdge?: boolean;
    padded?: boolean;
    /**
     * Apply the top safe-area inset. Leave on for screens with no nav header
     * (tab screens, splash, path reveal); turn off when a `NavHeader` is already
     * consuming the inset, otherwise the content drops twice.
     */
    topInset?: boolean;
};

export function Screen({
    children,
    hasTabBar = false,
    scroll = true,
    contentStyle,
    edgeToEdge = false,
    padded = true,
    topInset = true,
}: ScreenProps) {
    const insets = useSafeAreaInsets();
    const bottomPad = (hasTabBar ? TAB_BAR_HEIGHT : 0) + insets.bottom + spacing.xl;

    const body = (
        <View
            style={[
                styles.content,
                padded && !edgeToEdge && styles.contentPadding,
                // contentStyle comes before the insets so a screen cannot
                // accidentally push its own content under the status bar.
                contentStyle,
                { paddingBottom: bottomPad },
                topInset ? { paddingTop: insets.top + spacing.md } : null,
            ]}>
            {children}
        </View>
    );

    return (
        <View style={[styles.screen, { backgroundColor: colors.void }]}>
            {scroll ? (
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    {body}
                </ScrollView>
            ) : (
                body
            )}
        </View>
    );
}

/* --------------------------------------------------------- Nav header ----- */

export function NavHeader({
    title,
    /** Omit to render a spacer instead of a back button (first step of a flow). */
    onBack,
    right,
}: {
    title?: string;
    onBack?: () => void;
    right?: React.ReactNode;
}) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.navHeader, { paddingTop: insets.top + spacing.sm }]}>
            {onBack ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    onPress={onBack}
                    hitSlop={8}
                    style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}>
                    <Text variant="body" color={colors.snow} style={styles.backGlyph}>
                        ←
                    </Text>
                </Pressable>
            ) : (
                // A silent slot, not a button: it only keeps the title centred.
                // The mock-ups hide this affordance entirely (S09/S14), so
                // drawing a bordered circle here reads as a broken control.
                <View style={styles.headerSlot} />
            )}

            {title ? (
                <Text variant="subhead" weight="600" numberOfLines={1} style={styles.navTitle}>
                    {title}
                </Text>
            ) : (
                <View style={styles.navTitle} />
            )}

            <View style={styles.headerSlot}>{right}</View>
        </View>
    );
}

/**
 * Header whose back button pops the stack, or jumps to `fallback` when there is
 * nothing to pop (deep link, web refresh). Without the fallback the button is a
 * dead control — `router.back()` does not throw when it cannot go back.
 */
export function BackHeader({
    title,
    disabled,
    fallback,
}: {
    title?: string;
    disabled?: boolean;
    /** Where an empty history should land. Defaults to the tabs. */
    fallback?: Href;
}) {
    const goBack = useGoBack(fallback ?? '/(tabs)/home');
    if (disabled) return <NavHeader title={title} />;
    return <NavHeader title={title} onBack={goBack} />;
}

/* ------------------------------------------------------------- Footer ----- */

/** Primary + secondary actions pinned below the content. */
export function FooterActions({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
    return <View style={[styles.footer, style]}>{children}</View>;
}

/* ------------------------------------------------------- Loading pulse ---- */

export function LoadingPulse({ caption }: { caption?: string }) {
    return (
        <View style={styles.pulseWrap}>
            <ActivityIndicator size="large" color={colors.amber} />
            {caption ? (
                <Text variant="caption" color={colors.fog}>
                    {caption}
                </Text>
            ) : null}
        </View>
    );
}

/* -------------------------------------------------------- Threshold mark --- */

/** The amber bar under the wordmark — the brand's "cross the line" cue. */
export function ThresholdMark({ width = 56 }: { width?: number }) {
    return <View style={[styles.mark, { width }]} />;
}

export function Wordmark({ size = 34 }: { size?: number }) {
    return (
        <View style={styles.wordmarkWrap}>
            <Text variant="wordmark" color={colors.snow} style={{ fontSize: size }}>
                Threshold
            </Text>
            <ThresholdMark />
        </View>
    );
}

/* -------------------------------------------------------------- styles ---- */

const styles = StyleSheet.create({
    screen: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    content: { flexGrow: 1, gap: spacing.lg },
    contentPadding: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    navHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.md,
    },
    headerSlot: { width: 36, height: 36 },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.slate,
        backgroundColor: colors.charcoal,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backPressed: { opacity: 0.6 },
    // Line-height is pinned so the arrow sits dead-centre in the circle on
    // Android, where the default line box pushes it low.
    backGlyph: { lineHeight: 22, includeFontPadding: false, textAlign: 'center' },
    navTitle: { flex: 1, textAlign: 'center' },
    footer: { marginTop: 'auto', paddingTop: spacing.lg, gap: 10 },
    pulseWrap: { alignItems: 'center', gap: spacing.md },
    mark: { height: 3, backgroundColor: colors.amber, borderRadius: radius.pill, marginTop: 14 },
    wordmarkWrap: { alignItems: 'center' },
    empty: {
        borderWidth: 1,
        borderColor: colors.slate,
        borderStyle: 'dashed',
        borderRadius: radius.md,
        padding: spacing.xxl,
        alignItems: 'center',
        gap: spacing.sm,
    },
});

export { radius, spacing };
