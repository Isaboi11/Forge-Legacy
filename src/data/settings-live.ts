import { supabase } from '@/lib/supabase';
import { sanitizeVisibility, type VisibilityMap } from '@/domain/settings/visibility';
import { sanitizeNotif, type NotifMap } from '@/domain/settings/notifications';
import { sanitizePrefs, type AppPrefs } from '@/domain/settings/preferences';
import { sanitizeBriefing, type BriefingSchedule } from '@/domain/settings/briefing';

/**
 * The settings ecosystem's persistence (`profiles.visibility` / `notif_prefs` / `app_prefs`, 0022).
 *
 * Every read is sanitized against the current code shape, so an EMPTY column or a stale key resolves to
 * defaults rather than breaking a screen. Writes sanitize too, so a stale client can never store a key the
 * domain no longer knows.
 *
 * ⚠ A FAILED READ THROWS. IT IS NEVER DEFAULTS (launch QA B12 / UX-003, 2026-11-09).
 *
 * `readColumn` used to answer `sanitize(null)` — the code defaults — for ANY error: offline, a 5xx, a lapsed
 * session. The screens drew those defaults as the athlete's real choices, and the next tap saved the whole
 * column back. The sweep reproduced it on Profile Visibility: the server held Photos "Only me", the screen
 * showed "Friends", and one tap on any other row made "Friends" true — a privacy setting silently widened,
 * with nothing on screen to say a read had failed. Preferences and Notifications were overwritten the same
 * way, and `SettingsProvider` reported `loaded` over the defaults, so its guarded writers were fooled too.
 *
 * So a read either returns what the server holds (defaults ONLY for a column or row that is genuinely
 * empty) or throws, and the screen says it could not load. A single-key change goes through `patch…`,
 * which reads the column itself and merges onto THAT — never onto a screen's copy, never onto defaults.
 */

async function uid(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** The signed-in athlete, STRICT: a failed identity read throws rather than reading as "nobody". */
async function strictUid(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Not signed in');
  return user.id;
}

async function readColumn<T>(column: string, sanitize: (raw: unknown) => T): Promise<T> {
  const id = await strictUid();
  const { data, error } = await supabase.from('profiles').select(column).eq('id', id).maybeSingle();
  if (error) throw error;
  // No row, or a column never written: genuinely empty, and the defaults ARE what this athlete has.
  return sanitize(data ? (data as unknown as Record<string, unknown>)[column] : null);
}

/*
 * One read-modify-write at a time per column. Two quick taps would otherwise both read before either
 * wrote, and the second write would put back the key the first one changed.
 */
const writing = new Map<string, Promise<unknown>>();

/**
 * Change some keys of one settings column, and only those: read the column from the server, merge the
 * patch onto it, write it back. A failed read throws before anything is written, so the defaults can
 * never reach the database by this path. Same shape as `saveAutoPost` (auto-post-live.ts).
 */
function patchColumn<T extends object>(column: string, sanitize: (raw: unknown) => T, patch: Partial<T>): Promise<void> {
  const run = async () => {
    const current = await readColumn(column, sanitize);
    await writeColumn(column, sanitize({ ...current, ...patch }));
  };
  const next = (writing.get(column) ?? Promise.resolve()).then(run, run);
  writing.set(column, next.catch(() => undefined));
  return next;
}

async function writeColumn(column: string, value: unknown): Promise<void> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');
  const { error } = await supabase
    .from('profiles')
    .update({ [column]: value })
    .eq('id', id);
  if (error) throw error;
}

export const fetchVisibility = () => readColumn<VisibilityMap>('visibility', sanitizeVisibility);
/** The WHOLE map — for "Reset to defaults" and callers holding a server-read map. One key: `patchVisibility`. */
export const saveVisibility = (map: VisibilityMap) => writeColumn('visibility', sanitizeVisibility(map));
export const patchVisibility = (patch: Partial<VisibilityMap>) => patchColumn<VisibilityMap>('visibility', sanitizeVisibility, patch);

export const fetchNotifPrefs = () => readColumn<NotifMap>('notif_prefs', sanitizeNotif);
export const saveNotifPrefs = (map: NotifMap) => writeColumn('notif_prefs', sanitizeNotif(map));
export const patchNotifPrefs = (patch: Partial<NotifMap>) => patchColumn<NotifMap>('notif_prefs', sanitizeNotif, patch);

export const fetchAppPrefs = () => readColumn<AppPrefs>('app_prefs', sanitizePrefs);
export const saveAppPrefs = (prefs: AppPrefs) => writeColumn('app_prefs', sanitizePrefs(prefs));
export const patchAppPrefs = (patch: Partial<AppPrefs>) => patchColumn<AppPrefs>('app_prefs', sanitizePrefs, patch);

/** Postgres's undefined-table code, and PostgREST's "not in the schema cache" for the same thing. */
const MISSING_TABLE = new Set(['42P01', 'PGRST205']);

/**
 * The morning briefing's schedule (`briefing_schedule`, 0159) — its own table rather than a fourth key on
 * `profiles`, because `briefing_send()` scans it quarter-hourly across every athlete and a JSONB blob on
 * a table written on nearly every launch is the wrong thing to walk on a timer.
 *
 * ⚠ ABSENT IS NOT OFF. A missing row means "never configured", and it resolves to the DEFAULT schedule,
 * not to silence. The `training_briefing` toggle in `notif_prefs` is the only off switch; a second one
 * living here could disagree with it, and the athlete would have turned the briefing on and heard
 * nothing. `saveBriefing` is what creates the row, so the toggle and the schedule land together.
 *
 * ⚠ ABSENT IS THE DEFAULT; A FAILED READ IS NOT (B12). It used to answer the default for any error too, so
 * a blip drew the default days and hour over the athlete's own, and the next day tapped saved them.
 */
export async function fetchBriefing(): Promise<BriefingSchedule> {
  const id = await strictUid();
  const { data, error } = await supabase
    .from('briefing_schedule')
    .select('days, hour')
    .eq('athlete_id', id)
    .maybeSingle();
  // A missing table (0159 unapplied) reads the same as a missing row, and both mean "the default".
  if (error && !MISSING_TABLE.has(String(error.code ?? ''))) throw error;
  if (error || !data) return sanitizeBriefing(null);
  return sanitizeBriefing(data);
}

export async function saveBriefing(schedule: BriefingSchedule): Promise<void> {
  const id = await uid();
  if (!id) throw new Error('Not signed in');
  const clean = sanitizeBriefing(schedule);
  const { error } = await supabase
    .from('briefing_schedule')
    // `athlete_id` is the primary key, so this replaces rather than accumulating — the same shape 0136
    // uses for the planned workout.
    .upsert({ athlete_id: id, days: clean.days, hour: clean.hour }, { onConflict: 'athlete_id' });
  if (error) throw error;
}
