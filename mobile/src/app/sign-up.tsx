import { useRouter } from 'expo-router';
import { useState } from 'react';

import { BackHeader, Button, FooterActions, Screen, TextField } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { spacing } from '@/theme/tokens';

/** S04 — Sign Up. Creates a local demo session, then starts onboarding. */
export default function SignUpScreen() {
    const router = useRouter();
    const { signIn } = useApp();
    const [name, setName] = useState('Karma Chou');
    const [email, setEmail] = useState('karma@threshold.app');
    const [password, setPassword] = useState('threshold');

    const submit = () => {
        signIn({ name: name.trim() || 'Friend', email, initials: initialsFor(name) });
        router.replace('/onboarding/goal');
    };

    return (
        <>
            <BackHeader title="Create account" fallback="/welcome" />
            <Screen topInset={false} contentStyle={{ paddingTop: spacing.md }}>
                <TextField label="Name" value={name} onChangeText={setName} placeholder="Karma Chou" />
                <TextField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@email.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <TextField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                />
                <FooterActions>
                    <Button label="Create account" onPress={submit} />
                    <Button label="Already have an account? Sign In" variant="ghost" onPress={() => router.replace('/sign-in')} />
                    <Button
                        label="Continue as Demo"
                        variant="ghost"
                        onPress={() => {
                            signIn();
                            router.replace('/onboarding/goal');
                        }}
                    />
                </FooterActions>
            </Screen>
        </>
    );
}

function initialsFor(name: string): string {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('') || 'TH'
    );
}
