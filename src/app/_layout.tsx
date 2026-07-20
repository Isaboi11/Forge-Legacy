import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ProfileProvider, useProfile } from '@/lib/profile';
import { routeFor } from '@/lib/route-for';
import { WorkoutSessionProvider } from '@/hooks/useWorkoutSession';
import { ShareProvider } from '@/hooks/useShareSheet';
import { CeremonyProvider } from '@/hooks/useCeremony';
import { TourProvider } from '@/hooks/useTour';

/**
 * Root layout — a Stack over the whole app. The `(tabs)` group holds the 5-tab shell; every
 * other route (`post/[id]`, `workout`, `ceremony-harness`, …) is a Stack sibling that presents
 * OVER the tabs with NO tab bar — the full-screen takeover Post Detail + the active workout need.
 * `post/[id]` and `workout` use a full-screen-modal presentation; the rest are default cards.
 *
 * The overlay providers (ceremony queue / first-time tour / share sheet / workout session) wrap the
 * Stack so every route — tabbed or pushed — sees them. TourProvider sits inside CeremonyProvider so its
 * "Take the tour?" prompt can defer to a live ceremony (never stack over an earned moment).
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
                <TourProvider>
                  <AnimatedSplashOverlay />
                  <RootNavigator />
                </TourProvider>
              </CeremonyProvider>
            </ShareProvider>
          </WorkoutSessionProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Boot router (Gate A): session × onboarded → auth / onboarding / app, held on a splash while either
 * read resolves. The decision is the pure `routeFor` (unit-tested); this only maps it to Stack.Protected
 * guards. A real render-order dependency on auth + onboarding state — not a preview shim.
 */
function RootNavigator() {
  const { session, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const route = routeFor({
    authLoading: loading,
    hasSession: !!session,
    profileLoading,
    onboardedAt: profile?.onboardedAt,
  });
  if (route === 'splash') return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={route === 'app'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="squad/[id]" />
        <Stack.Screen name="athlete/[id]" />
        <Stack.Screen name="honors" />
        <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="program-builder" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="workout-complete" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="pin-video" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={route === 'onboarding'}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={route === 'auth'}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
