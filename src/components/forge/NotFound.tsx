import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBar } from '@/components/forge/composites/AppBar';
import { Button } from '@/components/forge/composites/Button';
import { flColor, flFont } from '@/constants/foundation';
import { useAuth } from '@/lib/auth';
import { isUuid } from '@/lib/plain-error';
import { useProfile } from '@/lib/profile';
import { routeFor } from '@/lib/route-for';

/**
 * ══ THE ONE "THIS ISN'T HERE" STATE (QA 09-26, B4) ══
 *
 * There were seven of these, each hand-rolled: some showed the database's own error text, some blamed
 * the athlete's connection for a mistyped link, and several had no way out at all (`/workout-complete`
 * with no id was a blank page with no header and no button).
 *
 * This is the one. A title, one plain reason, and ALWAYS a way out:
 *   · `Try again` — only when the caller passes `onRetry` (a read that failed, not a thing that is gone);
 *   · `Back` — `router.back()`, which falls back to the screen's parent when there is no history
 *     (`lib/safe-back`, installed on the shared router);
 *   · `Home` — for the link that was never going to work.
 *
 * `NotFoundBody` is the block alone, for a screen that already draws its own background and app bar.
 * `NotFoundScreen` is the whole screen, for a guard at the top of a route (`if (!isUuid(id)) return …`)
 * and for `+not-found`.
 *
 * ⚠ SIGNED OUT, "HOME" IS SIGN-IN. The tabs are behind the auth guard, and navigating to a guarded route
 * is a silent no-op — which is exactly how the two dev-harness routes came to show a blank grey page to a
 * signed-out visitor (auth-15: they redirected to `/`). So the way out is decided by the same `routeFor`
 * the boot router uses: Home when in the app, Sign In when signed out, onboarding when half-way through.
 *
 * Colour is theme roles only, so it is right on Forge and on Alabaster; no card, because there is nothing
 * to act inside of — it is a sentence and two buttons.
 */

export interface NotFoundProps {
  title: string;
  /** One plain sentence. Never an error's own message — pass `errorMessage(e)` / `plainError(e)` output. */
  reason?: string | null;
  /** Present when trying again could work (the read failed). Absent when the thing simply is not there. */
  onRetry?: () => void;
  /** Overrides where Back goes. Default: `router.back()` with the parent fallback. */
  onBack?: () => void;
  /** Hide the Home button — for a sheet or modal whose own close is the way out. */
  hideHome?: boolean;
}

/** Where "out" is for this visitor — and whether Back can go anywhere at all. */
function useWayOut(): { inApp: boolean; href: string; label: string } {
  const { session, loading, recovering } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const route = routeFor({ authLoading: loading, hasSession: !!session, profileLoading, onboardedAt: profile?.onboardedAt, recovering });
  if (route === 'auth') return { inApp: false, href: '/sign-in', label: 'Sign In' };
  if (route === 'onboarding') return { inApp: false, href: '/onboarding', label: 'Continue' };
  return { inApp: true, href: '/', label: 'Go to Home' };
}

export function NotFoundBody({ title, reason, onRetry, onBack, hideHome = false }: NotFoundProps) {
  const router = useRouter();
  const out = useWayOut();
  const back = onBack ?? (() => router.back());
  return (
    <View style={styles.body}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
      <View style={styles.actions}>
        {onRetry ? (
          <Button variant="secondary" onPress={onRetry} accessibilityLabel="Try again">
            Try Again
          </Button>
        ) : null}
        {out.inApp || onBack ? (
          <Button variant="secondary" onPress={back} accessibilityLabel="Back">
            Back
          </Button>
        ) : null}
        {hideHome && out.inApp ? null : (
          <Button variant={out.inApp ? 'text' : 'secondary'} onPress={() => router.replace(out.href as never)} accessibilityLabel={out.label}>
            {out.label}
          </Button>
        )}
      </View>
    </View>
  );
}

export function NotFoundScreen(props: NotFoundProps) {
  const router = useRouter();
  const out = useWayOut();
  return (
    <View style={styles.root}>
      <AppBar title="" onBack={props.onBack ?? (out.inApp ? () => router.back() : undefined)} />
      <NotFoundBody {...props} />
    </View>
  );
}

type RouteParams = Record<string, string | string[] | undefined>;

/** The usual check: `/thing/<id>` or `?id=<id>` must be an id the database could hold. */
export const hasId = (p: RouteParams): boolean => isUuid(p.id);

const BAD_LINK = 'The link may be old, or it was mistyped.';

/**
 * CHECK THE LINK BEFORE THE SCREEN RUNS — `export default guardRoute(Screen, hasId, { title })`.
 *
 * `/squad/abc` used to mount the whole screen, send "abc" to a `uuid` column, and print what Postgres
 * said about it. Wrapping the route means a link that cannot be right never reaches a query: the screen's
 * own hooks do not run at all, so there is nothing to guard inside it and no half-loaded state to draw.
 * A well-formed id that simply has no row is still the screen's business (its own `NotFoundBody` branch).
 */
export function guardRoute(Screen: ComponentType, ok: (params: RouteParams) => boolean, missing: { title: string; reason?: string }) {
  function GuardedRoute() {
    const params = useLocalSearchParams() as RouteParams;
    if (!ok(params)) return <NotFoundScreen title={missing.title} reason={missing.reason ?? BAD_LINK} />;
    return <Screen />;
  }
  GuardedRoute.displayName = `Guarded(${Screen.displayName ?? Screen.name ?? 'Route'})`;
  return GuardedRoute;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: flColor.base },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 48 },
  title: { fontFamily: flFont.display, fontSize: 20, lineHeight: 27, fontWeight: '600', textAlign: 'center', color: flColor.cream100 },
  reason: { marginTop: 9, maxWidth: 320, fontSize: 14, lineHeight: 21, textAlign: 'center', color: flColor.gray400 },
  // Stacked, never side by side: two wide buttons in a row push one off a narrow screen.
  actions: { marginTop: 22, alignItems: 'center', gap: 10 },
});
