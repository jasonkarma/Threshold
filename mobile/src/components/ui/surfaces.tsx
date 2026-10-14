/**
 * Surfaces and small status affordances: cards, badges, level pills, list rows,
 * toggles and timeline rows. Ports the corresponding classes from
 * `mockups/css/components.css`.
 */
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Subtitle, Text } from './text';
import { colors, radius, shadowCard, spacing, type } from '@/theme/tokens';

/* ---------------------------------------------------------------- Card ---- */

type CardProps = {
    children: React.ReactNode;
    /** `soft` drops the shadow for nested/secondary surfaces. */
    variant?: 'raised' | 'soft';
    style?: StyleProp<ViewStyle>;
    testID?: string;
};

export function Card({ children, variant = 'raised', style, testID }: CardProps) {
    return (
        <View testID={testID} style={[styles.card, variant === 'soft' && styles.cardSoft, style]}>
            {children}
        </View>
    );
}

/* --------------------------------------------------------------- Badge ---- */

export type BadgeTone = 'amber' | 'success' | 'muted' | 'danger';

export function Badge({ label, tone = 'amber' }: { label: string; tone?: BadgeTone }) {
    return (
        <View style={[styles.badge, badgeTones[tone]]}>
            <Text variant="micro" weight="600" color={badgeText[tone]} style={styles.badgeText}>
                {label}
            </Text>
        </View>
    );
}

const badgeTones: Record<BadgeTone, ViewStyle> = {
    amber: { backgroundColor: colors.amberSoft },
    success: { backgroundColor: colors.successSoft },
    danger: { backgroundColor: colors.dangerSoft },
    muted: { backgroundColor: colors.mutedSoft },
};

const badgeText: Record<BadgeTone, string> = {
    amber: colors.amber,
    success: colors.success,
    danger: colors.danger,
    muted: colors.fog,
};

/* ---------------------------------------------------- Level pill (L1) ---- */

export function LevelPill({ label }: { label: string }) {
    return (
        <View style={styles.levelPill}>
            <Text variant="micro" weight="700" color={colors.amber} style={styles.levelPillText}>
                {label}
            </Text>
        </View>
    );
}

/* ------------------------------------------------------------ List row ---- */

type ListRowProps = {
    title: string;
    subtitle?: string;
    /** Right-hand slot — a badge, chevron, or toggle. */
    trailing?: React.ReactNode;
    onPress?: () => void;
    titleColor?: string;
    last?: boolean;
};

export function ListRow({ title, subtitle, trailing, onPress, titleColor, last }: ListRowProps) {
    const content = (
        <>
            <View style={styles.rowBody}>
                <Text variant="body" weight="600" color={titleColor}>
                    {title}
                </Text>
                {subtitle ? (
                    <Text variant="caption" color={colors.fog} style={styles.rowSubtitle}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            {trailing}
        </>
    );

    if (!onPress) {
        return <View style={[styles.row, !last && styles.rowDivider]}>{content}</View>;
    }

    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => [styles.row, !last && styles.rowDivider, pressed && styles.rowPressed]}>
            {content}
        </Pressable>
    );
}

export function Chevron() {
    return (
        <Text variant="body" color={colors.fog}>
            ›
        </Text>
    );
}

/* -------------------------------------------------------------- Toggle ---- */

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            onPress={onToggle}
            style={[styles.toggle, on && styles.toggleOn]}>
            <View style={[styles.toggleKnob, on && styles.toggleKnobOn]} />
        </Pressable>
    );
}

export function ToggleRow({
    title,
    subtitle,
    value,
    onChange,
}: {
    title: string;
    subtitle?: string;
    value: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <View style={styles.row}>
            <View style={styles.rowBody}>
                <Text variant="body" weight="600">
                    {title}
                </Text>
                {subtitle ? (
                    <Text variant="caption" color={colors.fog} style={styles.rowSubtitle}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>
            <Toggle on={value} onToggle={() => onChange(!value)} />
        </View>
    );
}

/* --------------------------------------------------------- Section head ---- */

export function SectionTitle({ children }: { children: string }) {
    return (
        <Text variant="caption" color={colors.fog} weight="600" style={SECTION_TITLE}>
            {children}
        </Text>
    );
}

/** Inline (not in StyleSheet.create) so it is checked against `TextStyle`, not `ViewStyle`. */
const SECTION_TITLE = {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
} as const;

/* ------------------------------------------------------------- Divider ---- */

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
    return <View style={[styles.divider, style]} />;
}

/* ------------------------------------------------------------- Locked ----- */

export function LockedRow({ children }: { children: React.ReactNode }) {
    return <View style={styles.locked}>{children}</View>;
}

/* ----------------------------------------------------- Thin bar (progress) --- */

/**
 * A thin fill bar for `n of N` mission counts. Used on campaign cards, where the
 * figure is a *count of missions*, never the frontier — the frontier can lag the
 * path, so rendering it as a percentage would misstate it.
 */
export function CountBar({ value, total }: { value: number; total: number }) {
    const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
    return (
        <View style={styles.countTrack}>
            <View style={[styles.countFill, { width: `${pct * 100}%` }]} />
        </View>
    );
}

/* --------------------------------------------------------------- styles ---- */

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.charcoal,
        borderWidth: 1,
        borderColor: colors.slate,
        borderRadius: radius.md,
        padding: spacing.lg,
        gap: spacing.md,
        ...shadowCard,
    },
    cardSoft: { shadowOpacity: 0, elevation: 0 },
    badge: {
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    badgeText: { fontSize: 12 },
    levelPill: {
        minWidth: 28,
        height: 28,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: colors.amberSoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    levelPillText: { fontSize: 12 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: spacing.md,
    },
    rowBody: { flex: 1, minWidth: 0 },
    rowSubtitle: { marginTop: 2 },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.slate },
    rowPressed: { opacity: 0.7 },
    toggle: {
        width: 48,
        height: 28,
        borderRadius: radius.pill,
        backgroundColor: colors.slate,
        padding: 3,
        justifyContent: 'center',
    },
    toggleOn: { backgroundColor: colors.amber },
    toggleKnob: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.snow,
    },
    toggleKnobOn: { alignSelf: 'flex-end' },
    divider: { height: 1, backgroundColor: colors.slate, marginVertical: spacing.sm },
    locked: { opacity: 0.7 },
    countTrack: {
        height: 4,
        borderRadius: radius.pill,
        backgroundColor: colors.slate,
        overflow: 'hidden',
    },
    countFill: { height: 4, borderRadius: radius.pill, backgroundColor: colors.amber },
});

export { Subtitle, type };
