/**
 * Threshold design tokens.
 *
 * Ported 1:1 from `mockups/css/tokens.css` so the native app and the HTML
 * mock-ups stay visually identical. Dark-first: amber is the only loud accent.
 */
import { Platform, type ViewStyle } from 'react-native';

export const colors = {
    /* Surfaces */
    void: '#0A0A0A',
    charcoal: '#1A1A1A',
    slate: '#2A2A2A',

    /* Text */
    snow: '#F9FAFB',
    fog: '#9CA3AF',
    muted: '#6B7280',

    /* Accents */
    amber: '#F59E0B',
    amberBright: '#FBBF24',
    amberDim: '#D97706',
    success: '#10B981',
    danger: '#EF4444',
    info: '#3B82F6',

    /* Translucent accents (badges, pills, rings) */
    amberSoft: 'rgba(245, 158, 11, 0.15)',
    amberSoftStrong: 'rgba(245, 158, 11, 0.20)',
    successSoft: 'rgba(16, 185, 129, 0.15)',
    dangerSoft: 'rgba(239, 68, 68, 0.15)',
    mutedSoft: 'rgba(107, 114, 128, 0.20)',

    /* Chrome */
    chrome: 'rgba(10, 10, 10, 0.92)',
    hairline: '#2A2A2A',
} as const;

const systemStack =
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const monoStack = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export const fonts = (Platform.select({
    ios: { sans: 'System', mono: 'Menlo' },
    android: { sans: 'sans-serif', mono: 'monospace' },
    web: { sans: systemStack, mono: monoStack },
    default: { sans: 'System', mono: 'monospace' },
}) ?? { sans: 'System', mono: 'monospace' }) as { sans: string; mono: string };

/** Base unit is 4px. */
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
} as const;

/** Type scale: display / title / headline / subhead / body / small / caption / micro. */
export const type = {
    display: 40,
    title: 28,
    headline: 20,
    subhead: 17,
    body: 16,
    small: 14,
    caption: 13,
    micro: 11,
} as const;

export const shadowCard: ViewStyle = {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
};

/** Height of the custom bottom tab bar, excluding the safe-area inset. */
export const TAB_BAR_HEIGHT = 72;
