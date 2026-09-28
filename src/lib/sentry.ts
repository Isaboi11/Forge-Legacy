import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { useEffect, type ComponentType } from 'react';
import { Platform } from 'react-native';

import { dropBreadcrumb, scrubEvent, scrubSpan, type ScrubbableEvent, type ScrubbableSpan } from '@/domain/diagnostics/sentry-scrub';
import { currentAppSession } from '@/lib/app-session';

/**
 * Sentry — native crashes and source-mapped JS stacks, ALONGSIDE `0176`, never instead of it.
 *
 * `Docs/Sentry-Build-Plan.md` is the spec. PO decisions 2026-09-28: account UUID on, web on, performance
 * tracing on (sampled), Session Replay off, no screenshots, `sendDefaultPii` false, off in development.
 *
 * ══ WHAT EACH SYSTEM OWNS ══
 *
 * `0176` (`lib/diagnostics`) owns the step trail, under a privacy rule we wrote and tested, and joins to
 * `app_events`. Sentry owns what `0176` cannot see: a native crash that kills the app before any JS runs,
 * dSYM-symbolicated native stacks, and source-mapped JS stacks. Both see uncaught JS errors; the shared
 * `fl_session` tag joins the two views of one bug.
 *
 * ══ ⚠ FULLY INERT WITHOUT A DSN ══
 *
 * The DSN comes from `EXPO_PUBLIC_SENTRY_DSN` (inlined by Expo at bundle time — it is not a secret; it can
 * only SEND events). Unset — every dev machine, and every build until the PO adds it — `Sentry.init` is
 * never called: no client, no native SDK start, no handlers, no network. `captureException` without a client
 * is a no-op, which is what makes the calls from `diagnostics.ts` safe unconditionally.
 *
 * ══ THIS FILE MUST NEVER IMPORT `lib/supabase` ══
 *
 * `lib/diagnostics` imports this file and `lib/supabase` imports `lib/diagnostics`. The same cycle rule as
 * `diagnostics.ts`' own header, for the same reason: a module-init deadlock on Hermes is a launch crash.
 *
 * ══ ⛔ HEALTH DATA NEVER REACHES SENTRY ══
 *
 * Every event, transaction and span passes `domain/diagnostics/sentry-scrub.ts` (tested). Breadcrumbs are
 * off at the source (`maxBreadcrumbs: 0`, which the native SDK honours too) AND dropped in
 * `beforeBreadcrumb`, because Sentry's automatic trail records console text and request URLs — food
 * searches, ids — and the trail is `0176`'s under ER-D1.
 */

const DSN = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();

/** On in release builds and the web export that carry a DSN. Off in development, always. */
export const SENTRY_ON = !__DEV__ && DSN.length > 0;

/**
 * Share of sessions whose performance is recorded. Modest on purpose: the free plan's span quota is the
 * ceiling, and a fifth of sessions is plenty to see what is slow. Profiling stays off (not set).
 */
const TRACES_SAMPLE_RATE = 0.2;

/**
 * Performance data follows "Help improve Forge" — timings per screen are closer to usage than to a fault,
 * and the policy says turning the switch off stops them. Errors and crashes are NOT governed by it: the
 * same split as `diagnostics.setTrailEnabled` (drop the trail, keep the fault).
 */
let performanceAllowed = true;

/** Called by `diagnostics.setTrailEnabled`, i.e. by `analytics.setAnalyticsEnabled`. */
export function setSentryPerformanceEnabled(on: boolean): void {
  performanceAllowed = on;
}

function updateId(): string | null {
  try {
    return Updates.updateId ?? null;
  } catch {
    return null;
  }
}

function scrubContext() {
  let flSession: string | null = null;
  try {
    flSession = currentAppSession();
  } catch {
    /* an unknown session is not a reason to lose the report */
  }
  return { flSession, updateId: updateId() };
}

/**
 * `scrubEvent` over Sentry's own event types. The scrubber mirrors those types loosely (it has to stay
 * import-free for `node --test`), so the cast lives here, once. It mutates in place and returns the same event.
 */
function clean<E>(event: E): E {
  return scrubEvent(event as unknown as ScrubbableEvent, scrubContext()) as unknown as E;
}

/**
 * Screen-named navigation spans for expo-router. Created unconditionally (cheap, and it does nothing until
 * a client exists) so `useSentryNavigation` can register the container without a branch in render.
 */
const navigationIntegration = Sentry.reactNavigationIntegration({ enableTimeToInitialDisplay: true });

let started = false;

/**
 * Start Sentry. Idempotent, synchronous, cannot throw. Called at module level in the root layout, ABOVE
 * `startDiagnostics()`, so the handlers chain `diagnostics → Sentry → React Native` (plan §9 — the reverse
 * order can leave `0176` blind to uncaught errors).
 */
export function startSentry(): void {
  if (started || !SENTRY_ON) return;
  started = true;
  try {
    Sentry.init({
      dsn: DSN,
      enabled: true,
      // The web preview is testers only; a separate environment keeps it out of the phone's numbers.
      environment: Platform.OS === 'web' ? 'web-preview' : 'production',
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      maxBreadcrumbs: 0,
      beforeBreadcrumb: dropBreadcrumb,
      enableCaptureFailedRequests: false,
      enableUserInteractionTracing: false,
      enableLogs: false,
      // ⚠ NO trace headers on any request. Sentry's native default is every URL, which would add
      // `sentry-trace` + `baggage` to Supabase, FatSecret and Open Food Facts calls — and on the web an
      // unexpected header fails an Edge Function's CORS preflight, silently emptying the screen.
      tracePropagationTargets: [],
      tracesSampler: () => (performanceAllowed ? TRACES_SAMPLE_RATE : 0),
      integrations: [navigationIntegration],
      beforeSend: (event) => clean(event),
      // Re-checked at SEND time: the opt-out may have loaded from the server after the sample was taken.
      beforeSendTransaction: (event) => (performanceAllowed ? clean(event) : null),
      beforeSendSpan: (span) => scrubSpan(span as unknown as ScrubbableSpan) as unknown as typeof span,
      // ⛔ No `replaysSessionSampleRate` / `replaysOnErrorSampleRate` / `mobileReplayIntegration`, ever:
      // replay records the screen, and the screens show body photos, meals and health numbers.
    });
  } catch {
    /* Sentry failing to start must never be the thing that stops the app starting */
  }
}

/**
 * Forward one error `0176` caught that Sentry's own handlers never see — a `ScreenBoundary` /
 * `OverlayBoundary` catch, a failed query, a manual report. Uncaught errors and unhandled rejections are
 * NOT forwarded: Sentry's global handlers already capture those, and forwarding would double-count.
 *
 * A PostgREST rejection is a plain object; it is rebuilt as an `Error` from the already-sanitised name and
 * message, because Sentry serialises a captured plain object's keys (`details`, `hint`) into the event.
 */
export function forwardToSentry(
  error: unknown,
  report: { name: string; message: string; source: string; screen: string | null; fatal: boolean; componentStack: string | null },
): void {
  if (!started) return;
  try {
    let err: Error;
    if (error instanceof Error) err = error;
    else {
      err = new Error(report.message);
      err.name = report.name;
    }
    Sentry.captureException(err, {
      level: report.fatal ? 'fatal' : 'error',
      tags: { fl_source: report.source, ...(report.screen ? { fl_screen: report.screen } : {}) },
      ...(report.componentStack ? { contexts: { react: { componentStack: report.componentStack } } } : {}),
    });
  } catch {
    /* ⛔ called from inside a failure; see `reportError` */
  }
}

/**
 * The signed-in athlete, as a UUID and nothing else (PO decision 1) — lets Sentry rank a crash by people
 * affected. `null` on sign-out. The effect only calls out to Sentry; it sets no React state.
 */
export function useSentryUser(userId: string | null): void {
  useEffect(() => {
    if (!started) return;
    try {
      Sentry.setUser(userId ? { id: userId } : null);
    } catch {
      /* ignore */
    }
  }, [userId]);
}

/**
 * Hand the navigation container to Sentry so performance spans are named by route (`post/[id]`, never the
 * id — Sentry drops route params, and `sentry-scrub` drops them again).
 */
export function useSentryNavigation(ref: unknown): void {
  useEffect(() => {
    if (!started || !ref) return;
    try {
      navigationIntegration.registerNavigationContainer(ref);
    } catch {
      /* ignore */
    }
  }, [ref]);
}

/** For /admin's status line: whether this bundle reports to Sentry at all, and if not, why. */
export function sentryStatus(): { on: boolean; reason: string } {
  if (started) return { on: true, reason: Platform.OS === 'web' ? 'on (web preview)' : 'on' };
  if (__DEV__) return { on: false, reason: 'off in development' };
  if (!DSN) return { on: false, reason: 'off: no EXPO_PUBLIC_SENTRY_DSN in this bundle' };
  return { on: false, reason: 'off: failed to start' };
}

/** The admin test crash, part 1 (plan §8 step 1): an uncaught JS error, thrown outside any boundary. */
export function throwTestJsError(): void {
  setTimeout(() => {
    throw new Error('Forge Sentry test: JS error from /admin');
  }, 0);
}

/** The admin test crash, part 2 (plan §8 step 2): a real native crash. The app closes; Sentry sends on relaunch. */
export function triggerTestNativeCrash(): void {
  if (!started || Platform.OS === 'web') return;
  Sentry.nativeCrash();
}

/** The root component, wrapped for Sentry's profiler/touch boundary only when Sentry is on. */
export function wrapRoot<P extends Record<string, unknown>>(Root: ComponentType<P>): ComponentType<P> {
  return SENTRY_ON ? Sentry.wrap(Root) : Root;
}
