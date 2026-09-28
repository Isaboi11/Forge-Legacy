/**
 * Apple Health import deduplication (Build 10 · `Docs/Apple-Health-Build-Plan.md` §5, DEDUP §1–7).
 *
 * `classify(healthWorkouts, forgeWorkouts, ledger, opts)` sorts one batch from Health into:
 *   importRows          add these
 *   possibleDuplicates  ask the athlete (Review list, "Skip" pre-selected; or held behind a badge in sync)
 *   skipped             drop, with the reason — never shown one by one
 *
 * Pure: the data layer fetches the Forge workouts in the window and the ledger, calls this, then the RPC.
 * The unique index on (athlete_id, source, external_id) is the server-side backstop; this is what keeps the
 * athlete from ever seeing a copy.
 *
 * ══ THE RULES, FIRST MATCH WINS ══
 *
 *   0. not a v1 type, or fails the §4 filters           → skipped (counted as "N other workouts")
 *   1. Forge wrote it (bundle, or HKExternalUUID)       → skipped silently — the echo of write-back
 *   2. UUID already in the ledger or workouts.external_id → skipped silently — incl. a deleted import
 *   3. ≥ 50% overlap with a Forge-TRACKED workout (GPS run / live session) of a compatible type
 *                                                       → skipped silently — the Forge record wins
 *   5. ≥ 50% overlap with another Health copy of the same effort → the most direct source survives
 *   4. same type + same local day + distance or duration within 10% of a MANUAL Forge log
 *                                                       → possible duplicate
 *   6. otherwise                                        → import
 *
 * ⚠ DELIBERATE DEVIATION — rule 5 runs BEFORE rule 4. In plan order, a Garmin + Strava pair of a run the
 *   athlete also logged by hand would BOTH land in the Review list as possible duplicates, and tapping
 *   "Keep" on both imports the same run twice. Collapsing the Health copies first means the athlete is
 *   asked about one copy, never two. Every rule's outcome is otherwise exactly the plan's.
 *
 * ⚠ ADDITION — the plan's rule 3 covers only Forge-tracked workouts of a COMPATIBLE type, and rule 5 only
 *   Health-vs-Health within the batch. Two gaps are closed here, both toward asking rather than guessing:
 *   · ≥ 50% overlap with a Forge-tracked workout of an INCOMPATIBLE type (a Watch "run" during a Forge
 *     strength session — a treadmill finisher?) → possible duplicate, not a silent skip or a silent add.
 *   · ≥ 50% overlap with an ALREADY-IMPORTED Health row (Garmin synced yesterday, Strava's copy today) →
 *     rule 5 against the stored row: a less-or-equally direct newcomer is skipped; a MORE direct one is a
 *     possible duplicate, because the stored row is an owned record (DEDUP §1) and is never replaced.
 */

import { filterReason, mapHealthType, metersToMiles, type FilterReason, type ImportActivity } from './activity-map.ts';
import { isForgeEcho, RANK_DIRECT, sourceLabel, sourceRank } from './source.ts';

/** One HealthKit workout, as the native wrapper normalises it. Nothing here is persisted to the device. */
export interface HealthWorkout {
  /** HealthKit UUID — becomes `workouts.external_id`. */
  uuid: string;
  /** HK case name (`running`) or raw `HKWorkoutActivityType` number. */
  activityType: string | number;
  start: string; // ISO
  end: string; // ISO
  durationSec: number;
  distanceMeters: number | null;
  /** `HKIndoorWorkout` metadata. */
  indoor: boolean;
  sourceName: string | null;
  bundleId: string | null;
  productType: string | null;
  /** `HKExternalUUID` metadata — set by Forge's own write-back. */
  externalUuid: string | null;
}

/** A Forge workout in the import window, as the data layer reads it. */
export interface ForgeWorkout {
  id: string;
  /** DB `modality`. */
  activityType: string;
  startedAt: string; // ISO
  durationSec: number;
  distanceMi: number | null;
  /**
   * Recorded as it happened — a GPS run or a live session — so its clock is real and time overlap is
   * trustworthy. False for a `saveActivity` manual log, whose `started_at` is `now − duration`.
   */
  tracked: boolean;
  source: 'forge' | 'apple_health';
  externalId: string | null;
  /** For `apple_health` rows — lets rule 5 rank the stored copy against a newcomer. */
  sourceLabel?: string | null;
  sourceRank?: number | null;
}

export type LedgerOutcome = 'imported' | 'skipped' | 'duplicate' | 'deleted';

export interface LedgerEntry {
  externalId: string;
  outcome: LedgerOutcome;
}

/** A Health workout mapped into the shape a Forge row is built from (`import-rows.ts`). */
export interface ImportCandidate {
  externalId: string;
  activityType: ImportActivity;
  name: string;
  indoor: boolean;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  distanceMi: number | null;
  sourceLabel: string;
  sourceRank: number;
}

export type SkipReason =
  | 'unsupported_type'
  | FilterReason
  | 'forge_echo'
  | 'already_seen'
  | 'overlaps_forge_tracked'
  | 'less_direct_copy'
  | 'duplicate_in_batch';

export type DuplicateReason = 'matches_manual_log' | 'overlaps_forge_other_type' | 'same_effort_other_source' | 'overlaps_existing_import';

export interface PossibleDuplicate {
  row: ImportCandidate;
  reason: DuplicateReason;
  /** The Forge workout it may duplicate, when it is one. */
  forgeWorkoutId: string | null;
  /** The Health workout it may duplicate, when it is one in this batch. */
  otherExternalId: string | null;
}

export interface Classification {
  importRows: ImportCandidate[];
  possibleDuplicates: PossibleDuplicate[];
  skipped: { externalId: string; reason: SkipReason }[];
}

export interface ClassifyOptions {
  /** Epoch ms — for the "starts in the future" filter. */
  nowMs: number;
  /**
   * The athlete's UTC offset in minutes (e.g. −420 for PDT), for rule 4's "same local day". The device
   * offset now, applied to every date — a DST boundary inside the window can move a midnight-adjacent log
   * by a day, which only ever turns a possible duplicate into an import the athlete can still remove.
   */
  utcOffsetMinutes?: number;
}

export const OVERLAP_SHARE = 0.5;
export const MANUAL_MATCH_TOLERANCE = 0.1;

/** Running and walking are one outing as far as a copy goes (a walk-run, a hike logged as a walk). */
const COMPAT_GROUP: Readonly<Record<string, string>> = { running: 'foot', walking: 'foot' };
const group = (t: string) => COMPAT_GROUP[t.toLowerCase()] ?? t.toLowerCase();
export const compatibleTypes = (a: string, b: string): boolean => group(a) === group(b);

interface Span {
  startMs: number;
  endMs: number;
}

/** Overlap as a share of the SHORTER span (0–1). A zero-length span overlaps nothing. */
export function overlapShare(a: Span, b: Span): number {
  const shorter = Math.min(a.endMs - a.startMs, b.endMs - b.startMs);
  if (!(shorter > 0)) return 0;
  const overlap = Math.min(a.endMs, b.endMs) - Math.max(a.startMs, b.startMs);
  return Math.max(0, overlap) / shorter;
}

const within = (a: number | null, b: number | null, tol: number): boolean =>
  a != null && b != null && a > 0 && b > 0 && Math.abs(a - b) <= tol * Math.max(a, b);

const localDay = (iso: string, offsetMin: number): string =>
  new Date(Date.parse(iso) + offsetMin * 60_000).toISOString().slice(0, 10);

const forgeSpan = (f: ForgeWorkout): Span => {
  const startMs = Date.parse(f.startedAt);
  return { startMs, endMs: startMs + Math.max(0, f.durationSec) * 1000 };
};
const candSpan = (c: ImportCandidate): Span => ({ startMs: Date.parse(c.startedAt), endMs: Date.parse(c.endedAt) });

function toCandidate(w: HealthWorkout): ImportCandidate | null {
  const mapped = mapHealthType(w.activityType, w.indoor);
  if (!mapped) return null;
  return {
    externalId: w.uuid,
    activityType: mapped.activityType,
    name: mapped.name,
    indoor: w.indoor,
    startedAt: new Date(Date.parse(w.start)).toISOString(),
    endedAt: new Date(Date.parse(w.end)).toISOString(),
    durationSec: Math.round(w.durationSec),
    distanceMi: metersToMiles(w.distanceMeters),
    sourceLabel: sourceLabel(w.sourceName, w.bundleId, w.productType),
    sourceRank: sourceRank(w),
  };
}

/** Rule 5 winner between two copies: more direct, then longer distance, then earlier UUID (stable). */
function beats(a: ImportCandidate, b: ImportCandidate): boolean {
  if (a.sourceRank !== b.sourceRank) return a.sourceRank > b.sourceRank;
  const da = a.distanceMi ?? 0;
  const db = b.distanceMi ?? 0;
  if (da !== db) return da > db;
  return a.externalId < b.externalId;
}

export function classify(
  healthWorkouts: readonly HealthWorkout[],
  forgeWorkouts: readonly ForgeWorkout[],
  ledger: readonly LedgerEntry[],
  opts: ClassifyOptions,
): Classification {
  const out: Classification = { importRows: [], possibleDuplicates: [], skipped: [] };
  const offset = opts.utcOffsetMinutes ?? 0;

  const forgeIds = new Set(forgeWorkouts.map((f) => f.id));
  const seen = new Set<string>(ledger.map((l) => l.externalId));
  for (const f of forgeWorkouts) if (f.externalId) seen.add(f.externalId);

  const tracked = forgeWorkouts.filter((f) => f.source === 'forge' && f.tracked);
  const manual = forgeWorkouts.filter((f) => f.source === 'forge' && !f.tracked);
  const imported = forgeWorkouts.filter((f) => f.source === 'apple_health');

  // ── rules 0–3, per workout ──
  const survivors: ImportCandidate[] = [];
  const pendingDup = new Map<string, PossibleDuplicate>();
  const batchSeen = new Set<string>();
  for (const w of healthWorkouts) {
    const skip = (reason: SkipReason) => out.skipped.push({ externalId: w.uuid, reason });

    const cand = toCandidate(w);
    if (!cand) {
      skip('unsupported_type');
      continue;
    }
    const filtered = filterReason(w, opts.nowMs);
    if (filtered) {
      skip(filtered);
      continue;
    }
    if (isForgeEcho(w, forgeIds)) {
      skip('forge_echo');
      continue;
    }
    if (seen.has(w.uuid)) {
      skip('already_seen');
      continue;
    }
    if (batchSeen.has(w.uuid)) {
      skip('duplicate_in_batch'); // the same sample twice in one query (anchor fallback overlap)
      continue;
    }
    batchSeen.add(w.uuid);

    const span = candSpan(cand);
    const overlapping = tracked.filter((f) => overlapShare(span, forgeSpan(f)) >= OVERLAP_SHARE);
    if (overlapping.some((f) => compatibleTypes(f.activityType, cand.activityType))) {
      skip('overlaps_forge_tracked');
      continue;
    }
    if (overlapping.length) {
      pendingDup.set(cand.externalId, { row: cand, reason: 'overlaps_forge_other_type', forgeWorkoutId: overlapping[0].id, otherExternalId: null });
      continue;
    }

    const stored = imported.find((f) => compatibleTypes(f.activityType, cand.activityType) && overlapShare(span, forgeSpan(f)) >= OVERLAP_SHARE);
    if (stored) {
      const storedRank = stored.sourceRank ?? RANK_DIRECT; // unknown → assume it was the direct one
      if (cand.sourceRank <= storedRank) skip('less_direct_copy');
      else pendingDup.set(cand.externalId, { row: cand, reason: 'overlaps_existing_import', forgeWorkoutId: stored.id, otherExternalId: null });
      continue;
    }
    survivors.push(cand);
  }

  // ── rule 5, across the batch: collapse each same-effort cluster to its most direct copy ──
  const winners: ImportCandidate[] = [];
  const ordered = [...survivors].sort((a, b) => (beats(a, b) ? -1 : beats(b, a) ? 1 : 0));
  for (const cand of ordered) {
    const span = candSpan(cand);
    const winner = winners.find((w) => compatibleTypes(w.activityType, cand.activityType) && overlapShare(span, candSpan(w)) >= OVERLAP_SHARE);
    if (!winner) {
      winners.push(cand);
      continue;
    }
    // Both direct (Watch + Garmin): the athlete decides about the shorter one. Otherwise the copy goes.
    if (cand.sourceRank >= RANK_DIRECT && winner.sourceRank >= RANK_DIRECT) {
      pendingDup.set(cand.externalId, { row: cand, reason: 'same_effort_other_source', forgeWorkoutId: null, otherExternalId: winner.externalId });
    } else {
      out.skipped.push({ externalId: cand.externalId, reason: 'less_direct_copy' });
    }
  }

  // ── rule 4: a manual log's clock is unreliable, so match on day + size, and ask ──
  for (const cand of winners) {
    const day = localDay(cand.startedAt, offset);
    const match = manual.find(
      (f) =>
        f.activityType.toLowerCase() === cand.activityType &&
        localDay(f.startedAt, offset) === day &&
        (within(f.distanceMi, cand.distanceMi, MANUAL_MATCH_TOLERANCE) || within(f.durationSec, cand.durationSec, MANUAL_MATCH_TOLERANCE)),
    );
    if (match) pendingDup.set(cand.externalId, { row: cand, reason: 'matches_manual_log', forgeWorkoutId: match.id, otherExternalId: null });
    else out.importRows.push(cand);
  }

  // Keep the athlete's view in input order, not in the order the rules happened to decide.
  const order = new Map(healthWorkouts.map((w, i) => [w.uuid, i]));
  const byInput = (a: string, b: string) => (order.get(a) ?? 0) - (order.get(b) ?? 0);
  out.importRows.sort((a, b) => byInput(a.externalId, b.externalId));
  out.possibleDuplicates = [...pendingDup.values()].sort((a, b) => byInput(a.row.externalId, b.row.externalId));
  out.skipped.sort((a, b) => byInput(a.externalId, b.externalId));
  return out;
}
