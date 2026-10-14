import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider } from '@/store/app-store';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

/**
 * The app is dark-only by design (void black chrome, single amber accent), so
 * navigation is pinned to a dark theme rather than following the system.
 */
const thresholdTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.void,
    card: colors.charcoal,
    border: colors.slate,
    text: colors.snow,
    primary: colors.amber,
  },
};

export default function RootLayout() {
  useEffect(() => {
    // The first route renders its own brand beat (S01), so the native splash
    // can hand off immediately.
    SplashScreen.hideAsync().catch(() => { });
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <ThemeProvider value={thresholdTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.void },
              animation: 'slide_from_right',
            }}>
            <Stack.Screen name="index" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="mission" options={{ animation: 'slide_from_bottom' }} />
            {/*
              Campaigns are a switcher first: `modal` makes `/campaigns` feel like
              pulling a drawer down over Home rather than travelling to another
              section. The detail screen pushes from it as a normal card.
            */}
            <Stack.Screen name="campaigns/index" options={{ presentation: 'modal' }} />
            <Stack.Screen name="campaigns/[campaignId]" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </ThemeProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
