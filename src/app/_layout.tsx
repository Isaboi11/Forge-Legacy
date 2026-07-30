import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { flColor } from '@/constants/foundation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ProfileProvider, useProfile } from '@/lib/profile';
import { SettingsProvider } from '@/lib/settings';
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
          <SettingsProvider>
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
          </SettingsProvider>
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
  // Hold a calm, on-brand loading state while auth/profile resolve — never a flash of the wrong destination.
  // The animated splash overlay covers the first ~600ms on top of this; if the reads run longer, this dark
  // fill (not a blank, and not the old onboarding flash) carries through until the real route is known.
  if (route === 'splash') return <BootLoading />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={route === 'app'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="squad/[id]" />
        <Stack.Screen name="squad-settings" />
        <Stack.Screen name="squad-invite" />
        <Stack.Screen name="squad-transfer" />
        <Stack.Screen name="discover-squads" />
        <Stack.Screen name="squad-preview" />
        <Stack.Screen name="squad-requests" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="squad-recap/[id]" />
        <Stack.Screen name="squad-records" />
        <Stack.Screen name="competitions" />
        <Stack.Screen name="create-challenge" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="challenge/[id]" />
        <Stack.Screen name="challenge-results/[id]" />
        <Stack.Screen name="podium/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="hall-of-champions" />
        <Stack.Screen name="current-champions" />
        <Stack.Screen name="competition-history" />
        <Stack.Screen name="add-friend" />
        <Stack.Screen name="squad-post/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="squad-composer" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="transformation" />
        <Stack.Screen name="transformation/[id]" />
        <Stack.Screen name="transformation-add" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="transformation-compare" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="share-config" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="create-squad" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="join-squad" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="athlete/[id]" />
        <Stack.Screen name="honors" />
        <Stack.Screen name="program/[id]" />
        <Stack.Screen name="activity-history" />
        <Stack.Screen name="activity/[id]" />
        <Stack.Screen name="exercise/[id]" />
        <Stack.Screen name="exercise-library" />
        <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="log-activity" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="exercise-picker" options={{ presentation: 'fullScreenModal' }} />
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

/** Boot loading state — a dark, app-matching fill with a quiet bronze spinner, shown while the boot router
 *  resolves (session × onboarded). Replaces the old `null` so a slow read never reveals a blank or the wrong
 *  screen underneath the fading splash. */
function BootLoading() {
  return (
    <View style={styles.boot}>
      <ActivityIndicator color={flColor.bronze400} />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: flColor.base },
});
