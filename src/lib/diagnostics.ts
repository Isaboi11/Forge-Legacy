import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

import {
  fingerprintError,
  makeCrumb,
  pushCrumb,
  sanitizeMessage,
  sanitizeName,
  sanitizeStack,
  type Crumb,
  type CrumbType,
} from '@/domain/diagnostics/breadcrumb-core';
import { currentAppSession } from '@/lib/app-session';

/**
 * The error reporter: what broke, on which build, and the path they took to get there.
 *
 * ══ WHY THIS EXISTS ══
 *
 * PO, 2026-08-21: *"catch the exact path they're going in instead of having to ask them."* The full
 * argument — and the week of wrong guesses that motivated it — is in `0176_client_errors.sql`'s header.
 * Short version: this app's characteristic failure is not a native crash (Apple already reports those),
 * it is a JS fault or a silent no-op on a device nobody can attach a debugger to.
 * `src/components/screen-boundary.tsx` has been catching those and printing them to a console nobody
 * will ever read. This is where that console now goes.
 *
 * ══ A MODULE SINGLETON, AND IT IMPORTS ALMOST NOTHING ══
 *
 * ⚠ THIS FILE MUST NEVER IMPORT `lib/supabase`, AND THE REASON IS NOT STYLE — IT IS A CYCLE.
 *
 *   `lib/supabase` imports THIS file, so a failed request can leave a `net` crumb. If this file imported
 *   it back, the two would deadlock at module-init on Hermes and the app would not launch. The same
 *   goes for `lib/analytics`, which imports supabase.
 *
 *   So the actual sending is a SINK, registered at boot by `data/errors-live.ts` via `setErrorSink()`.
 *   Until that call lands, reports queue here and flush the moment it does. That ordering is deliberate:
 *   the reporter has to be armed before the first import finishes, because the crash this project has
 *   most feared — `CoachBubble` taking the whole app down on launch — happens before anything is mounted.
 *
 * ══ EVERY EXPORT IS SYNCHRONOUS, RETURNS VOID, AND CANNOT THROW ══
 *
 * The `analytics.ts` rule, and here it is not a nicety. Every caller of `reportError` is BY DEFINITION
 * already inside a failure. A reporter that throws becomes the crash it was reporting, and a reporter
 * that awaits delays the error boundary's own render.
 *
 * ══ ⚠ THE OPT-OUT IS SPLIT, AND THE SPLIT IS THE POINT ══
 *
 * An athlete who turned off "Help improve Forge" said they do not want their usage recorded. A route
 * trail IS usage, so sending one anyway under a different table name would be exactly the back door
 * `0176`'s header refuses.
 *
 * So the opt-out drops the TRAIL and keeps the FAULT. We always learn that the app broke, where, and on
 * which build — that is a defect in our software, not a record of their behaviour. We do not learn how
 * they got there. `setTrailEnabled()` is called by `analytics.setAnalyticsEnabled()`.
 */

// ── the build this is running (read once; none of it changes at runtime) ─────

const APP_VERSION = Constants.expoConfig?.version ?? null;

const PLATFORM: 'ios' | 'android' | 'web' | null =
  Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : Platform.OS === 'web' ? 'web' : null;

/**
 * ⭐ THE OTA THIS BUNDLE IS, AND IT IS THE MOST VALUABLE FIELD IN A REPORT.
 *
 * `app_version` is 1.0.0 for every update ever published on top of build 6, so it cannot tell you
 * whether the fix you shipped an hour ago worked. `Updates.updateId` names the exact bundle, which turns
 * "I think that's fixed" into "no occurrences on `01a02293…`". Null in Expo Go and on a dev client, and
 * null on a build running its embedded bundle — all three are honest answers worth storing.
 */
function buildContext() {
  try {
    return {
      update_id: Updates.updateId ?? null,
      runtime_version: Updates.runtimeVersion ?? null,
      channel: Updates.channel ?? null,
    };
  } catch {
    // `expo-updates` throws rather than returning null when the module is unavailable in some dev
    // configurations. An unknown build is not a reason to lose the report.
    return { update_id: null, runtime_version: null, channel: null };
  }
}

function deviceContext() {
  try {
    return {
      // Model and OS only. ⚠ Deliberately NOT `Device.deviceName`, which is "Isaiah's iPhone" and
      // identifies a person rather than a configuration.
      device_model: Device.modelName ?? null,
      os_version: Device.osVersion ?? null,
    };
  } catch {
    return { device_model: null, os_version: null };
  }
}

// ── state ────────────────────────────────────────────────────────────────────

/** The trail. Bounded and repeat-collapsing — see `breadcrumb-core.pushCrumb`. */
let crumbs: Crumb[] = [];

/** The route the athlete is on, kept current by `noteRoute` so a report knows where it happened. */
let currentScreen: string | null = null;

let trailEnabled = true;
let started = false;

/**
 * Per-fingerprint send counts for THIS session.
 *
 * The server rate-limits too (30/hour per session), but by then the request has already been made. A
 * render loop throwing sixty times a second would spend the athlete's battery and bandwidth discovering
 * that the server does not want to hear it. Five of any one bug per sitting is plenty to diagnose it.
 */
const sentCounts = new Map<string, number>();
const MAX_PER_FINGERPRINT = 5;
const MAX_PER_SESSION = 25;
let sentTotal = 0;

export interface ErrorReport {
  session_id: string;
  fingerprint: string;
  name: string;
  message: string;
  stack: string | null;
  component_stack: string | null;
  screen: string | null;
  source: 'global' | 'boundary' | 'overlay' | 'rejection' | 'query' | 'manual';
  fatal: boolean;
  breadcrumbs: Crumb[];
  platform: 'ios' | 'android' | 'web' | null;
  app_version: string | null;
  update_id: string | null;
  runtime_version: string | null;
  channel: string | null;
  device_model: string | null;
  os_version: string | null;
  occurred_at: string;
}

type Sink = (report: ErrorReport) => void;

let sink: Sink | null = null;

/**
 * Reports raised before the sink was installed.
 *
 * Small on purpose. This holds exactly the window between the first import and the root layout's boot
 * call — which is precisely where a launch crash lives, and therefore the window that must not be lost.
 */
let pending: ErrorReport[] = [];
const MAX_PENDING = 10;

// ── the sink ─────────────────────────────────────────────────────────────────

/**
 * Register the thing that actually sends. Called once, by `data/errors-live.ts`.
 *
 * Flushes whatever was raised before it arrived. See the header for why the indirection exists.
 */
export function setErrorSink(fn: Sink): void {
  sink = fn;
  const queued = pending;
  pending = [];
  for (const report of queued) {
    try {
      fn(report);
    } catch {
      /* a broken sink must not break the boot that installed it */
    }
  }
}

// ── breadcrumbs ──────────────────────────────────────────────────────────────

/**
 * Record one step of the trail.
 *
 * Silently drops anything that fails sanitising — see `breadcrumb-core`, where the redaction rules live
 * and are tested. Never throws, never awaits, never renders.
 */
export function breadcrumb(type: CrumbType, label: unknown, detail?: unknown): void {
  try {
    if (!trailEnabled) return;
    const crumb = makeCrumb(type, label, detail, Date.now());
    if (crumb) crumbs = pushCrumb(crumbs, crumb);
  } catch {
    /* a crumb is never worth an exception */
  }
}

/**
 * The athlete moved to a new screen.
 *
 * Records the crumb AND updates `currentScreen`, which is what a report's `screen` field reads. The
 * second half runs even when the trail is off: knowing WHICH SCREEN broke is a fact about our software,
 * not a record of their journey, and it is the difference between an actionable report and a mystery.
 */
export function noteRoute(path: string): void {
  try {
    const crumb = makeCrumb('route', path, undefined, Date.now());
    if (!crumb) return;
    currentScreen = crumb.label;
    if (trailEnabled) crumbs = pushCrumb(crumbs, crumb);
  } catch {
    /* ignore */
  }
}

/** Called by `analytics.setAnalyticsEnabled()`. Turning it off DROPS the trail collected so far. */
export function setTrailEnabled(on: boolean): void {
  trailEnabled = on;
  if (!on) crumbs = [];
}

/** The current trail. Exported for the tour/debug surfaces and for tests; callers must not mutate it. */
export function currentTrail(): readonly Crumb[] {
  return crumbs;
}

// ── reporting ────────────────────────────────────────────────────────────────

interface ReportOptions {
  source?: ErrorReport['source'];
  fatal?: boolean;
  componentStack?: string | null;
  /** Overrides the tracked route — a boundary knows its own name better than the router does. */
  screen?: string | null;
}

/**
 * Send one error.
 *
 * ⚠ TOTAL. Wrapped end to end, including the sanitising. If this function can throw, then every error
 *   boundary in the app can throw from its `componentDidCatch`, and a boundary that throws while
 *   catching takes down the tree it exists to protect.
 */
export function reportError(error: unknown, options: ReportOptions = {}): void {
  try {
    const err = error as { name?: unknown; message?: unknown; stack?: unknown; code?: unknown } | null;

    // A PostgREST rejection is a PLAIN OBJECT, not an Error — `useQuery.errorMessage` documents this
    // after "[object Object]" hid every database failure in the app for weeks. Prefer its `code` as the
    // name so `PGRST202` groups separately from `42501`.
    const name = sanitizeName(
      (typeof err?.code === 'string' && err.code) || err?.name || (error instanceof Error ? error.name : 'Error'),
    );
    const message = sanitizeMessage(
      err?.message ?? (typeof error === 'string' ? error : error == null ? '' : String(error)),
    );
    const stack = sanitizeStack(err?.stack);
    const fingerprint = fingerprintError(name, message, stack);

    // Client-side de-duplication. See `sentCounts` — the server also caps, but not before the radio
    // has already been woken sixty times a second by a render loop.
    if (sentTotal >= MAX_PER_SESSION) return;
    const seen = sentCounts.get(fingerprint) ?? 0;
    if (seen >= MAX_PER_FINGERPRINT) return;
    sentCounts.set(fingerprint, seen + 1);
    sentTotal += 1;

    const report: ErrorReport = {
      session_id: currentAppSession(),
      fingerprint,
      name,
      message,
      stack,
      component_stack: options.componentStack ? String(options.componentStack).slice(0, 8000) : null,
      screen: options.screen ?? currentScreen,
      source: options.source ?? 'global',
      fatal: options.fatal ?? false,
      // A snapshot, not the live array — the trail keeps growing while this is in flight.
      breadcrumbs: trailEnabled ? [...crumbs] : [],
      platform: PLATFORM,
      app_version: APP_VERSION,
      ...buildContext(),
      ...deviceContext(),
      occurred_at: new Date().toISOString(),
    };

    if (sink) sink(report);
    else if (pending.length < MAX_PENDING) pending.push(report);
  } catch {
    /* ⛔ see the doc comment. There is no failure here worth propagating. */
  }
}

// ── the global handlers ──────────────────────────────────────────────────────

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsShape {
  getGlobalHandler?: () => GlobalErrorHandler;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
}

/**
 * Install the catch-alls. Idempotent; called once from the root layout.
 *
 * ══ ⚠ EVERY HANDLER CHAINS TO THE ONE IT REPLACED ══
 *
 * This is the single most important line in the file. React Native's default global handler is what
 * shows the redbox in development and what reports a fatal to the native crash handler in production.
 * Replacing it outright would mean this system trades the errors you can already see for the ones you
 * cannot — a strictly worse position than having no reporter at all, and one that would not show up in
 * any test because everything would still be green and silent.
 *
 * So: record, then call the original. Always, including when recording throws.
 */
export function startDiagnostics(): void {
  if (started) return;
  started = true;

  // ── uncaught JS exceptions ─────────────────────────────────────────────────
  try {
    const eu = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
    if (eu?.setGlobalHandler) {
      const previous = eu.getGlobalHandler?.();
      eu.setGlobalHandler((error, isFatal) => {
        try {
          reportError(error, { source: 'global', fatal: !!isFatal });
        } catch {
          /* fall through to the original regardless */
        }
        // ⚠ NEVER remove this. See the doc comment above.
        if (previous) previous(error, isFatal);
      });
    }
  } catch {
    /* no ErrorUtils on this runtime (web) — the rejection handler below covers it */
  }

  // ── unhandled promise rejections ───────────────────────────────────────────
  //
  // The two runtimes need two different hooks and neither substitutes for the other.
  try {
    // WEB. A standard DOM event; React Native Web has no ErrorUtils, so on the preview at
    // forgelegacy.expo.app this and the `window.onerror` below are the whole net.
    const g = globalThis as unknown as {
      addEventListener?: (t: string, cb: (e: unknown) => void) => void;
    };
    if (typeof g.addEventListener === 'function') {
      g.addEventListener('unhandledrejection', (event: unknown) => {
        const reason = (event as { reason?: unknown })?.reason ?? event;
        reportError(reason, { source: 'rejection', fatal: false });
      });
      g.addEventListener('error', (event: unknown) => {
        const err = (event as { error?: unknown })?.error;
        if (err) reportError(err, { source: 'global', fatal: false });
      });
    }
  } catch {
    /* ignore */
  }

  try {
    // NATIVE. React Native routes an unhandled rejection to `ExceptionsManager.handleException`
    // DIRECTLY, bypassing `ErrorUtils` entirely — see
    // `node_modules/react-native/Libraries/promiseRejectionTrackingOptions.js`. So the global handler
    // above never sees one, and a failed `await` in a screen would go unreported.
    //
    // Re-enabling the tracker with our own `onUnhandled` is the supported way in. ⚠ It CHAINS to RN's
    // own options, so LogBox and the dev-time warning keep working exactly as before.
    //
    // Wrapped tightly and allowed to fail: this reaches into a transitive dependency's internals, and
    // if a future React Native moves them, the correct outcome is losing rejection capture — not
    // failing to boot.
    /*
     * ⚠ `require`, NOT `import`, AND THE LINT SUPPRESSION IS THE POINT RATHER THAN A SHORTCUT.
     *
     * A static `import` is hoisted and evaluated unconditionally at module load. Neither of these
     * modules exists in the web bundle, so an import would break `expo export --platform web` — the
     * build that produces forgelegacy.expo.app — for a feature that only applies to native. `require`
     * inside this try/catch is what makes the whole block conditional at runtime.
     */
    /* eslint-disable @typescript-eslint/no-require-imports */
    const tracking = require('promise/setimmediate/rejection-tracking') as {
      enable?: (opts: Record<string, unknown>) => void;
    };
    const rnOptions = (require('react-native/Libraries/promiseRejectionTrackingOptions') as {
      default?: Record<string, unknown>;
    })?.default;
    /* eslint-enable @typescript-eslint/no-require-imports */

    if (typeof tracking?.enable === 'function' && rnOptions) {
      const rnUnhandled = rnOptions.onUnhandled as ((id: unknown, rejection: unknown) => void) | undefined;
      tracking.enable({
        ...rnOptions,
        onUnhandled: (id: unknown, rejection: unknown) => {
          try {
            reportError(rejection, { source: 'rejection', fatal: false });
          } catch {
            /* fall through */
          }
          // ⚠ Chain, for the reason in the doc comment above.
          if (rnUnhandled) rnUnhandled(id, rejection);
        },
      });
    }
  } catch {
    /* the module shape changed, or this is web. Degrade quietly. */
  }
}
