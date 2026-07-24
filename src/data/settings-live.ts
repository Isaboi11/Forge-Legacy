import { supabase } from '@/lib/supabase';
import { sanitizeVisibility, type VisibilityMap } from '@/domain/settings/visibility';
import { sanitizeNotif, type NotifMap } from '@/domain/settings/notifications';
import { sanitizePrefs, type AppPrefs } from '@/domain/settings/preferences';

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
