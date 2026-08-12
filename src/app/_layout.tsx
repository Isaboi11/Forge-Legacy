import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ForgeSplash } from '@/components/forge-splash';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { CoachBubble } from '@/components/forge/CoachBubble';
import { OverlayBoundary } from '@/components/overlay-boundary';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ProfileProvider, useProfile } from '@/lib/profile';
import { PushProvider } from '@/lib/push';
import { SettingsProvider } from '@/lib/settings';
import { EntitlementProvider } from '@/lib/entitlement';
import { routeFor } from '@/lib/route-for';
import { WorkoutSessionProvider } from '@/hooks/useWorkoutSession';
import { ShareProvider } from '@/hooks/useShareSheet';
import { CeremonyProvider } from '@/hooks/useCeremony';
import { TourProvider } from '@/hooks/useTour';
import { TourAnchorProvider } from '@/hooks/useTourAnchors';

/**
 * Root layout — a Stack over the whole app. The `(tabs)` group holds the 5-tab shell; every
 * other route (`post/[id]`, `workout`, `ceremony-harness`, …) is a Stack sibling that presents
 * OVER the tabs with NO tab bar — the full-screen takeover Post Detail + the active workout need.
 * `post/[id]` and `workout` use a full-screen-modal presentation; the rest are default cards.
 *
 * The overlay providers (ceremony queue / first-time tour / share sheet / workout session) wrap the
 * Stack so every route — tabbed or pushed — sees them. TourProvider sits inside CeremonyProvider so its
 * unlock ceremony can defer to a live one (never stack over an earned moment), and inside
 * TourAnchorProvider so a tour run can be filtered to the cards actually mounted on screen.
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
    /*
     * ⚠ THE ROOT SAFE-AREA PROVIDER, AND IT IS LOAD-BEARING — added after shipping an OTA that would not
     * launch on device.
     *
     * `useSafeAreaInsets()` THROWS without a provider above it ("No safe area value available"), and until
     * now nothing needed one at this level: every screen gets a provider from react-navigation's own
     * `SafeAreaProviderCompat` INSIDE the navigator, and the only other thing rendered beside the navigator
     * — the splash overlay — uses no context at all. `CoachBubble` is the first component to live out here
     * AND ask for insets, so it threw on first render and took the whole app with it.
     *
     * It never showed on web: `react-native-safe-area-context` has a DOM implementation that reads real
     * metrics instead of throwing, so the web build was fine and the device build was blank. Anything
     * rendered outside the navigator needs this — that is the general rule, not a one-off patch.
     *
     * `initialWindowMetrics` supplies the values synchronously so the first frame is not laid out at zero
     * and then jumped.
     */
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <ProfileProvider>
        {/*
          ⚠ MOVED INSIDE `ProfileProvider` — it used to sit outside it, and that was the bug behind
          "notifications get sent but clicking them breaks" (PO, 2026-08-09).

          The old comment said the tap is answered "as soon as the route tree exists". It fired as soon as
          a SESSION existed, which is earlier: `RootNavigator` renders `BootLoading` and declares NO
          screens at all until `routeFor` resolves to 'app', and that waits on the profile. So a cold-start
          tap pushed `/squad/xyz` at a moment when `/squad/[id]` was not in the tree — the same
          "a screen is gated by being DECLARED" rule `route-guard.test.mjs` exists for, hit from the other
          side. Push now reads the same decision the navigator does and holds the target until it matches. */}
        <PushProvider>
          <SettingsProvider>
          {/* Entitlement (0145). Inside `SettingsProvider` for no ordering reason — it depends only on
              the session — but ABOVE `CeremonyProvider`, which is load-bearing: M-7 is a ceremony, and a
              cap gate that fires it has to be able to read the tier from inside the queue.

              ⚠ It never throws when absent (`useEntitlementState` returns `unknown` instead of raising),
              so a surface rendered outside this tree degrades to "blocked, with a retry" rather than to a
              launch crash. That is the lesson from the crash the CoachBubble boundary above records. */}
          <EntitlementProvider>
          <WorkoutSessionProvider>
            <ShareProvider>
              <CeremonyProvider>
                <TourAnchorProvider>
                  <TourProvider>
                    <AnimatedSplashOverlay />
                    <RootNavigator />
                    {/* Outside the Stack, like the splash above it, so it floats over every route rather
                        than being re-mounted per screen. It gates its own visibility — a live workout, a
                        ceremony, the tour and the signed-out routes all hide it (see CoachBubble).

                        ⚠ INSIDE A BOUNDARY, and that is not belt-and-braces — it is the lesson from the
                        launch crash above. A decoration rendered on every screen must never be able to
                        take the app down: if the bubble throws, the bubble disappears and everything else
                        still works. The safe-area fix removes today's cause; this removes the category. */}
                    <OverlayBoundary>
                      <CoachBubble />
                    </OverlayBoundary>
                    {/* Product-usage events (0131, P-6-Amendment-001). Renders nothing; it is here
                        rather than inside the Stack because inside it would remount on every
                        navigation and lose its flush timer and queue each time. Same position as the
                        bubble above, which is the spot already proven to have router context.

                        ⚠ INSIDE A BOUNDARY for the same reason the bubble is: a thing mounted on every
                        screen must never be able to take the app down. Measuring the product may not
                        degrade using it. */}
                    <OverlayBoundary>
                      <AnalyticsTracker />
                    </OverlayBoundary>
                  </TourProvider>
                </TourAnchorProvider>
              </CeremonyProvider>
            </ShareProvider>
          </WorkoutSessionProvider>
          </EntitlementProvider>
          </SettingsProvider>
        </PushProvider>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
    </SafeAreaProvider>
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
  // Hold the SPLASH while auth/profile resolve — never a flash of the wrong destination, and never a
  // second picture either. This used to be a bronze `ActivityIndicator` on `flColor.base`, which meant
  // the launch showed the carved pillars, then took them away, then showed a spinner on a slightly
  // different dark. `ForgeSplash` is the native splash reproduced in JS, so a slow read now looks like
  // the app still opening rather than like a different screen that arrived first.
  if (route === 'splash') return <BootLoading />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={route === 'app'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="squad/[id]" />
        <Stack.Screen name="squad/[id]/goal" />
        <Stack.Screen name="squad-settings" />
        <Stack.Screen name="squad-invite" />
        <Stack.Screen name="squad-transfer" />
        <Stack.Screen name="discover-squads" />
        <Stack.Screen name="squad-preview" />
        <Stack.Screen name="squad-requests" />
        <Stack.Screen name="inbox" />
        <Stack.Screen name="squad-recap/[id]" />
        <Stack.Screen name="weekly-review/[week]" />
        <Stack.Screen name="squad-records" />
        <Stack.Screen name="competitions" />
        <Stack.Screen name="create-challenge" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="challenge/[id]" />
        <Stack.Screen name="challenge-results/[id]" />
        <Stack.Screen name="podium/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="hall-of-champions" />
        <Stack.Screen name="current-champions" />
        <Stack.Screen name="competition-history" />
        <Stack.Screen name="trophy-case" />
        <Stack.Screen name="add-friend" />
        <Stack.Screen name="squad-post/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="squad-composer" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="workout-invite" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="train-invite" options={{ presentation: 'fullScreenModal' }} />
        {/* The other direction (0121): asking to join a session already under way. */}
        <Stack.Screen name="workout-join" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="legacy-timeline" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="add-photo" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="transformation" />
        <Stack.Screen name="transformation/[id]" />
        <Stack.Screen name="transformation-add" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="transformation-compare" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="share-config" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        {/* Progress Photo Post — reached from the squad composer and from a Transformation entry's Share. */}
        <Stack.Screen name="progress-photo-post" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="create-squad" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="join-squad" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="athlete/[id]" />
        <Stack.Screen name="honors" />
        <Stack.Screen name="program/[id]" />
        <Stack.Screen name="activity-history" />
        <Stack.Screen name="activity/[id]" />
        <Stack.Screen name="exercise/[id]" />
        <Stack.Screen name="exercise-library" />
        {/* W-28, both modes off one route: `?id` present is EDIT, absent is CREATE. */}
        <Stack.Screen name="custom-exercise" />
        <Stack.Screen name="templates" />
        <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="log-activity" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="exercise-picker" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="program-builder" options={{ presentation: 'fullScreenModal' }} />
        {/* The coach. Declared here because a route is gated by being DECLARED, not by existing — see the
            note below. It presents over the tabs: the bubble is reachable from every screen, so the thing
            it opens must not push a card onto whichever stack happened to be underneath. */}
        <Stack.Screen name="coach" options={{ presentation: 'fullScreenModal' }} />
        {/* Sending a program, and receiving one (0110). DECLARED, not merely present — the auth guard
            gates by declaration, and an undeclared route is an ungated one (the 2026-08-01 audit). */}
        <Stack.Screen name="send-program" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="program-share/[id]" />
        <Stack.Screen name="workout-builder" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="workout-complete" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="pin-video" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />

        {/*
         * These fourteen were reachable while SIGNED OUT until now, and the reason is worth stating
         * because it is not obvious: a route is gated by being DECLARED here, not by existing.
         * expo-router builds the route tree from the filesystem; `withLayoutContext` is called without
         * `useOnlyUserDefinedScreens`, so every file route is included, and `useSortedScreens` then
         * removes only the names collected into `protectedScreens` — which is populated ONLY from
         * screens declared inside a `<Stack.Protected>` whose guard is false. A screen nobody listed
         * is never in that set, so the guard cannot exclude it.
         *
         * Nothing leaked: RLS plus a null `auth.uid()` meant the reads came back empty. But a logged-out
         * visitor got a fully-chromed, empty Goals / Progress Hub / Friends / Settings on the public
         * domain instead of the sign-in screen.
         *
         * ADD EVERY NEW SCREEN HERE. `src/app/__tests__/route-guard.test.mjs` fails if one is missed.
         */}
        <Stack.Screen name="goals" />
        <Stack.Screen name="progress-hub" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="accomplishments" />
        <Stack.Screen name="chapter/[id]" />
        {/* Declared bare, with no `options`, on purpose: these already render with the navigator's
            defaults today, and a guard fix must not quietly restyle a screen's presentation. */}
        <Stack.Screen name="chapter/reflect" />
        <Stack.Screen name="template/[id]" />
        <Stack.Screen name="starter-template/[id]" />
        <Stack.Screen name="forge-templates" />
        <Stack.Screen name="home-gym" />
        <Stack.Screen name="account-settings" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="profile-visibility" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="community" />
        {/* NOT orphaned — this comment used to say it was, and the dashboard still repeats that. It has
            one inbound link: the Progress Hub's "See every rank" closer (`progress-hub.tsx`), added when
            that screen stopped withholding the requirements. Reached as Legacy → rank badge → Progress
            Hub → here. */}
        <Stack.Screen name="rank-progression" />
        {/* Operator dashboard (0129/0130). Declared for the same reason as everything above it — a route
            is gated by being DECLARED, not by existing — but note what this declaration is and is not.
            It keeps a SIGNED-OUT visitor off the URL. It does NOT keep a signed-in athlete off it, and
            it was never meant to: expo-router compiles every route into the bundle and `web.output` is
            "static", so /admin exists as a public file on forgelegacy.expo.app regardless. The real gate
            is `admin_guard()` in Postgres, which raises 42501 for anyone not in `app_admins`; the screen
            additionally redirects on a failed `isAppAdmin()` so a curious athlete gets Home rather than
            seven error states. See Docs/Admin-Analytics-Architecture-v1.0.md §4. */}
        <Stack.Screen name="admin" />
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

/**
 * Boot hold — the splash, still up, while the boot router resolves (session × onboarded).
 *
 * It is the same picture the OS was already showing and the same one Home holds behind its own first
 * paint, so the three phases of a cold launch are one unbroken frame. There is nothing to spin: the
 * athlete is not waiting on a task they started, they are waiting on the app to open, and an app that is
 * opening looks like its splash screen.
 */
function BootLoading() {
  return <ForgeSplash />;
}
