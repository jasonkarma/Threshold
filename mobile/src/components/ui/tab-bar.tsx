/**
 * Custom bottom tab bar: Home · Capability · Settings (mirrors `.tabbar`).
 *
 * "Progress" became "Capability": the screen now measures the *person* across
 * every campaign, not the progress of one path.
 *
 * Rendered once by the tabs navigator (`src/app/(tabs)/_layout.tsx`), which
 * replaces the platform bar so the app keeps the pitch-black chrome and amber
 * accent from the mock-ups on every platform, including the browser.
 *
 * Individual tab screens must NOT render this themselves — the navigator
 * already does, and a second copy stacks two bars on top of each other.
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './text';
import { colors, TAB_BAR_HEIGHT } from '@/theme/tokens';

const TABS = [
    { href: '/home', label: 'Home', icon: '⌂' },
    { href: '/progress', label: 'Capability', icon: '◎' },
    { href: '/settings', label: 'Settings', icon: '⚙' },
] as const;

export function TabBar() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {TABS.map((tab) => {
                // `pathname` is the resolved route, so a nested route inside a
                // tab still lights the right icon up.
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                return (
                    <Pressable
                        key={tab.href}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={tab.label}
                        onPress={() => router.replace(tab.href)}
                        style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
                        <Text variant="caption" color={active ? colors.amber : colors.muted} style={styles.icon}>
                            {tab.icon}
                        </Text>
                        <Text variant="micro" weight="500" color={active ? colors.amber : colors.muted}>
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        minHeight: TAB_BAR_HEIGHT,
        paddingTop: 10,
        paddingHorizontal: 24,
        backgroundColor: colors.chrome,
        borderTopWidth: 1,
        borderTopColor: colors.slate,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44 },
    pressed: { opacity: 0.6 },
    icon: { fontSize: 20, lineHeight: 22 },
});
