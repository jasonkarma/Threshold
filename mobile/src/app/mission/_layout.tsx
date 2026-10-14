import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

/**
 * The mission loop is presented as a modal stack over the tabs: pre-rating →
 * in progress → debrief → result. Closing it always returns to Home, so the
 * user never lands back inside a finished mission.
 */
export default function MissionLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.void },
                animation: 'slide_from_bottom',
            }}>
            {/* A live mission should not be dismissed by an accidental swipe. */}
            <Stack.Screen name="[missionId]/in-progress" options={{ gestureEnabled: false }} />
        </Stack>
    );
}
