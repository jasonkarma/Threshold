import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BackHeader, Button, FooterActions, Screen, TextField } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { useApp } from '@/store/app-store';
import { colors, spacing } from '@/theme/tokens';

/**
 * S03 — Sign In.
 *
 * Auth is not wired up yet: submitting establishes a local demo session and
 * routes by whether a campaign already exists, which is exactly the branch the
 * real implementation will perform after a token exchange.
 */
export default function SignInScreen() {
    const router = useRouter();
    const { signIn, campaign } = useApp();
    const [email, setEmail] = useState('karma@threshold.app');
    const [password, setPassword] = useState('threshold');
    const [error, setError] = useState<string | null>(null);

    const submit = () => {
        if (!email.includes('@')) {
            setError('Enter a valid email address.');
            return;
        }
        setError(null);
        signIn({ email });
        router.replace(campaign ? '/(tabs)/home' : '/onboarding/goal');
    };

    const demo = () => {
        signIn();
        router.replace(campaign ? '/(tabs)/home' : '/onboarding/goal');
    };

    return (
        <>
            <BackHeader title="Sign In" fallback="/welcome" />
            <Screen topInset={false} contentStyle={{ paddingTop: spacing.md }}>
                <TextField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@email.com"
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                />
                <TextField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                />
                {error ? (
                    <Text variant="caption" color={colors.danger} center>
                        {error}
                    </Text>
                ) : null}
                <FooterActions>
                    <Button label="Sign In" onPress={submit} />
                    <Button label="Need an account? Sign Up" variant="ghost" onPress={() => router.replace('/sign-up')} />
                    <Button label="Continue as Demo" variant="ghost" onPress={demo} />
                </FooterActions>
            </Screen>
        </>
    );
}
