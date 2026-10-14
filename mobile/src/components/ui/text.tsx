/**
 * Typographic primitives.
 *
 * Mirrors the `.title`, `.subtitle`, `.kicker` … classes in
 * `mockups/css/components.css` so screen code reads the same as the HTML did.
 */
import React from 'react';
import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, fonts, type } from '@/theme/tokens';

export type TextVariant =
    | 'display'
    | 'title'
    | 'headline'
    | 'subhead'
    | 'body'
    | 'label'
    | 'caption'
    | 'micro'
    | 'mono'
    | 'monoLarge'
    | 'kicker'
    | 'wordmark';

type Props = TextProps & {
    variant?: TextVariant;
    color?: string;
    weight?: TextStyle['fontWeight'];
    center?: boolean;
    style?: StyleProp<TextStyle>;
};

const VARIANTS: Record<TextVariant, TextStyle> = {
    display: { fontSize: type.display, fontWeight: '700', lineHeight: type.display * 1.1 },
    title: { fontSize: type.title, fontWeight: '700', lineHeight: type.title * 1.15 },
    headline: { fontSize: type.headline, fontWeight: '600', lineHeight: type.headline * 1.25 },
    subhead: { fontSize: type.subhead, fontWeight: '600', lineHeight: type.subhead * 1.3 },
    body: { fontSize: type.body, lineHeight: type.body * 1.45 },
    label: { fontSize: type.small, fontWeight: '500' },
    caption: { fontSize: type.caption, lineHeight: type.caption * 1.45 },
    micro: { fontSize: type.micro, fontWeight: '500' },
    mono: { fontSize: type.small, fontFamily: fonts.mono },
    monoLarge: { fontSize: type.title, fontFamily: fonts.mono, fontWeight: '700' },
    kicker: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: colors.amber,
    },
    wordmark: { fontSize: 34, fontWeight: '800', letterSpacing: 4.5, textTransform: 'uppercase' },
};

export function Text({
    variant = 'body',
    color,
    weight,
    center,
    style,
    ...rest
}: Props) {
    const base = VARIANTS[variant];
    return (
        <RNText
            {...rest}
            style={[
                { color: color ?? (variant === 'kicker' ? colors.amber : colors.snow) },
                base,
                weight ? { fontWeight: weight } : null,
                center ? { textAlign: 'center' } : null,
                style,
            ]}
        />
    );
}

/** Secondary copy — the `.subtitle` / `.fog` pair from the mock-ups. */
export function Subtitle({ style, ...rest }: Props) {
    return (
        <Text
            variant="body"
            color={colors.fog}
            style={[{ fontSize: type.small + 1, lineHeight: (type.small + 1) * 1.5 }, style]}
            {...rest}
        />
    );
}

export type { TextStyle };
