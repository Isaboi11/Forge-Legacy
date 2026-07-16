import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ProfileProvider } from '@/lib/profile';
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
      <AuthProvider>
        <ProfileProvider>
          <WorkoutSessionProvider>
            <ShareProvider>
              <CeremonyProvider>
                <AnimatedSplashOverlay />
                <RootNavigator />
              </CeremonyProvider>
            </ShareProvider>
          </WorkoutSessionProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Auth gate: hold (splash) while the persisted session restores, then show the app if signed in or
 * the sign-in screen if not. A real render-order dependency on auth state — not a preview shim.
 */
function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="squad/[id]" />
        <Stack.Screen name="athlete/[id]" />
        <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="pin-video" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
