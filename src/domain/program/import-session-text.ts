/**
 * Reading a TRAINING SENTENCE — "75min bike Z2 w/ 3x8min Z3 + 30min upper-body strength".
 *
 * Pure (no JSON, no Supabase, no React) so every rule is unit-testable under `node --test`.
 *
 * ══ WHY THIS EXISTS ══
 *
 * `import-parse.ts` reads a spreadsheet laid out ONE ROW PER EXERCISE, with Sets and Reps in their own
 * columns. That is how a lifting program is kept. It is not how an endurance plan is kept: those are one
 * row per DAY, with a whole session written as prose in a single cell, and the numbers that matter are
 * minutes and yards rather than sets and reps. Pasted into the old reader, a 15-week triathlon plan
 * produced ninety "exercises" named things like "75min bike Z2 w/ 3x8min Z3" at a fabricated 3 × 10.
 *
 * ══ WHAT IT REFUSES TO DO ══
 *
 * The header of `import-parse.ts` states the rule this module inherits: **a parser that silently corrects
 * what somebody trained is worse than one that fails.** So:
 *
 *   · The ORIGINAL PHRASE is kept on every item, verbatim, as its coaching note. Whatever structure is
 *     recognised is a bonus laid on top of text that is never thrown away.
 *   · A number is claimed only when it is unambiguous. "5x(3min jog / 2min walk)" is an interval set and
 *     NOT a three-minute run, so no duration is claimed at all — see `MULTIPLIER`.
 *   · An unrecognised phrase becomes a plain named item rather than being dropped or guessed at.
 *
 * Everything here is a heuristic, and the import preview is what makes that honest: the athlete sees each
 * item and what was read from it before a single row is created.
 */

import type { CardioActivity } from '@/domain/workout/conditioning';

/** One thing to do, read out of a sentence. Mirrors `ParsedItem` in `import-parse.ts`. */
export interface SessionItem {
  /** Verbatim-ish: the phrase with its duration/label furniture trimmed. Never invented. */
  name: string;
  /** The source phrase, whole. Becomes the exercise's coaching note so nothing is lost. */
  note: string;
  kind: 'strength' | 'cardio';
  /** Cardio only. */
  activity?: CardioActivity;
  /** Cardio only, seconds. `null` means the sentence prescribed no clock. */
  targetSec?: number | null;
  /** Cardio only, canonical MILES — yards are converted here, as everywhere else. */
  targetMi?: number | null;
  /** Strength only. Undefined when the sentence gave none, so the caller can mark it assumed. */
  sets?: number;
  reps?: number;
}

const YD_PER_MI = 1760;

/**
 * A day with nothing in it. Matched strictly: "Rest" and "Full Rest Day" are rest, and anything with
 * training in it ("Rest, then 20min easy spin") is not.
 */
const REST = /^(full\s+)?rest(\s*day)?\.?$/i;

export const isRestText = (text: string): boolean => REST.test(text.trim());

/**
 * ⚠ THE GUARD THAT STOPS A NUMBER BEING CLAIMED FROM AN INTERVAL SET.
 *
 * "RUN/WALK reintro 5x(3min easy jog / 2min walk)" contains "3min", and reading it as a three-minute run
 * would state a session a quarter the size of the real one — confidently, and with nothing on screen to
 * suggest it was a guess. A multiplier standing BEFORE a figure means the figure belongs to a rep of
 * something, not to the bout.
 *
 * Position matters: in "75min bike w/ 3x8min Z3" the 75 comes first and IS the bout, so it is claimed and
 * the interval detail survives in the note.
 */
const MULTIPLIER = /\d+\s*[x×]\s*\(?\s*\d/;

/** Which activity a phrase is about, by the EARLIEST keyword in it. */
const ACTIVITY_WORDS: [RegExp, CardioActivity][] = [
  [/\b(bike|biking|ride|riding|cycl\w*|spin|trainer)\b/i, 'bike'],
  // 'jog' and 'marathon' are runs; 'brick run' is caught by 'run' itself.
  [/\b(run|running|jog\w*|marathon|tempo run)\b/i, 'run'],
  [/\b(swim\w*)\b/i, 'swim'],
  [/\b(walk\w*|hike|hiking)\b/i, 'walk'],
  [/\b(row|rowing|erg)\b/i, 'row'],
  [/\b(elliptical)\b/i, 'elliptical'],
  [/\b(stair\w*)\b/i, 'stair'],
];

/**
 * The activity, chosen by POSITION rather than by list order.
 *
 * "4mi run off bike at race pace" names two. The run is what the sentence is about and the bike is what
 * it happened after — and the only reliable signal for that is which one is said first.
 */
export function activityIn(text: string): CardioActivity | null {
  let best: { at: number; activity: CardioActivity } | null = null;
  for (const [re, activity] of ACTIVITY_WORDS) {
    const m = re.exec(text);
    if (m && (best == null || m.index < best.at)) best = { at: m.index, activity };
  }
  return best?.activity ?? null;
}

/** `1h45` → 6300. Tried before the bare-hours form, which would otherwise read it as one hour. */
const HM = /(\d+)\s*h\s*(\d{1,2})\b/i;
/** `2.5h`, `3 hrs`, `1 hour`. */
const HOURS = /(\d+(?:\.\d+)?)\s*h(?:rs?|ours?)?\b/i;
/** `75min`, `45 mins`, `20 minutes`. */
const MINUTES = /(\d+)\s*m(?:in\w*)?\b/i;

/**
 * The clock a phrase prescribes, in seconds — or null when it prescribes none.
 *
 * Null is a real answer and must stay one: an open bout is a thing coaches write, and a fabricated
 * duration is indistinguishable on screen from one the plan actually asked for.
 */
export function durationIn(text: string): number | null {
  const mult = MULTIPLIER.exec(text);
  const claim = (m: RegExpExecArray | null, sec: number): number | null => {
    if (!m) return null;
    // A multiplier standing before this figure means the figure is a rep, not the bout. See MULTIPLIER.
    if (mult && mult.index < m.index) return null;
    return sec;
  };

  const hm = HM.exec(text);
  const fromHm = claim(hm, hm ? Number(hm[1]) * 3600 + Number(hm[2]) * 60 : 0);
  if (fromHm != null) return fromHm;

  const h = HOURS.exec(text);
  const fromH = claim(h, h ? Math.round(Number(h[1]) * 3600) : 0);
  if (fromH != null) return fromH;

  const mi = MINUTES.exec(text);
  return claim(mi, mi ? Number(mi[1]) * 60 : 0);
}

/** `1200yd`, `2100 yards`, `800m` in a pool sense is NOT matched — metres are ambiguous with minutes. */
const YARDS = /(\d+)\s*(?:yd|yds|yard|yards)\b/i;
/**
 * `26.2 miles`, `~56mi`, `5-6mi`.
 *
 * A RANGE IS READ AS ITS FLOOR, which is the convention already used for "6–8 reps" and for a percentage
 * range: the smaller number is the one the athlete is certainly being asked for.
 */
const MILES = /(\d+(?:\.\d+)?)\s*(?:-|–|—)?\s*(?:\d+(?:\.\d+)?)?\s*(?:mi|mile|miles)\b/i;

/** The distance a phrase prescribes, in canonical MILES — or null when it prescribes none. */
export function distanceIn(text: string): number | null {
  const mult = MULTIPLIER.exec(text);

  const yd = YARDS.exec(text);
  if (yd && !(mult && mult.index < yd.index)) return Number(yd[1]) / YD_PER_MI;

  const mi = MILES.exec(text);
  if (mi && !(mult && mult.index < mi.index)) return Number(mi[1]);

  return null;
}

/** `3x10`, `2x15/side`, `3x45s` — the shape a strength bullet is written in. */
const SETS_REPS = /(\d+)\s*[x×]\s*(\d+)/;

/**
 * A fragment that belongs to the phrase BEFORE it rather than standing on its own.
 *
 * "SWIM 1200yd: technique focus, 8x100 Z2 + 4x50 drills + 20min easy row" splits into three on the plus
 * signs, and the middle one — "4x50 drills" — is part of the swim. Made into an item it would appear as
 * a movement called "4x50 drills" sitting beside the swim it is describing.
 */
const CONTINUATION = [
  /^\d+\s*[x×]\s*\d/, // "4x50 drills", "6x100 moderate"
  /^(cool\s*-?\s*down|warm\s*-?\s*up|drills?|cooldown|warmup)\b\.?$/i,
];

const isContinuation = (part: string): boolean => CONTINUATION.some((re) => re.test(part.trim()));

/**
 * Strip the furniture a name does not need — a leading ALL-CAPS label, the duration already captured as
 * a target, and a trailing aside. The NOTE keeps all of it, so nothing here loses information.
 */
export function nameFrom(part: string): string {
  let s = part.trim();
  /*
   * A SHOUTED LABEL, with or without its colon. Plans write both — "UPPER: push-ups 3x10" and "LONG RIDE
   * 2.5h Z2". The colonless form is only safely strippable when a figure follows it, which is what stops
   * this eating an exercise that simply happens to be written in capitals.
   */
  s = s.replace(/^[A-Z][A-Z0-9/&-]*(?:\s+[A-Z0-9/&-]+)*\s*:\s*/, '');
  s = s.replace(/^[A-Z][A-Z/&-]*(?:\s+[A-Z/&-]+)*\s+(?=~?\d)/, '');
  // The target itself, now that it has been captured as a number of its own.
  s = s.replace(/^\d+\s*h\s*\d{1,2}\b/i, '');
  s = s.replace(/^\d+(?:\.\d+)?\s*h(?:rs?|ours?)?\b/i, '');
  s = s.replace(/^\d+\s*m(?:in\w*)?\b/i, '');
  s = s.replace(/^~?\d+\s*(?:yd|yds|yard|yards)\b/i, '');
  s = s.replace(/^~?\d+(?:\.\d+)?\s*(?:-|–|—)?\s*(?:\d+(?:\.\d+)?)?\s*(?:mi|mile|miles)\b/i, '');
  /*
   * A TRAILING scheme — "overhead press 3x8", "plank 3x45s", "1-arm DB row 3x10/side". It is captured as
   * sets and reps, so leaving it in the name would state the prescription twice, once in words and once
   * in the steppers beside them.
   */
  s = s.replace(/\s*\d+\s*[x×]\s*\d+\s*\S*$/i, '');
  s = s.replace(/\s{2,}/g, ' ').replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, '');
  return s.trim();
}

/**
 * Split a cell into the things it asks for.
 *
 * Bullets first (a strength block is written "press 3x8 • row 3x10"), then plus signs (a session is
 * written "75min bike + 30min strength"). A cell uses one convention or the other, so applying both is
 * safe and means neither layout has to be detected.
 */
function splitParts(text: string): { parts: string[]; bulleted: boolean } {
  return {
    parts: text
      .split(/[•·]|\s\+\s/)
      .map((p) => p.trim())
      .filter(Boolean),
    bulleted: /[•·]/.test(text),
  };
}

/**
 * One prose training cell → the items it describes.
 *
 * A rest day returns NOTHING, which is the correct reading: the day has no session in it, and an empty
 * day is dropped from the schedule rather than becoming a session with nothing to do.
 */
export function parseSessionCell(
  text: string,
  opts: {
    /**
     * ⚠ THE CALLER OFTEN KNOWS, AND WHEN IT DOES IT MUST SAY.
     *
     * Classifying by keyword is right for a session sentence and wrong for a list of movements: a
     * "1-arm DB **row**" is a lift, a "**walk**ing lunge" is a lift, and "**Bike**-based strength today"
     * is not a ride. A column headed "Strength & Mobility" is never cardio whatever words appear in it,
     * so the importer says so and the keyword table is not consulted at all.
     */
    strengthOnly?: boolean;
  } = {},
): SessionItem[] {
  const cell = text.trim();
  if (!cell || isRestText(cell)) return [];

  const { parts, bulleted } = splitParts(cell);
  /*
   * A BULLETED cell is a list of movements, for the same reason. Bullets are how a lifting block is
   * written down; a session sentence is written with plus signs.
   */
  const strengthOnly = opts.strengthOnly || bulleted;

  const out: SessionItem[] = [];
  for (const part of parts) {
    // A fragment describing the thing above it — folded into that item's note, not made into a movement.
    if (isContinuation(part) && out.length) {
      out[out.length - 1].note += ` + ${part}`;
      continue;
    }

    /*
     * ══ A STRENGTH COLUMN CAN STILL HOLD A RACE ══
     *
     * `strengthOnly` exists because "1-arm DB **row**" is a lift and "**Bike**-based strength today" is
     * not a ride — a list of movements must not be classified by keyword. But a plan really does put
     * "Utah Valley Marathon 26.2 miles" in that column, and filing a marathon as a lift at 3 × 10 is the
     * same kind of wrong in the other direction.
     *
     * AN EXPLICIT TARGET IS THE DISCRIMINATOR. A phrase that names an activity AND states a distance or
     * a clock is describing a bout; one that merely contains the word is describing a movement. Every
     * lift in the sheet — "1-arm DB row 3x10/side", "walking lunge 2x10/side", "plank 3x45s" — carries
     * sets and reps rather than miles or minutes, so none of them are caught by this.
     */
    const named = activityIn(part);
    const hasTarget = durationIn(part) != null || distanceIn(part) != null;
    const activity = !strengthOnly || hasTarget ? named : null;
    const name = nameFrom(part) || part;

    if (activity) {
      out.push({
        name,
        note: part,
        kind: 'cardio',
        activity,
        targetSec: durationIn(part),
        targetMi: distanceIn(part),
      });
      continue;
    }

    /*
     * No activity word, so this is strength or mobility — "30min upper-body strength", "glute bridge
     * 3x12". Its sets and reps are read when written; when they are not, they are left UNDEFINED rather
     * than defaulted here, so the caller can show the athlete that it filled them in.
     */
    const sr = SETS_REPS.exec(part);
    out.push({
      name,
      note: part,
      kind: 'strength',
      ...(sr ? { sets: Number(sr[1]), reps: Number(sr[2]) } : {}),
    });
  }

  return out;
}

/**
 * Does this text look like a session written out, rather than a single exercise name?
 *
 * Used to decide whether a column of prose should be read by this module at all. Deliberately
 * conservative: a cell has to carry a CLOCK, a DISTANCE or a rest-day statement to qualify, because
 * "Barbell Bench Press" must keep going through the ordinary reader.
 */
export function looksLikeSessionText(text: string): boolean {
  const s = text.trim();
  if (!s) return false;
  if (isRestText(s)) return true;
  if (activityIn(s) && (durationIn(s) != null || distanceIn(s) != null)) return true;
  return /[•·]/.test(s) && SETS_REPS.test(s);
}
