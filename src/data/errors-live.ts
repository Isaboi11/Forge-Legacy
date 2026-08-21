import { setErrorSink, type ErrorReport } from '@/lib/diagnostics';
import { supabase } from '@/lib/supabase';

/**
 * The one place a client error report is written (migration 0176).
 *
 * ══ WHY THE REPORTER DOES NOT CALL THIS ITSELF ══
 *
 * `lib/supabase` imports `lib/diagnostics` so a failed request can leave a breadcrumb. If
 * `lib/diagnostics` imported supabase back, the two would deadlock at module-init on Hermes and the app
 * would not launch. So the reporter holds a SINK and this file fills it — that is the whole reason for
 * the indirection, and it is why `installErrorSink()` must be called at import time in the root layout
 * rather than inside an effect. A reporter armed after the first render misses the launch crash, which
 * is the one this project has actually shipped (`components/overlay-boundary.tsx` tells that story).
 *
 * ══ WHAT MAKES THIS DIFFERENT FROM EVERY OTHER `*-live.ts` ══
 *
 * Nothing here is awaited by a screen and nothing here returns data. There is no `useQuery` above it, no
 * loading state, no error state. It is fire-and-forget by design: the caller is already handling a
 * failure, and a reporter that can fail visibly is a second bug on top of the first.
 */

/**
 * ⛔ RE-ENTRANCY GUARD — the one failure that would be catastrophic rather than merely annoying.
 *
 * `supabase.rpc()` goes through `timedFetch`, which leaves a `net` breadcrumb on failure. If the RPC
 * itself fails and that path could raise a report, the report would fail, raising a report, forever —
 * a tight loop hammering the network on a device that is already in trouble.
 *
 * Breadcrumbs are safe (they never send). This flag closes the door on the send path anyway, because
 * "safe today" is how that loop gets introduced by a later, reasonable-looking change.
 */
let sending = false;

/** Set once the database answers `PGRST202` — 0176 is not applied on this project yet. */
let disabled = false;

const MISSING_FN = 'PGRST202';

async function send(report: ErrorReport): Promise<void> {
  if (disabled || sending) return;
  sending = true;
  try {
    const { error } = await supabase.rpc('report_client_error', {
      p_session_id: report.session_id,
      p_fingerprint: report.fingerprint,
      p_name: report.name,
      p_message: report.message,
      p_stack: report.stack,
      p_component_stack: report.component_stack,
      p_screen: report.screen,
      p_source: report.source,
      p_fatal: report.fatal,
      p_breadcrumbs: report.breadcrumbs,
      p_platform: report.platform,
      p_app_version: report.app_version,
      p_update_id: report.update_id,
      p_runtime_version: report.runtime_version,
      p_channel: report.channel,
      p_device_model: report.device_model,
      p_os_version: report.os_version,
      p_occurred_at: report.occurred_at,
    });

    // 0176 not applied yet. Stop for the life of the process rather than retrying a function that does
    // not exist on every future error — the `analytics.ts` rule, for the same reason: a disabled
    // feature that keeps trying is a battery complaint.
    //
    // ⚠ This is a REAL state that lasts hours on this project, not a hypothetical. There is no Supabase
    //   CLI and no service key here; migrations are pasted into the dashboard by hand, so the client
    //   half routinely ships before the SQL half lands.
    if (error && (error as { code?: string }).code === MISSING_FN) {
      disabled = true;
    }
  } catch {
    /* dropped, deliberately. There is no second chance worth taking on an error report. */
  } finally {
    sending = false;
  }
}

/**
 * Arm the reporter. Call once, at import time, from the root layout.
 *
 * Installing the sink also flushes anything raised before this ran — see `setErrorSink`.
 */
export function installErrorSink(): void {
  setErrorSink((report) => {
    // Not awaited and its rejection is swallowed: `reportError` is synchronous and returns void, and
    // an unhandled rejection from the error reporter would be reported by the rejection handler, which
    // is the loop the guard above exists to prevent.
    void send(report);
  });
}

/**
 * Whether reporting has switched itself off because 0176 is not applied.
 *
 * Exported so `/admin` can say "the client half is deployed but the migration is not" instead of
 * showing an empty list, which reads identically to "no errors" and is how this project once lost a day
 * to `0153` (applied, but nothing appeared, because the code was undeployed).
 */
export function errorReportingDisabled(): boolean {
  return disabled;
}
