import { supabase } from '@/lib/supabase';
import type { FormLast, FormMark, FormRead, FormTrend, FormView } from '@/domain/coach/form-check';
import type { PoseMeasured } from '@/domain/coach/pose/pose-measure';

/**
 * FORM HISTORY — the record of Holt's form reads (`form_checks`, migration 0221) and the private
 * `form-frames` bucket that holds the one frame each saved read marked.
 *
 * Built for `Coach Holt Form Check.dc.html` 04 (Useful / Not useful · Save to form history) and 05 (the
 * timeline, compare, empty). The read's text is stored exactly as the screen drew it — already through
 * the guard twice — so nothing here writes a sentence.
 *
 * ⚠ SIGNED URLS ARE MADE AT READ TIME AND NEVER STORED. The row holds a storage PATH. A persisted signed
 * URL is the defect `project_photo_buckets_public_by_decision` records (a 60-minute link written into a
 * permanent row). `listFormHistory` signs fresh each time the screen opens.
 *
 * ⚠ NOTHING HERE THROWS. Before 0221 is pasted every call fails soft: the insert returns null, the list
 * returns [], and the read screen simply cannot save — it never loses the read the athlete is looking at.
 */

const BUCKET = 'form-frames';
const SIGN_SECONDS = 60 * 60;

/** The key a lift's history is grouped by — the same expression as the table's generated `lift_key`. */
export function formLiftKey(lift: string, exerciseKey?: string | null): string {
  return exerciseKey ? exerciseKey : lift.toLowerCase();
}

async function uid(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Write the read that just came back. Returns its id, or null (not signed in, or 0221 not applied).
 *
 * `measured` is body tracking's numbers (reps, depth, tempo — never joints, PO decision 3) into
 * `form_checks.measured` (0235). ⚠ BEFORE 0235 IS PASTED THAT COLUMN DOES NOT EXIST, and PostgREST refuses
 * the whole insert over it — so a refusal that names the column is retried without it. The read is never
 * lost to a migration that has not landed yet.
 */
export async function insertFormCheck(args: {
  lift: string;
  exerciseKey?: string | null;
  read: FormRead;
  measured?: PoseMeasured | null;
}): Promise<string | null> {
  const row: Record<string, unknown> = {
    lift: args.lift.slice(0, 60),
    exercise_key: args.exerciseKey ?? null,
    view: args.read.view,
    rep_count: args.read.reps,
    read: args.read,
  };
  const insert = async (withMeasured: boolean) =>
    supabase
      .from('form_checks')
      .insert(withMeasured ? { ...row, measured: args.measured } : row)
      .select('id')
      .single();
  try {
    let { data, error } = await insert(!!args.measured);
    if (error && args.measured && /measured/.test(`${error.message ?? ''} ${error.details ?? ''}`)) {
      ({ data, error } = await insert(false));
    }
    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

/** The thumbs. `null` clears it (tapping the chosen one again). */
export async function setFormUseful(id: string, useful: boolean | null): Promise<boolean> {
  try {
    const { error } = await supabase.from('form_checks').update({ useful }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * "Save to form history": upload the marked frame to `form-frames/<uid>/<id>.jpg`, then flag the row.
 *
 * The upload goes first so a saved row never points at a frame that is not there. A frame that fails to
 * upload still saves the read (the timeline shows an empty frame slot rather than losing the entry).
 */
export async function saveFormCheck(id: string, frameUri: string | null, frameMs: number | null): Promise<boolean> {
  try {
    const me = await uid();
    if (!me) return false;
    let path: string | null = null;
    if (frameUri) {
      try {
        const res = await fetch(frameUri);
        const bytes = await res.arrayBuffer();
        const target = `${me}/${id}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(target, bytes, { contentType: 'image/jpeg', upsert: true });
        if (!upErr) path = target;
      } catch {
        path = null;
      }
    }
    const { error } = await supabase
      .from('form_checks')
      .update({ saved: true, key_frame_path: path, key_frame_ms: frameMs != null ? Math.round(frameMs) : null })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export interface FormHistoryEntry {
  id: string;
  createdAt: string;
  /** "Sep 25" */
  date: string;
  lift: string;
  view: FormView | null;
  /** The biggest fix that read gave, or '' when it gave none. */
  fix: string;
  trend: FormTrend | null;
  progress: string;
  /** A fresh signed URL for the marked frame, or null. Never persist this. */
  frameUrl: string | null;
  /** The biggest fix's mark, so the saved frame shows Holt's dot again. Null when that read had none. */
  mark: FormMark | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sep 25" in the athlete's own time zone. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

interface Row {
  id: string;
  created_at: string;
  lift: string;
  view: FormView | null;
  read: Partial<FormRead> | null;
  key_frame_path: string | null;
}

/** The saved reads of one lift, newest first, each with a freshly signed frame URL. `[]` on any failure. */
export async function listFormHistory(liftKey: string): Promise<FormHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('form_checks')
      .select('id, created_at, lift, view, read, key_frame_path')
      .eq('lift_key', liftKey)
      .eq('saved', true)
      .order('created_at', { ascending: false })
      .limit(60);
    if (error || !data) return [];
    const rows = data as Row[];
    const paths = rows.map((r) => r.key_frame_path).filter((p): p is string => !!p);
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGN_SECONDS);
      for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      date: shortDate(r.created_at),
      lift: r.lift,
      view: r.view,
      fix: Array.isArray(r.read?.fix) && typeof r.read.fix[0] === 'string' ? r.read.fix[0] : '',
      trend: r.read?.trend ?? null,
      progress: typeof r.read?.progress === 'string' ? r.read.progress : '',
      frameUrl: r.key_frame_path ? (signed.get(r.key_frame_path) ?? null) : null,
      mark: Array.isArray(r.read?.marks) ? (r.read.marks.find((m) => m && m.fix === 0) ?? null) : null,
    }));
  } catch {
    return [];
  }
}

/** The last SAVED read of this lift, as the function's `last` — date + fix only. Null on a first read. */
export async function lastSavedForm(liftKey: string): Promise<FormLast | null> {
  try {
    const { data, error } = await supabase
      .from('form_checks')
      .select('created_at, read')
      .eq('lift_key', liftKey)
      .eq('saved', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const r = data as { created_at: string; read: Partial<FormRead> | null };
    const fix = Array.isArray(r.read?.fix) && typeof r.read.fix[0] === 'string' ? r.read.fix[0] : '';
    return fix ? { date: shortDate(r.created_at), fix } : null;
  } catch {
    return null;
  }
}
