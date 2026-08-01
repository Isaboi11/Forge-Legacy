/**
 * Cardio blocks — a run, walk or ride authored into a program day and trained inside a session.
 *
 * Pure: no React, no Supabase, so `node --test` can load it.
 *
 * ══ TWO AXES, NOT ONE ══
 *
 * An earlier cut collapsed these into three exercises (Outdoor Run / Treadmill Run / Indoor Run) so the
 * mode WAS the exercise. This restores the handoff's model, by decision: ACTIVITY is what you're doing
 * (run / walk / ride) and MODALITY is where (outdoor / indoor). The activity is authored into the
 * program; the modality is the athlete's on the day, because nobody knows the weather when they write a
 * training block.
 *
 * The price of separating them is `loggedModality` — see below. It is not optional.
 *
 * ══ null IS A VALUE ══
 *
 * `targetMi: null` means the program prescribed NO distance — an open session. It is not zero and must
 * never be coerced to zero: a coerced 0 turns "run what you've got" into a 0-mile target that is
 * permanently, absurdly complete. Same for `targetPaceSec` and `targetSpdMph`.
 */

export type ExerciseKind = 'strength' | 'cardio';
export type CardioActivity = 'run' | 'walk' | 'bike';
export type Modality = 'outdoor' | 'indoor';

export interface CardioBlock {
  activity: CardioActivity;
  /** Derived from activity + modality, never typed by the author. See `deriveName`. */
  name: string;
  /** Derived alongside the name: 'Road' | 'Treadmill' | 'Trainer'. */
  equip: string;
  modality: Modality;
  targetMi: number | null;
  /** Seconds per mile. Run and walk only. */
  targetPaceSec?: number | null;
  /** Miles per hour. Bike only — replaces `targetPaceSec`. */
  targetSpdMph?: number | null;
}

/** What was actually recorded, once it has been. */
export interface CardioResult {
  distanceMi: number | null;
  timeSec: number | null;
  /** Treadmill only. */
  inclinePct: number | null;
  /**
   * ══ WHY THIS EXISTS ══
   *
   * The athlete can flip the Outdoor/Treadmill toggle AFTER logging. Without a record of how the run was
   * actually recorded, a treadmill session flipped to Outdoor renders a solid, GPS-traced route — a lie
   * about where somebody was. Written ONCE, at log time, and it is the sole input to: whether the route
   * draws traced or ghosted, whether Incline appears in the result row, whether the edit form carries an
   * Incline field, and the band caption's wording.
   *
   * The live `modality` toggle chooses which LAYOUT is shown. It must never restyle a recorded result.
   */
  loggedModality: Modality | null;
  source: 'tracked' | 'manual' | null;
}

export const EMPTY_RESULT: CardioResult = {
  distanceMi: null,
  timeSec: null,
  inclinePct: null,
  loggedModality: null,
  source: null,
};

// ── identity ────────────────────────────────────────────────────────────────

export const CARDIO_ACTIVITIES: { key: CardioActivity; name: string; sub: string; symbol: string }[] = [
  { key: 'run', name: 'Run', sub: 'Outdoor or treadmill', symbol: 'shoe' },
  { key: 'walk', name: 'Walk', sub: 'Easy, restorative miles', symbol: 'footprints' },
  { key: 'bike', name: 'Ride', sub: 'Outdoor or trainer', symbol: 'bicycle' },
];

/** The verb a name is built from. Ride, not Bike — you go for a ride. */
export const VERB: Record<CardioActivity, string> = { run: 'Run', walk: 'Walk', bike: 'Ride' };

/**
 * The block always states what it is.
 *
 * A bike gets "Indoor Ride" rather than "Treadmill Ride", which is why this is a function and not a
 * template string: there is no treadmill for a bicycle.
 */
export function deriveName(activity: CardioActivity, modality: Modality): string {
  const verb = VERB[activity];
  if (modality === 'outdoor') return `Outdoor ${verb}`;
  return activity === 'bike' ? 'Indoor Ride' : `Treadmill ${verb}`;
}

export function deriveEquip(activity: CardioActivity, modality: Modality): string {
  if (modality === 'outdoor') return 'Road';
  return activity === 'bike' ? 'Trainer' : 'Treadmill';
}

/**
 * The glyph is keyed off ACTIVITY, never equipment.
 *
 * Setting the modality rewrites `equip`, so keying off it would make Outdoor Run and Outdoor Walk render
 * the same glyph the moment both sat on 'Road'. Modality is already carried by the toggle and the name.
 */
export const activitySymbol = (a: CardioActivity): string =>
  a === 'bike' ? 'bicycle' : a === 'walk' ? 'footprints' : 'shoe';

/** The catalog key a block carries, so it round-trips through the picker, save and template alike. */
export const cardioKey = (a: CardioActivity): string => `cardio:${a}`;

export const isCardioKey = (k: string | null | undefined): boolean => !!k?.startsWith('cardio:');

export function activityFromKey(k: string | null | undefined): CardioActivity | null {
  if (!isCardioKey(k)) return null;
  const rest = k!.slice('cardio:'.length);
  return rest === 'run' || rest === 'walk' || rest === 'bike' ? rest : null;
}

/** A ride measures speed where a run measures pace — this flips strings and both step directions. */
export const usesSpeed = (a: CardioActivity): boolean => a === 'bike';

// ── authored defaults ───────────────────────────────────────────────────────

export const CARDIO_DEFAULTS: Record<CardioActivity, CardioBlock> = {
  run: { activity: 'run', name: 'Outdoor Run', equip: 'Road', modality: 'outdoor', targetMi: 3, targetPaceSec: 495 },
  walk: { activity: 'walk', name: 'Outdoor Walk', equip: 'Road', modality: 'outdoor', targetMi: 2, targetPaceSec: 1050 },
  bike: { activity: 'bike', name: 'Outdoor Ride', equip: 'Road', modality: 'outdoor', targetMi: 10, targetSpdMph: 17 },
};

export const newCardioBlock = (a: CardioActivity): CardioBlock => ({ ...CARDIO_DEFAULTS[a] });

/** Switching modality renames the block and its equipment, and no-ops when already selected. */
export function setModality<T extends CardioBlock>(block: T, modality: Modality): T {
  if (block.modality === modality) return block;
  return { ...block, modality, name: deriveName(block.activity, modality), equip: deriveEquip(block.activity, modality) };
}

// ── steppers: "Open" is the bottom of the scale ─────────────────────────────
//
// There is no checkbox, switch or "no target" option. Stepping below the minimum CLEARS the target.
// One control, one gesture — and four authored combinations fall out of two steppers: 3 mi @ 8:15,
// 3 mi @ any pace, open @ 8:15 (a tempo run of any length), and fully open.

const DIST = { step: 0.5, min: 0.5, max: 26.2, seed: 0.5 };
const PACE = { step: 5, min: 300, max: 1200, seed: 495 };
const SPEED = { step: 0.5, min: 6, max: 30, seed: 17 };

/** Rounded to one decimal each step, or 3 + 0.5 eventually reads 3.5000000000000004. */
export function bumpDistance(current: number | null, dir: 1 | -1): number | null {
  if (current == null) return dir > 0 ? DIST.seed : null;
  const next = Math.round((current + dir * DIST.step) * 10) / 10;
  return next < DIST.min ? null : Math.min(DIST.max, next);
}

/** `+` makes the pace SLOWER, matching the numeral going up. */
export function bumpPace(current: number | null, dir: 1 | -1): number | null {
  if (current == null) return dir > 0 ? PACE.seed : null;
  const next = current + dir * PACE.step;
  return next < PACE.min ? null : Math.min(PACE.max, next);
}

/** `+` makes the speed HIGHER. The direction inverts against pace, and so do the aria labels. */
export function bumpSpeed(current: number | null, dir: 1 | -1): number | null {
  if (current == null) return dir > 0 ? SPEED.seed : null;
  const next = Math.round((current + dir * SPEED.step) * 10) / 10;
  return next < SPEED.min ? null : Math.min(SPEED.max, next);
}

// ── formatting ──────────────────────────────────────────────────────────────

/** "8:15". Seconds floored so a pace never renders as ":60". */
export function fmtPace(secPerUnit: number | null | undefined): string {
  if (secPerUnit == null || !Number.isFinite(secPerUnit) || secPerUnit <= 0) return '--:--';
  const t = Math.floor(secPerUnit);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** "24:45", "1:02:05" — a clock that never hides an hour. */
export function fmtClock(sec: number | null | undefined): string {
  const s = Math.max(0, Math.floor(sec ?? 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return h > 0 ? `${h}:${mm}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
}

/** Slot A in the builder: "3.0" or "Open". Bronze ink on "Open" is what makes it read as authored. */
export const distanceLabel = (mi: number | null, toDisp: (m: number) => number): string =>
  mi == null ? 'Open' : toDisp(mi).toFixed(1);

/** Slot B in the builder: "8:15" / "17.0", or "Any". */
export function effortLabel(b: CardioBlock, toSpeed: (mph: number) => number, toPace: (s: number) => number): string {
  if (usesSpeed(b.activity)) return b.targetSpdMph == null ? 'Any' : toSpeed(b.targetSpdMph).toFixed(1);
  return b.targetPaceSec == null ? 'Any' : fmtPace(toPace(b.targetPaceSec));
}

/** Average pace of a finished bout, seconds per mile. Null when either half is missing or trivial. */
export function avgPaceSec(distanceMi: number | null | undefined, timeSec: number | null | undefined): number | null {
  if (!distanceMi || !timeSec || distanceMi <= 0.05 || timeSec <= 0) return null;
  return timeSec / distanceMi;
}

// ── completion ──────────────────────────────────────────────────────────────

/**
 * A cardio block carries exactly ONE synthetic set.
 *
 * The logger computes progress, the nav rail, the overview and the ceremony by walking `exercise.sets`.
 * Giving a run one set means it counts as one unit of progress, identical to a single-set exercise, and
 * none of that math has to know cardio exists. `weight` stays null so the block contributes zero volume.
 */
export const isLogged = (r: CardioResult | null | undefined): boolean =>
  !!r && r.distanceMi != null && r.timeSec != null;

/**
 * Parse a typed distance. Accepts "3", "3.1" and "3,1" (a comma decimal, which many phone keypads
 * produce); rejects everything else as null rather than NaN, because a NaN reaching the save would store
 * a distance nobody ran.
 */
export function parseDistance(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 500) return null;
  return n;
}
