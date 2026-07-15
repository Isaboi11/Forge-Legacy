import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { WorkoutSessionProvider } from '@/hooks/useWorkoutSession';
import { ShareProvider } from '@/hooks/useShareSheet';
import { CeremonyProvider } from '@/hooks/useCeremony';

/**
 * Root layout — a Stack over the whole app. The `(tabs)` group holds the 5-tab shell; every
 * other route (`post/[id]`, `workout`, `ceremony-harness`, …) is a Stack sibling that presents
 * OVER the tabs with NO tab bar — the full-screen takeover Post Detail + the active workout need.
 * `post/[id]` and `workout` use a full-screen-modal presentation; the rest are default cards.
 *
 * The overlay providers (ceremony queue / share sheet / workout session) wrap the Stack so every
 * route — tabbed or pushed — sees them.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <WorkoutSessionProvider>
        <ShareProvider>
          <CeremonyProvider>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="post/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
              <Stack.Screen name="squad/[id]" />
              <Stack.Screen name="athlete/[id]" />
              <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal' }} />
            </Stack>
          </CeremonyProvider>
        </ShareProvider>
      </WorkoutSessionProvider>
    </ThemeProvider>
  );
}
