import { Tabs } from 'expo-router';

import { TabBar } from '@/components/ui';
import { colors } from '@/theme/tokens';

/**
 * The three root tabs (Home · Capability · Settings). The bar is rendered by our
 * own `TabBar` so the chrome matches the mock-ups exactly on iOS, Android and
 * the browser. Campaign management lives behind a modal, not a fourth tab.
 */
export default function TabsLayout() {
    return (
        <Tabs
            tabBar={() => <TabBar />}
            screenOptions={{
                headerShown: false,
                sceneStyle: { backgroundColor: colors.void },
            }}>
            <Tabs.Screen name="home" options={{ title: 'Home' }} />
            <Tabs.Screen name="progress" options={{ title: 'Capability' }} />
            <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
        </Tabs>
    );
}
