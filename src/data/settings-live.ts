import { supabase } from '@/lib/supabase';
import { sanitizeVisibility, type VisibilityMap } from '@/domain/settings/visibility';
import { sanitizeNotif, type NotifMap } from '@/domain/settings/notifications';
import { sanitizePrefs, type AppPrefs } from '@/domain/settings/preferences';
import { sanitizeBriefing, type BriefingSchedule } from '@/domain/settings/briefing';

/**
 * The settings ecosystem's persistence (`profiles.visibility` / `notif_prefs` / `app_prefs`, 0022).
 *
 * Every read is sanitized against the current code shape, so a missing column (pre-0022) or a stale key
 * resolves to defaults rather than breaking a screen. Writes sanitize too, so a stale client can never
 * store a key the domain no longer knows.
 */

async function uid(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function readColumn<T>(column: string, sanitize: (raw: unknown) => T): Promise<T> {
  const id = await uid();
  if (!id) return sanitize(null);
  const { data, error } = await supabase.from('profiles').select(column).eq('id', id).maybeSingle();
  if (error || !data) return sanitize(null);
  return sanitize((data as unknown as Record<string, unknown>)[column]);
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
export const saveVisibility = (map: VisibilityMap) => writeColumn('visibility', sanitizeVisibility(map));

export const fetchNotifPrefs = () => readColumn<NotifMap>('notif_prefs', sanitizeNotif);
export const saveNotifPrefs = (map: NotifMap) => writeColumn('notif_prefs', sanitizeNotif(map));

export const fetchAppPrefs = () => readColumn<AppPrefs>('app_prefs', sanitizePrefs);
export const saveAppPrefs = (prefs: AppPrefs) => writeColumn('app_prefs', sanitizePrefs(prefs));

/**
 * The morning briefing's schedule (`briefing_schedule`, 0159) — its own table rather than a fourth key on
 * `profiles`, because `briefing_send()` scans it quarter-hourly across every athlete and a JSONB blob on
 * a table written on nearly every launch is the wrong thing to walk on a timer.
 *
 * ⚠ ABSENT IS NOT OFF. A missing row means "never configured", and it resolves to the DEFAULT schedule,
 * not to silence. The `training_briefing` toggle in `notif_prefs` is the only off switch; a second one
 * living here could disagree with it, and the athlete would have turned the briefing on and heard
 * nothing. `saveBriefing` is what creates the row, so the toggle and the schedule land together.
 */
export async function fetchBriefing(): Promise<BriefingSchedule> {
  const id = await uid();
  if (!id) return sanitizeBriefing(null);
  const { data, error } = await supabase
    .from('briefing_schedule')
    .select('days, hour')
    .eq('athlete_id', id)
    .maybeSingle();
  // A missing table (0159 unapplied) reads the same as a missing row, and both mean "the default".
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
