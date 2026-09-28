import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  classify,
  type Classification,
  type ForgeWorkout,
  type HealthWorkout,
  type ImportCandidate,
  type LedgerEntry,
  type LedgerOutcome,
  type PossibleDuplicate,
} from '@/domain/health/dedup';
import { chunkPayload, IMPORT_SOURCE } from '@/domain/health/import-rows';
import {
  DEFAULT_PREFS,
  FIRST_PULL_DAYS,
  parsePrefs,
  prefsKey,
  resolveReview,
  serializePrefs,
  syncDue,
  windowStartMs,
  type HealthPrefs,
} from '@/domain/health/sync-state';
import { toWriteBackSample } from '@/domain/health/write-back';
import {
  appleHealthAvailable,
  readHealthWorkouts,
  readHealthWorkoutsById,
  requestAppleHealthAccess,
  writeHealthWorkout,
} from '@/lib/apple-health';
import { consentAllowsNow, consentsReady, ensureConsent } from '@/lib/consent';
import { supabase } from '@/lib/supabase';

/**
 * Apple Health ⇄ Forge — the data layer (Build 10 · `Docs/Apple-Health-Build-Plan.md` §3.3–3.5, §5, §6).
 *
 *   beginConnect / finishConnect   the first import: consent → Apple's sheet → 90 days → Review → Add N
 *   syncAppleHealth                on app open + foreground (throttled 10 min) and Check now: anchored read
 *   fetchHeldReview / resolveHeld  the possible duplicates a sync held back ("1 workout needs a look")
 *   disconnectAppleHealth          stop syncing; keep the imports (default) or remove them
 *   writeBackWorkout               a finished Forge workout → Health (called from `save.ts`)
 *
 * ══ ⚠ WHAT MAY BE STORED ON THIS PHONE — AND WHAT MAY NOT ══
 *
 * AsyncStorage goes into iCloud device backups, and HealthKit data must never reach iCloud (§7). The ONLY
 * thing written here is `HealthPrefs` — two booleans, HealthKit's opaque anchor and a timestamp, through
 * `serializePrefs`. The Review list lives in the screen's memory and is gone when it closes. Held possible
 * duplicates are remembered SERVER-side as ledger ids ('duplicate') and re-read from Health by UUID when the
 * athlete opens them, so nothing about them is ever kept on the device.
 *
 * ══ ⚠ NO ERROR FROM HERE IS REPORTED WITH ITS DETAIL ══
 *
 * HealthKit failures are reported as codes by `lib/apple-health.ts`. A PostgREST error can quote a value
 * back ("invalid input syntax … '2026-09-27…'"), so failures of the RPC and the ledger are swallowed here,
 * never passed to `reportError`. The next sync retries: the anchor only advances once everything landed.
 */

// ── prefs ────────────────────────────────────────────────────────────────────

async function currentUid(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function loadPrefs(uid: string): Promise<HealthPrefs> {
  try {
    return parsePrefs(await AsyncStorage.getItem(prefsKey(uid)));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

async function savePrefs(uid: string, p: HealthPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(prefsKey(uid), serializePrefs(p));
  } catch {
    // best-effort: a lost write means one more full-window read next time, which dedup makes harmless
  }
}

// ── reading what Forge already has ───────────────────────────────────────────

interface WorkoutRow {
  id: string;
  activity_type: string | null;
  started_at: string;
  duration_sec: number | null;
  distance: number | null;
  distance_unit: string | null;
  source: string | null;
  external_id: string | null;
  source_label: string | null;
  workout_exercises: { count: number }[] | null;
}

const toMiles = (d: number | null, unit: string | null): number | null => {
  if (d == null || !(d > 0)) return null;
  const u = (unit ?? 'mi').toLowerCase();
  return u === 'km' ? d / 1.609344 : u === 'm' ? d / 1609.344 : d;
};

/**
 * The Forge workouts a batch could collide with: everything that started from a day before the batch's
 * earliest workout. A workout with exercises was recorded as it happened (a live session or a GPS run),
 * so its clock is real (`tracked`); one with none is a `saveActivity` log, whose start is "now − duration".
 */
async function fetchForgeWindow(uid: string, sinceMs: number): Promise<ForgeWorkout[] | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, activity_type, started_at, duration_sec, distance, distance_unit, source, external_id, source_label, workout_exercises(count)')
    .eq('athlete_id', uid)
    .eq('state', 'saved')
    .gte('started_at', new Date(sinceMs - 86_400_000).toISOString())
    .limit(2000);
  if (error || !data) return null;
  return (data as unknown as WorkoutRow[]).map((w) => ({
    id: w.id,
    activityType: w.activity_type ?? 'strength',
    startedAt: w.started_at,
    durationSec: w.duration_sec ?? 0,
    distanceMi: toMiles(w.distance, w.distance_unit),
    tracked: (w.workout_exercises?.[0]?.count ?? 0) > 0,
    source: w.source === 'apple_health' ? 'apple_health' : 'forge',
    externalId: w.external_id,
    sourceLabel: w.source_label,
  }));
}

const IN_CHUNK = 150;

/** The ledger rows for exactly these HealthKit ids — bounded by the batch, not by the athlete's history. */
async function fetchLedger(uid: string, ids: readonly string[]): Promise<LedgerEntry[] | null> {
  const out: LedgerEntry[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await supabase
      .from('external_activity_ledger')
      .select('external_id, outcome')
      .eq('athlete_id', uid)
      .eq('source', IMPORT_SOURCE)
      .in('external_id', ids.slice(i, i + IN_CHUNK));
    if (error || !data) return null;
    for (const r of data as { external_id: string; outcome: LedgerOutcome }[]) out.push({ externalId: r.external_id, outcome: r.outcome });
  }
  return out;
}

async function classifyBatch(uid: string, workouts: readonly HealthWorkout[], ledgerFilter?: (e: LedgerEntry) => boolean): Promise<Classification | null> {
  if (!workouts.length) return { importRows: [], possibleDuplicates: [], skipped: [] };
  const earliest = Math.min(...workouts.map((w) => Date.parse(w.start)).filter(Number.isFinite));
  const [forge, ledger] = await Promise.all([fetchForgeWindow(uid, earliest), fetchLedger(uid, workouts.map((w) => w.uuid))]);
  if (!forge || !ledger) return null;
  return classify(workouts, forge, ledgerFilter ? ledger.filter(ledgerFilter) : ledger, {
    nowMs: Date.now(),
    utcOffsetMinutes: -new Date().getTimezoneOffset(),
  });
}

// ── writing ──────────────────────────────────────────────────────────────────

export interface ImportOutcome {
  inserted: number;
  /** Honors earned from the imported history — shown as ONE quiet line (PO 09-28), never as ceremonies. */
  honors: number;
  /** False when a call failed part-way; what landed stays, the rest is retried by the next sync. */
  complete: boolean;
}

async function importRows(rows: readonly ImportCandidate[]): Promise<ImportOutcome> {
  let inserted = 0;
  let honors = 0;
  for (const chunk of chunkPayload(rows)) {
    try {
      const { data, error } = await supabase.rpc('import_external_workouts', { p_source: IMPORT_SOURCE, p_rows: chunk });
      if (error) return { inserted, honors, complete: false };
      const res = (data ?? {}) as { inserted?: number; honors?: unknown };
      inserted += Number(res.inserted) || 0;
      honors += Array.isArray(res.honors) ? res.honors.length : 0;
    } catch {
      return { inserted, honors, complete: false };
    }
  }
  return { inserted, honors, complete: true };
}

async function writeLedger(uid: string, ids: readonly string[], outcome: LedgerOutcome, keepExisting: boolean): Promise<boolean> {
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const rows = ids.slice(i, i + IN_CHUNK).map((external_id) => ({ athlete_id: uid, source: IMPORT_SOURCE, external_id, outcome }));
    try {
      const { error } = await supabase
        .from('external_activity_ledger')
        .upsert(rows, { onConflict: 'athlete_id,source,external_id', ignoreDuplicates: keepExisting });
      if (error) return false;
    } catch {
      return false;
    }
  }
  return true;
}

// ── connect: the first import ────────────────────────────────────────────────

/** Everything the Review step shows. Held in the screen's memory ONLY — never persisted (§7). */
export interface ConnectReview {
  classification: Classification;
  /** Workouts of a type v1 does not import (strength, HIIT, yoga …) — "N other workouts not imported". */
  notImported: number;
  /** How many the athlete can add or decide about — the "Found N workouts" number. */
  found: number;
  newAnchor: string | null;
}

export type BeginConnectResult =
  | { kind: 'review'; review: ConnectReview }
  | { kind: 'unavailable' }
  | { kind: 'no_consent' }
  | { kind: 'failed' };

export async function beginConnect(): Promise<BeginConnectResult> {
  if (!appleHealthAvailable()) return { kind: 'unavailable' };
  const uid = await currentUid();
  if (!uid) return { kind: 'failed' };
  // MHMDA (§3.3 step 2): collecting from another app is collecting — the opt-in comes BEFORE the read.
  if (!(await ensureConsent('apple_health'))) return { kind: 'no_consent' };
  await requestAppleHealthAccess();
  const page = await readHealthWorkouts({ anchor: null, sinceMs: windowStartMs(Date.now(), FIRST_PULL_DAYS) });
  if (!page) return { kind: 'failed' };
  const classification = await classifyBatch(uid, page.workouts);
  if (!classification) return { kind: 'failed' };
  const notImported = classification.skipped.filter((s) => s.reason === 'unsupported_type').length;
  return {
    kind: 'review',
    review: {
      classification,
      notImported,
      found: classification.importRows.length + classification.possibleDuplicates.length,
      newAnchor: page.newAnchor,
    },
  };
}

/**
 * "Add N workouts": import the clean rows plus every possible duplicate switched to Keep; remember the rest
 * as skipped; mark this phone connected. The anchor is stored only when every call landed — otherwise the
 * next sync re-reads the 90-day window, and the ledger + unique index make that re-read harmless.
 */
export async function finishConnect(review: ConnectReview, keepIds: ReadonlySet<string>): Promise<ImportOutcome> {
  const uid = await currentUid();
  if (!uid) return { inserted: 0, honors: 0, complete: false };
  const { keep, skipIds } = resolveReview(review.classification.possibleDuplicates, keepIds);
  const outcome = await importRows([...review.classification.importRows, ...keep]);
  const ledgerOk = await writeLedger(uid, skipIds, 'skipped', false);
  const prefs = await loadPrefs(uid);
  const complete = outcome.complete && ledgerOk;
  await savePrefs(uid, {
    ...prefs,
    connected: true,
    anchor: complete ? review.newAnchor : null,
    lastCheckedAt: new Date().toISOString(),
  });
  return { ...outcome, complete };
}

// ── ongoing sync (§3.4) ──────────────────────────────────────────────────────

export interface SyncOutcome extends ImportOutcome {
  /** Possible duplicates held back for the athlete this time. */
  held: number;
}

let inFlight: Promise<SyncOutcome | null> | null = null;

/**
 * Check Health for new workouts. Null when nothing ran (not here, not connected, consent withdrawn, or
 * inside the 10-minute throttle). Never throws. Overlapping calls share one run.
 */
export function syncAppleHealth(opts: { force?: boolean } = {}): Promise<SyncOutcome | null> {
  if (!appleHealthAvailable()) return Promise.resolve(null);
  if (inFlight) return inFlight;
  inFlight = runSync(opts.force === true)
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function runSync(force: boolean): Promise<SyncOutcome | null> {
  const uid = await currentUid();
  if (!uid) return null;
  const prefs = await loadPrefs(uid);
  if (!prefs.connected) return null;
  const nowMs = Date.now();
  if (!syncDue(prefs.lastCheckedAt, nowMs, force)) return null;
  // A withdrawn Apple Health consent (Settings → Health Data & AI) stops the reading, here and everywhere.
  await consentsReady();
  if (!consentAllowsNow('apple_health')) return null;

  const page = await readHealthWorkouts({ anchor: prefs.anchor, sinceMs: windowStartMs(nowMs, FIRST_PULL_DAYS) });
  if (!page) return null;
  const c = await classifyBatch(uid, page.workouts);
  if (!c) return null;

  const outcome = await importRows(c.importRows);
  // Held, not asked: there is no Review screen open. The ledger remembers the ids; the row badges them.
  const heldOk = await writeLedger(
    uid,
    c.possibleDuplicates.map((d) => d.row.externalId),
    'duplicate',
    true,
  );
  const complete = outcome.complete && heldOk;
  await savePrefs(uid, {
    ...prefs,
    anchor: complete && page.newAnchor ? page.newAnchor : prefs.anchor,
    lastCheckedAt: new Date().toISOString(),
  });
  return { ...outcome, complete, held: c.possibleDuplicates.length };
}

// ── held possible duplicates ─────────────────────────────────────────────────

export interface HeldReview {
  possibleDuplicates: PossibleDuplicate[];
  /** Held once, but nothing collides any more (the manual log was removed) — added with the answers. */
  clean: ImportCandidate[];
  /** Held ids Health no longer has, or that now classify as skips — closed as 'skipped' on resolve. */
  closeIds: string[];
}

export async function countHeld(): Promise<number> {
  const uid = await currentUid();
  if (!uid) return 0;
  try {
    const { count, error } = await supabase
      .from('external_activity_ledger')
      .select('external_id', { count: 'exact', head: true })
      .eq('athlete_id', uid)
      .eq('source', IMPORT_SOURCE)
      .eq('outcome', 'duplicate');
    return error ? 0 : count ?? 0;
  } catch {
    return 0;
  }
}

export async function fetchHeldReview(): Promise<HeldReview | null> {
  const uid = await currentUid();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('external_activity_ledger')
    .select('external_id')
    .eq('athlete_id', uid)
    .eq('source', IMPORT_SOURCE)
    .eq('outcome', 'duplicate')
    .limit(200);
  if (error || !data) return null;
  const ids = (data as { external_id: string }[]).map((r) => r.external_id);
  if (!ids.length) return { possibleDuplicates: [], clean: [], closeIds: [] };

  const workouts = await readHealthWorkoutsById(ids);
  if (!workouts) return null;
  // Re-classified WITHOUT their own 'duplicate' ledger rows, or rule 2 would call every one "already seen".
  const held = new Set(ids);
  const c = await classifyBatch(uid, workouts, (e) => !(held.has(e.externalId) && e.outcome === 'duplicate'));
  if (!c) return null;
  const stillHere = new Set(workouts.map((w) => w.uuid));
  return {
    possibleDuplicates: c.possibleDuplicates,
    clean: c.importRows,
    closeIds: [...ids.filter((id) => !stillHere.has(id)), ...c.skipped.map((s) => s.externalId)],
  };
}

export async function resolveHeld(review: HeldReview, keepIds: ReadonlySet<string>): Promise<ImportOutcome> {
  const uid = await currentUid();
  if (!uid) return { inserted: 0, honors: 0, complete: false };
  const { keep, skipIds } = resolveReview(review.possibleDuplicates, keepIds);
  const outcome = await importRows([...review.clean, ...keep]);
  const ok = await writeLedger(uid, [...skipIds, ...review.closeIds], 'skipped', false);
  return { ...outcome, complete: outcome.complete && ok };
}

// ── status + settings ────────────────────────────────────────────────────────

export interface ImportedWorkout {
  id: string;
  name: string;
  startedAt: string;
  distanceMi: number | null;
  sourceLabel: string | null;
}

export interface AppleHealthStatus {
  available: boolean;
  connected: boolean;
  writeBack: boolean;
  lastCheckedAt: string | null;
  importedCount: number;
  recent: ImportedWorkout[];
  held: number;
  /** When this was read (epoch ms) — what "Last checked N min ago" is measured from, so render stays pure. */
  readAtMs: number;
}

export async function fetchAppleHealthStatus(): Promise<AppleHealthStatus> {
  const base: AppleHealthStatus = { available: appleHealthAvailable(), connected: false, writeBack: true, lastCheckedAt: null, importedCount: 0, recent: [], held: 0, readAtMs: Date.now() };
  const uid = await currentUid();
  if (!uid || !base.available) return base;
  const prefs = await loadPrefs(uid);
  const [countRes, recentRes, held] = await Promise.all([
    supabase.from('workouts').select('id', { count: 'exact', head: true }).eq('athlete_id', uid).eq('source', IMPORT_SOURCE),
    supabase
      .from('workouts')
      .select('id, workout_name, started_at, distance, distance_unit, source_label')
      .eq('athlete_id', uid)
      .eq('source', IMPORT_SOURCE)
      .order('started_at', { ascending: false })
      .limit(5),
    prefs.connected ? countHeld() : Promise.resolve(0),
  ]);
  const recent = ((recentRes.data ?? []) as {
    id: string;
    workout_name: string | null;
    started_at: string;
    distance: number | null;
    distance_unit: string | null;
    source_label: string | null;
  }[]).map((r) => ({
    id: r.id,
    name: r.workout_name ?? 'Workout',
    startedAt: r.started_at,
    distanceMi: toMiles(r.distance, r.distance_unit),
    sourceLabel: r.source_label,
  }));
  return {
    ...base,
    connected: prefs.connected,
    writeBack: prefs.writeBack,
    lastCheckedAt: prefs.lastCheckedAt,
    importedCount: countRes.count ?? 0,
    recent,
    held,
  };
}

/** What the Settings row shows: 'not-here' off an iPhone build with HealthKit, else Connected / Off. */
export async function fetchAppleHealthRow(): Promise<{ state: 'connected' | 'off' | 'not-here'; held: number }> {
  if (!appleHealthAvailable()) return { state: 'not-here', held: 0 };
  const uid = await currentUid();
  if (!uid) return { state: 'off', held: 0 };
  const prefs = await loadPrefs(uid);
  if (!prefs.connected) return { state: 'off', held: 0 };
  return { state: 'connected', held: await countHeld() };
}

export async function setWriteBack(on: boolean): Promise<void> {
  const uid = await currentUid();
  if (!uid) return;
  await savePrefs(uid, { ...(await loadPrefs(uid)), writeBack: on });
}

/**
 * Stop syncing (§3.3 step 6). Keeping the imports is the default — they are owned records (DEDUP §1).
 * `removeImported` writes a ledger 'deleted' row for each FIRST, so none of them can ever come back, then
 * deletes them. Resolves how many were removed, or null when the removal failed part-way.
 */
export async function disconnectAppleHealth(removeImported: boolean): Promise<number | null> {
  const uid = await currentUid();
  if (!uid) return null;
  const prefs = await loadPrefs(uid);
  await savePrefs(uid, { ...prefs, connected: false, anchor: null, lastCheckedAt: null });
  if (!removeImported) return 0;

  const { data, error } = await supabase.from('workouts').select('id, external_id').eq('athlete_id', uid).eq('source', IMPORT_SOURCE).limit(5000);
  if (error || !data) return null;
  const rows = data as { id: string; external_id: string }[];
  let removed = 0;
  for (let i = 0; i < rows.length; i += IN_CHUNK) {
    const part = rows.slice(i, i + IN_CHUNK);
    try {
      const { error: le } = await supabase.from('external_activity_ledger').upsert(
        part.map((r) => ({ athlete_id: uid, source: IMPORT_SOURCE, external_id: r.external_id, outcome: 'deleted', workout_id: r.id })),
        { onConflict: 'athlete_id,source,external_id' },
      );
      if (le) return null;
      const { error: de } = await supabase
        .from('workouts')
        .delete()
        .eq('athlete_id', uid)
        .eq('source', IMPORT_SOURCE)
        .in('id', part.map((r) => r.id));
      if (de) return null;
      removed += part.length;
    } catch {
      return null;
    }
  }
  return removed;
}

// ── write-back (§3.5) ────────────────────────────────────────────────────────

/** Ids written this launch — a replayed offline save must not write a second copy (Health is also checked). */
const written = new Set<string>();

/**
 * Write a just-saved Forge workout to Health. Fire and forget: called from `save.ts` after the commit, and
 * it can never fail or delay a save. Reads the row back so it writes exactly what was stored (a GPS run's
 * distance is rolled up server-side from its sets).
 */
export async function writeBackWorkout(workoutId: string): Promise<void> {
  try {
    if (!workoutId || written.has(workoutId) || !appleHealthAvailable()) return;
    const uid = await currentUid();
    if (!uid) return;
    const prefs = await loadPrefs(uid);
    if (!prefs.connected || !prefs.writeBack) return;
    const { data, error } = await supabase
      .from('workouts')
      .select('id, activity_type, started_at, duration_sec, distance, distance_unit, workout_name, source')
      .eq('id', workoutId)
      .maybeSingle();
    if (error || !data) return;
    const w = data as {
      id: string;
      activity_type: string | null;
      started_at: string;
      duration_sec: number | null;
      distance: number | null;
      distance_unit: string | null;
      workout_name: string | null;
      source: string | null;
    };
    if (w.source && w.source !== 'forge') return; // never echo an import back to where it came from
    const sample = toWriteBackSample({
      id: w.id,
      activityType: w.activity_type ?? 'strength',
      startedAt: w.started_at,
      durationSec: w.duration_sec ?? 0,
      distance: w.distance,
      distanceUnit: w.distance_unit,
      indoor: /treadmill|indoor/i.test(w.workout_name ?? ''),
    });
    if (!sample) return;
    written.add(workoutId);
    if (!(await writeHealthWorkout(sample))) written.delete(workoutId);
  } catch {
    // never — see the doc comment
  }
}
