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

/** Where each stepper lands on the first tap up from Open — an ordinary session, per activity. */
export const FIRST_TARGET: Record<CardioActivity, { mi: number; paceSec: number; spdMph: number }> = {
  run: { mi: 3, paceSec: 495, spdMph: 17 },
  walk: { mi: 2, paceSec: 1050, spdMph: 17 },
  bike: { mi: 10, paceSec: 495, spdMph: 17 },
  // The machines carry a distance seed but no rate — `RATE_KIND` says 'none', so the pace and speed
  // steppers never appear for them and these figures are never reached.
  row: { mi: 1.5, paceSec: 495, spdMph: 17 },
  elliptical: { mi: 2, paceSec: 495, spdMph: 17 },
  swim: { mi: 0.5, paceSec: 495, spdMph: 17 },
  stair: { mi: 0, paceSec: 495, spdMph: 17 },
};

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
