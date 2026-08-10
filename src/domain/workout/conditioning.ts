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

/**
 * Every kind of conditioning the app can log.
 *
 * ══ THREE SHAPES, NOT ONE ══
 *
 * These are not interchangeable, and pretending otherwise is how a machine ends up lying about itself:
 *
 *  · ROAD-CAPABLE (run, walk, bike) — can happen outdoors under GPS, or indoors on a machine. They have
 *    a pace or a speed, because distance over ground is the thing being measured.
 *  · MACHINES WITH A DISTANCE (row, elliptical, swim) — indoor only. Time and distance are real; a
 *    target PACE is not. A rower's honest metric is a 500 m split and a swimmer's is per-100, neither of
 *    which this app computes, so neither is offered rather than approximated with a per-mile number
 *    nobody in either sport uses.
 *  · MACHINES WITHOUT ONE (stair) — time only. A stair climber counts floors, and floors are not miles.
 *    Converting them would invent a distance the athlete never travelled.
 */
export type CardioActivity = 'run' | 'walk' | 'bike' | 'row' | 'elliptical' | 'swim' | 'stair';
export type Modality = 'outdoor' | 'indoor';

/** Can this happen outside, under GPS? Everything else is a machine and the toggle never appears. */
export const OUTDOOR_CAPABLE: Record<CardioActivity, boolean> = {
  run: true,
  walk: true,
  bike: true,
  row: false,
  elliptical: false,
  swim: false,
  stair: false,
};

/** Is a distance meaningful for it? False for the stair climber, which measures floors. */
export const TRACKS_DISTANCE: Record<CardioActivity, boolean> = {
  run: true,
  walk: true,
  bike: true,
  row: true,
  elliptical: true,
  swim: true,
  stair: false,
};

/**
 * Which rate the athlete thinks in. Runners and walkers hold a PACE (minutes per mile); cyclists hold a
 * SPEED (miles per hour). The machines hold neither — see the type doc above.
 */
export const RATE_KIND: Record<CardioActivity, 'pace' | 'speed' | 'none'> = {
  run: 'pace',
  walk: 'pace',
  bike: 'speed',
  row: 'none',
  elliptical: 'none',
  swim: 'none',
  stair: 'none',
};

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
  { key: 'row', name: 'Row', sub: 'Ergometer, indoors', symbol: 'rower' },
  { key: 'elliptical', name: 'Elliptical', sub: 'Low impact, steady effort', symbol: 'elliptical' },
  { key: 'stair', name: 'Stair Climber', sub: 'Floors, not miles', symbol: 'stairs' },
  { key: 'swim', name: 'Swim', sub: 'Pool lengths', symbol: 'swim' },
];

/** The verb a name is built from. Ride, not Bike — you go for a ride. */
export const VERB: Record<CardioActivity, string> = {
  run: 'Run',
  walk: 'Walk',
  bike: 'Ride',
  row: 'Row',
  elliptical: 'Elliptical',
  swim: 'Swim',
  stair: 'Stair Climb',
};

/**
 * What the block is called when it is NOT outdoors.
 *
 * Was a single ternary special-casing the bike, with the comment "there is no treadmill for a bicycle."
 * That was right, and it generalises: there is no treadmill for a rower either. Each machine states what
 * it actually is rather than borrowing the running machine's name.
 */
const INDOOR_NAME: Record<CardioActivity, string> = {
  run: 'Treadmill Run',
  walk: 'Treadmill Walk',
  bike: 'Indoor Ride',
  row: 'Row',
  elliptical: 'Elliptical',
  swim: 'Pool Swim',
  stair: 'Stair Climb',
};

/**
 * The block always states what it is.
 *
 * A bike gets "Indoor Ride" rather than "Treadmill Ride", which is why this is a function and not a
 * template string: there is no treadmill for a bicycle.
 */
export function deriveName(activity: CardioActivity, modality: Modality): string {
  if (modality === 'outdoor' && OUTDOOR_CAPABLE[activity]) return `Outdoor ${VERB[activity]}`;
  return INDOOR_NAME[activity];
}

const INDOOR_EQUIP: Record<CardioActivity, string> = {
  run: 'Treadmill',
  walk: 'Treadmill',
  bike: 'Trainer',
  row: 'Erg',
  elliptical: 'Elliptical',
  swim: 'Pool',
  stair: 'Stair Climber',
};

export function deriveEquip(activity: CardioActivity, modality: Modality): string {
  if (modality === 'outdoor' && OUTDOOR_CAPABLE[activity]) return 'Road';
  return INDOOR_EQUIP[activity];
}

/**
 * The glyph is keyed off ACTIVITY, never equipment.
 *
 * Setting the modality rewrites `equip`, so keying off it would make Outdoor Run and Outdoor Walk render
 * the same glyph the moment both sat on 'Road'. Modality is already carried by the toggle and the name.
 */
const SYMBOL: Record<CardioActivity, string> = {
  run: 'shoe',
  walk: 'footprints',
  bike: 'bicycle',
  row: 'rower',
  elliptical: 'elliptical',
  swim: 'swim',
  stair: 'stairs',
};
export const activitySymbol = (a: CardioActivity): string => SYMBOL[a];

/** The catalog key a block carries, so it round-trips through the picker, save and template alike. */
export const cardioKey = (a: CardioActivity): string => `cardio:${a}`;

export const isCardioKey = (k: string | null | undefined): boolean => !!k?.startsWith('cardio:');

export function activityFromKey(k: string | null | undefined): CardioActivity | null {
  if (!isCardioKey(k)) return null;
  const rest = k!.slice('cardio:'.length);
  // DERIVED from the list, never a second hardcoded copy of it. The literal triple that stood here was
  // already stale the moment a fourth activity existed: `cardio:row` round-tripped to null, so a rowing
  // block authored into a program would have come back as "not a cardio block at all".
  return CARDIO_ACTIVITIES.some((a) => a.key === rest) ? (rest as CardioActivity) : null;
}

/** A ride measures speed where a run measures pace — this flips strings and both step directions. */
export const usesSpeed = (a: CardioActivity): boolean => RATE_KIND[a] === 'speed';

/** Does this activity offer a rate target at all? The machines do not — see `RATE_KIND`. */
export const hasRateTarget = (a: CardioActivity): boolean => RATE_KIND[a] !== 'none';

// ── authored defaults ───────────────────────────────────────────────────────

/**
 * The shape of each activity — and NOT its targets.
 *
 * A block added to a program starts OPEN: no distance, no pace. It used to arrive as "3 mi @ 8:15",
 * which is a prescription the author never wrote, sitting in their program looking exactly like one
 * they did. Someone who wanted "just go for a run" had to step a target down six times to remove
 * something they never asked for, and someone who didn't notice shipped a number they'd never chosen
 * to everyone who ran that program.
 *
 * So the steppers now start at Open and go UP. Setting a target is a decision; having one is not a
 * default. `CARDIO_DEFAULTS` still exists because the name, equipment and modality genuinely are
 * defaults — those are what the activity IS, not what it demands of you.
 */
export const CARDIO_DEFAULTS: Record<CardioActivity, CardioBlock> = {
  run: { activity: 'run', name: 'Outdoor Run', equip: 'Road', modality: 'outdoor', targetMi: null, targetPaceSec: null },
  walk: { activity: 'walk', name: 'Outdoor Walk', equip: 'Road', modality: 'outdoor', targetMi: null, targetPaceSec: null },
  bike: { activity: 'bike', name: 'Outdoor Ride', equip: 'Road', modality: 'outdoor', targetMi: null, targetSpdMph: null },
  // Machines open INDOORS, because that is the only place they exist. A rower defaulting to "Outdoor
  // Row" would put the athlete one tap from a modality that is not real for it.
  row: { activity: 'row', name: 'Row', equip: 'Erg', modality: 'indoor', targetMi: null },
  elliptical: { activity: 'elliptical', name: 'Elliptical', equip: 'Elliptical', modality: 'indoor', targetMi: null },
  swim: { activity: 'swim', name: 'Pool Swim', equip: 'Pool', modality: 'indoor', targetMi: null },
  stair: { activity: 'stair', name: 'Stair Climb', equip: 'Stair Climber', modality: 'indoor', targetMi: null },
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
//
// THE FIRST STEP UP MATTERS NOW. Blocks start Open, so the seed is no longer the bottom of a scale
// somebody is walking down — it is the value they land on the moment they decide they want a target,
// and it should be the ordinary version of that activity rather than the smallest one the stepper
// allows. Six taps to get from 0.5 to a three-mile run is a toll for having wanted a target at all.

const DIST = { step: 0.5, min: 0.5, max: 26.2, seed: 0.5 };
const PACE = { step: 5, min: 300, max: 1200, seed: 495 };
const SPEED = { step: 0.5, min: 6, max: 30, seed: 17 };

/*
 * ⚠ DECLARED HERE, ABOVE THEIR SECTION, BECAUSE `FIRST_TARGET.swim` IS WRITTEN IN YARDS.
 *
 * `const` is not hoisted. Leaving these beside the pool-unit helpers below put `YD_PER_MI` in the
 * temporal dead zone at the moment `FIRST_TARGET` initialises, which is a module-load crash and not a
 * type error — nothing would have caught it but running the app.
 */
export const YD_PER_MI = 1760;
export const M_PER_MI = 1609.344;
const KM_PER_MI = 1.609344;

/** Where each stepper lands on the first tap up from Open — an ordinary session, per activity. */
export const FIRST_TARGET: Record<CardioActivity, { mi: number; paceSec: number; spdMph: number }> = {
  run: { mi: 3, paceSec: 495, spdMph: 17 },
  walk: { mi: 2, paceSec: 1050, spdMph: 17 },
  bike: { mi: 10, paceSec: 495, spdMph: 17 },
  // The machines carry a distance seed but no rate — `RATE_KIND` says 'none', so the pace and speed
  // steppers never appear for them and these figures are never reached.
  row: { mi: 1.5, paceSec: 495, spdMph: 17 },
  elliptical: { mi: 2, paceSec: 495, spdMph: 17 },
  /* A POOL SESSION, IN THE UNIT A POOL SESSION IS WRITTEN IN — 1000 yd, which is 0.568 mi. The seed
     used to be half a mile because the scale was miles; see `POOL` below for why it no longer is. */
  swim: { mi: 1000 / YD_PER_MI, paceSec: 495, spdMph: 17 },
  stair: { mi: 0, paceSec: 495, spdMph: 17 },
};

// ── DISTANCE IS NOT ALWAYS MEASURED IN MILES ────────────────────────────────
//
// ══ WHY A SWIM NEEDED ITS OWN SCALE ══
//
// `targetMi` is canonical and stays canonical — miles, everywhere, exactly as weight stays pounds. What
// changed is the DISPLAY scale, and for swimming it had to: the mile stepper moves in half-mile steps,
// so the only pool sessions it could express were 880 yd, 1760 yd, 2640 yd. A real swim set is written
// "1200 yd", "2600 yd", "3200 yd" — none of which are reachable, and none of which any swimmer would
// think to convert. The distance was authorable in principle and unauthorable in practice.
//
// So the pool gets yards (or metres, because a metric pool is 25 m and not 27.3 yd), stepped in hundreds.
// Everything else keeps miles/kilometres. Storage never moves.
//
// `YD_PER_MI` / `M_PER_MI` / `KM_PER_MI` are declared up beside the stepper scales — see the note there.

/** The unit a distance is SHOWN in. Swimming is the one activity measured in pool lengths. */
export type DistanceUnit = 'mi' | 'km' | 'yd' | 'm';

/** True for the activities written in pool lengths rather than in road distance. */
export const USES_POOL_UNITS: Record<CardioActivity, boolean> = {
  run: false,
  walk: false,
  bike: false,
  row: false,
  elliptical: false,
  swim: true,
  stair: false,
};

/** Which unit this activity's distance is displayed and stepped in, for this athlete's system. */
export function distanceUnitFor(activity: CardioActivity, metric: boolean): DistanceUnit {
  if (USES_POOL_UNITS[activity]) return metric ? 'm' : 'yd';
  return metric ? 'km' : 'mi';
}

const PER_MILE: Record<DistanceUnit, number> = { mi: 1, km: KM_PER_MI, yd: YD_PER_MI, m: M_PER_MI };

/** Canonical miles → the display unit. */
export const toDistanceIn = (mi: number, unit: DistanceUnit): number => mi * PER_MILE[unit];

/** A display figure → canonical miles. The inverse of `toDistanceIn`, and it must stay exact. */
export const fromDistanceIn = (value: number, unit: DistanceUnit): number => value / PER_MILE[unit];

/**
 * How a distance READS in its own unit — "1200 yd", "3.0 mi".
 *
 * A pool distance is a whole number of lengths and never carries a decimal; a road distance always does,
 * because "3 mi" and "3.0 mi" are the same claim but only one of them looks measured.
 */
export function fmtDistanceIn(mi: number, unit: DistanceUnit): string {
  const v = toDistanceIn(mi, unit);
  return unit === 'yd' || unit === 'm' ? String(Math.round(v)) : v.toFixed(1);
}

/** The pool stepper: hundreds, because that is the grain every swim set in every plan is written on. */
const POOL = { step: 100, min: 100, max: 10_000 };

/**
 * Step a distance IN ITS OWN UNIT, then convert back.
 *
 * Stepping the canonical mile figure would put the rounding in the wrong place: 1200 yd is 0.6818… mi,
 * and a stepper that rounded that to a tenth of a mile would hand back 1197 yd. So the arithmetic happens
 * in the unit the athlete is reading, and only the result is converted.
 *
 * Below the minimum the target CLEARS, which is the same "Open is the bottom of the scale" rule the mile
 * stepper has always followed — there is no separate "no target" control anywhere in this model.
 */
export function bumpDistanceUnit(
  currentMi: number | null,
  dir: 1 | -1,
  unit: DistanceUnit,
  seedMi: number,
): number | null {
  if (unit !== 'yd' && unit !== 'm') return bumpDistance(currentMi, dir, seedMi);
  if (currentMi == null) return dir > 0 ? fromDistanceIn(Math.round(toDistanceIn(seedMi, unit)), unit) : null;
  const next = Math.round(toDistanceIn(currentMi, unit)) + dir * POOL.step;
  if (next < POOL.min) return null;
  return fromDistanceIn(Math.min(POOL.max, next), unit);
}

// ── A BOUT PRESCRIBED BY THE CLOCK ──────────────────────────────────────────
//
// ══ WHY THIS STEPPER DID NOT EXIST, AND HAD TO ══
//
// `targetSec` has been on the model since cardio blocks were built, and Coach Holt writes it on nearly
// every session he generates — "Ride · 75 min steady aerobic". The Program Builder had no control for
// it, so an athlete authoring their own plan could prescribe a ride only as a DISTANCE. Every endurance
// plan in the world is written in minutes, which made the builder unable to express the ordinary case
// while the engine beside it wrote that case all day. This is the missing control, not a new field.

/** Five-minute grain: the unit training plans are actually written on ("45min", "1h45", "2.5h"). */
const DUR = { step: 5 * 60, min: 5 * 60, max: 8 * 3600, seed: 30 * 60 };

/** Where the clock lands on the first tap up from Open — half an hour, an ordinary session. */
export const FIRST_DURATION_SEC = DUR.seed;

/**
 * Step a prescribed duration. Open is the bottom of the scale, exactly as it is for distance and pace:
 * stepping below five minutes CLEARS the target rather than pinning it to a floor nobody chose.
 */
export function bumpDuration(current: number | null, dir: 1 | -1, seed: number = DUR.seed): number | null {
  if (current == null) return dir > 0 ? seed : null;
  const next = current + dir * DUR.step;
  if (next < DUR.min) return null;
  return Math.min(DUR.max, next);
}

/**
 * A prescribed duration as it is spoken — "45 min", "1h 45m", "3h".
 *
 * Hours appear once the bout passes one, because "195 min" is a number nobody says out loud about a ride
 * and "3h 15m" is what is written on the plan it came from.
 */
export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return '';
  const total = Math.round(sec / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Rounded to one decimal each step, or 3 + 0.5 eventually reads 3.5000000000000004. */
export function bumpDistance(current: number | null, dir: 1 | -1, seed: number = DIST.seed): number | null {
  if (current == null) return dir > 0 ? seed : null;
  const next = Math.round((current + dir * DIST.step) * 10) / 10;
  return next < DIST.min ? null : Math.min(DIST.max, next);
}

/** `+` makes the pace SLOWER, matching the numeral going up. */
export function bumpPace(current: number | null, dir: 1 | -1, seed: number = PACE.seed): number | null {
  if (current == null) return dir > 0 ? seed : null;
  const next = current + dir * PACE.step;
  return next < PACE.min ? null : Math.min(PACE.max, next);
}

/** `+` makes the speed HIGHER. The direction inverts against pace, and so do the aria labels. */
export function bumpSpeed(current: number | null, dir: 1 | -1, seed: number = SPEED.seed): number | null {
  if (current == null) return dir > 0 ? seed : null;
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

/**
 * Parse a typed clock into seconds. Accepts `"42:30"`, `"1:05:20"` and a bare `"42"`.
 *
 * ⚠ A BARE NUMBER IS MINUTES, NOT SECONDS, and that is a real decision rather than a convenience.
 * Every field this feeds is a run, ride, row or walk, where the number a person says out loud is
 * minutes — "I did forty-five". Reading `45` as three-quarters of a minute would be arithmetically
 * defensible and would file a marathon as a warm-up. The placeholder says `mm:ss` so the colon form is
 * the one being invited; the bare form is the forgiving fallback, pointed the way people mean it.
 *
 * Rejects rather than clamps: a `null` leaves the previous value standing, which is the safe failure
 * for a field whose whole job is to replace a value.
 */
export function parseClock(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(s)) return null;
  const parts = s.split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return null;

  let total: number;
  if (parts.length === 1) total = parts[0] * 60;
  else if (parts.length === 2) {
    if (parts[1] > 59) return null; // "42:75" is a typo, not 43:15
    total = parts[0] * 60 + parts[1];
  } else {
    if (parts[1] > 59 || parts[2] > 59) return null;
    total = parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  // Twelve hours is past any bout this card logs; beyond it a typo is likelier than a fact.
  if (total <= 0 || total > 12 * 3600) return null;
  return total;
}

/**
 * Parse a typed pace ("8:30" per unit) into seconds. Minutes-and-seconds only — a bare number in a
 * pace field means minutes per mile, so `8` is 8:00.
 */
export function parsePace(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d{1,2}(:\d{1,2})?$/.test(s)) return null;
  const [m, sec = 0] = s.split(':').map(Number);
  if (sec > 59) return null;
  const total = m * 60 + sec;
  // The same window the steppers walk, so typing cannot reach a pace stepping could not.
  if (total < 120 || total > 40 * 60) return null;
  return total;
}

/** Parse a plain positive decimal within a range — speed, incline, anything with no colon in it. */
export function parseWithin(raw: string, min: number, max: number): number | null {
  const cleaned = raw.trim().replace(',', '.').replace('%', '');
  if (!/^\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

// ── what a session IS ───────────────────────────────────────────────────────

/**
 * The `modality` enum value each activity is filed under.
 *
 * The enum has held 'rowing' and 'swimming' since 0001 — the database was ahead of the UI. 'stair' and
 * 'elliptical' are added by migration 0102, deliberately rather than being collapsed into 'other':
 * Activity History groups by this column, and two different machines sharing one bucket would report a
 * month of stair work and elliptical work as the same undifferentiated thing.
 */
export const STORED_TYPE: Record<CardioActivity, string> = {
  run: 'running',
  walk: 'walking',
  bike: 'cycling',
  row: 'rowing',
  swim: 'swimming',
  stair: 'stair_climber',
  elliptical: 'elliptical',
};

/**
 * The activity type a saved session should be filed under, derived from what is actually in it.
 *
 * WHY THIS HAS TO BE DERIVED. A session's `activityType` was hard-coded `'strength'` at every
 * construction site, which was true while the logger only ever held lifts. It stopped being true the
 * moment a run could BE the session: "Outdoor Run" was saved as a strength workout that happened to
 * carry three miles, so Activity History filed it with the bench presses, the rank engine counted it as
 * STRENGTH, and a prior-sessions lookup for run records — which asks for `activity_type = 'running'` —
 * could not see it at all. The distance was right there in the row and nothing would look at it.
 *
 * ONLY a session that is entirely one kind of cardio changes type. A leg day with a cool-down walk is a
 * strength workout; calling it a walk because of the last five minutes would be worse than the bug.
 */
export function sessionActivityType(
  exercises: { kind?: 'strength' | 'cardio'; activity?: CardioActivity }[],
  fallback: string,
): string {
  if (!exercises.length) return fallback;
  const kinds = new Set(exercises.map((e) => (e.kind === 'cardio' ? (e.activity ?? 'run') : 'strength')));
  if (kinds.size !== 1) return fallback;
  const only = [...kinds][0];
  if (only === 'strength') return fallback;
  return STORED_TYPE[only as CardioActivity];
}
