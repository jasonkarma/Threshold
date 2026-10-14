import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function OnboardingLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.void },
                animation: 'slide_from_right',
            }}>
            {/* Generation is a committed action — no swipe back out of it. */}
            <Stack.Screen name="generating" options={{ gestureEnabled: false }} />
            <Stack.Screen name="path-reveal" options={{ gestureEnabled: false }} />
        </Stack>
    );
}
