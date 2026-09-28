/**
 * A WORKOUT WRITTEN THE WAY COACHES WRITE THEM → the prescription the logger runs (PO 2026-09-27, Squatober).
 *
 * "The insta page … posts the night before. I want to post the workout in the squad the night before so they
 * can click on it, look at it, and put it in the queue … these workouts have a ton of different things about
 * them and they go off of percentages of your squat max."
 *
 * A Squatober card reads like this, and so do most coaches' daily posts:
 *
 *   "For Those About to SQUAT"   Day: 1
 *   Warm Up: 5 Jumping Jacks, 3 Claps
 *   1. BACK SQUAT 4,6,8,6,4 reps @ 67%
 *      5 total sets, 28 total reps, 2 minutes rest between each set
 *   3.a. SLOW Strict CHIN UP 4 sets of 2-4 reps
 *   super set b. DB RDL's 4 sets of 5 reps
 *      2 min rest between each super set
 *   Recovery: 30 min Walk · Steak & Eggs · 8-9 hrs sleep
 *
 * ══ §4.3 — NO AI INTERPRETATION. THIS IS CODE. ══
 *
 * `Architecture-Amendment-001-Import.md` §4.3: *"Import First, Automate Later … No AI interpretation. No
 * inference."* A photo reaches this only as TEXT (the transcription, which the poster sees and can fix); every
 * rule below is written here and tested against the real cards (`__tests__/written-workout.test.mjs`).
 *
 * ══ PERCENTAGES ARE KEPT — WHY THIS DIFFERS FROM THE TABLE IMPORT ══
 *
 * `import-scheme.ts` discards "65% x 5" loads: *"inventing a target load from somebody else's percentages would
 * be prescribing a number nobody wrote."* That was right before the app could hold a percentage. Here the
 * percentage IS what was written, and `percent-max.ts` turns it into each athlete's own bar from their own max —
 * nothing is invented. A line the reader does not understand is never guessed at: it becomes a note, or it is
 * returned in `unread` so the screen can say so.
 *
 * Pure: no React, no Supabase, no catalogue — names come back as written; the screen resolves them.
 */

export type WrittenSection = 'warmup' | 'main' | 'cooldown';

export interface WrittenExercise {
  /** "1", "3a", "b" — as written, for the preview. */
  label: string | null;
  name: string;
  sets: number;
  /** One rep target for every set. Null when the card gives none (a carry for distance, "100 reps total"). */
  reps: number | null;
  /** "2-4 reps" → reps 2, repsMax 4. */
  repsMax: number | null;
  /** Different reps each set — "4,6,8,6,4". Length = sets. */
  repScheme: number[] | null;
  /** One percentage for every set. */
  percent: number | null;
  /** A percentage per set — "5 @ 65%, 4 @ 75% …". Length = sets. */
  percentScheme: (number | null)[] | null;
  /** Whose max the percentage is of, as written — "bench", "squat". Null = the lift's own. */
  percentOf: string | null;
  /** Rest after every set. */
  restSec: number | null;
  /** Rest after each set, when they differ — "87% rest 20s, 87% rest 20s, 90% rest 2:30". */
  restScheme: (number | null)[] | null;
  /** The author's words that are not numbers — "Aim for 30-40% of bodyweight in each hand", "No bouncing". */
  note: string | null;
  /** Superset membership: the number the letters hang off ("3" for 3a/3b). */
  group: string | null;
  section: WrittenSection;
}

export interface WrittenWorkout {
  name: string;
  /** How the workout runs — the warm-up and any line before the first lift. */
  how: string | null;
  /** What comes after — "Recovery: 30 min walk, steak & eggs, 8-9 hrs sleep". */
  after: string | null;
  exercises: WrittenExercise[];
  /** Lines nothing could be made of, so the poster sees them rather than losing them. */
  unread: string[];
}

/* ── numbers as they are handwritten ─────────────────────────────────────── */

/** "2½", "2 1/2", "2.5", "½" → 2.5 / 0.5. */
function num(s: string): number {
  const t = s.replace(/\s+/g, ' ').trim();
  const half = /½|1\/2/.test(t);
  const whole = t.replace(/½|1\/2/g, '').trim();
  const base = whole ? Number(whole) : 0;
  return Number.isFinite(base) ? base + (half ? 0.5 : 0) : NaN;
}

const NUM = String.raw`\d+(?:\.\d+)?(?:\s*(?:½|1\/2))?|½`;

/** A duration: "2 min", "90 seconds", "2½ min", "0:20", "20s", "2:30". Seconds, or null. */
function seconds(amount: string, unit: string | undefined): number | null {
  if (/:/.test(amount)) {
    const [m, s] = amount.split(':').map(Number);
    return Number.isFinite(m) && Number.isFinite(s) ? m * 60 + s : null;
  }
  const n = num(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return /^m/i.test(unit ?? '') ? Math.round(n * 60) : Math.round(n);
}

/**
 * The rest a line prescribes, or null. "2 minutes rest between each set", "2 to 2½ min rest", "90 seconds rest
 * between each super set", "rest 0:20", "Rest: 2:30".
 *
 * "2 to 2½ min" is a RANGE; the longer end is taken. A rest timer that runs out before the author said you would
 * be ready is worse than one you skip, and Skip is one tap.
 */
export function restOf(line: string): number | null {
  if (!/\brest\b/i.test(line)) return null;
  const range = new RegExp(String.raw`(${NUM})\s*(?:to|-|–)\s*(${NUM})\s*(min(?:ute)?s?|sec(?:ond)?s?|s)\b`, 'i').exec(line);
  if (range) return seconds(range[2], range[3]);
  const clock = /\b(\d{1,2}:\d{2})\b/.exec(line);
  if (clock) return seconds(clock[1], undefined);
  const one = new RegExp(String.raw`(${NUM})\s*(min(?:ute)?s?|mins?|sec(?:ond)?s?|s)\b`, 'i').exec(line);
  if (one) return seconds(one[1], one[2]);
  return null;
}

/** The rest phrase inside a line, to lift out — "2 to 2½ min rest", "90 seconds rest", "rest 0:20". */
const REST_PHRASE = new RegExp(
  String.raw`(?:(?:${NUM})\s*(?:(?:to|-|–)\s*(?:${NUM})\s*)?(?:min(?:ute)?s?|sec(?:ond)?s?|s)\s+rest\b|\brest\s*:?\s*(?:\d{1,2}:\d{2}|(?:${NUM})\s*(?:min(?:ute)?s?|sec(?:ond)?s?|s)\b)|\brest\b)`,
  'i',
);

/** The whole line is about rest and nothing else. */
const REST_ONLY = /^\W*(?:rest\b|\d[\d½.\s/]*(?:to|-|–)?\s*[\d½.\s/]*\s*(?:min|sec|s)\w*\s+rest\b)/i;

/** "125 reps of Biceps" — a lift named after its count, on a line with no number in front. */
const COUNT_FIRST = /^\d{1,4}\s*reps?\s+of\s+[A-Za-z][^%]*$/i;

/** "5 total sets, 28 total reps" — a tally of what the line above already says; never a prescription. */
const TALLY = /\btotal\s+(?:sets|reps)\b/i;

/** "@ 67%", "at 67%", and the handwritten @ a transcription reads as "e": "5 reps e 75%". */
const PCT = /(?:@|\bat\b|\be\b)\s*(\d{1,3}(?:\.\d+)?)\s*%/i;

/** "N reps @ P%" — one set of a ramp, alone on its line (Day 7's five lines under Back Squat). */
const RAMP_LINE = /^\W*(\d{1,3})\s*reps?\s*(?:@|\bat\b|\be\b)\s*(\d{1,3}(?:\.\d+)?)\s*%\W*(?:rest\s+(.+))?$/i;

/** "10/50%" pairs — the SeeSaw's line, left to right. */
const PAIR = /(\d{1,3})\s*\/\s*(\d{1,3}(?:\.\d+)?)\s*%/g;

/** "5@87% rest 20s" items in a comma list. */
const ITEM = /(\d{1,3})\s*(?:reps?\s*)?(?:@|\bat\b|\be\b)\s*(\d{1,3}(?:\.\d+)?)\s*%(?:\s*,?\s*rest\s*(\d{1,2}:\d{2}|[\d½.]+\s*(?:min(?:ute)?s?|sec(?:ond)?s?|s)))?/gi;

/**
 * The leading label of an exercise line: "1.", "1)", "3.a.", "3a", "a.", "super set b.", "Super set b".
 * Returns the number, the letter, whether "super set" was said, and the rest of the line.
 */
function labelOf(line: string): { n: string | null; letter: string | null; superset: boolean; rest: string } | null {
  let s = line.trim();
  let superset = false;
  /* "super set b.", and the card's "super set" written DOWN the margin, which a transcription reads as "super a." on
     one line and "set b." on the next (Season 11, Day 3). Only in front of a letter label. */
  const ss = /^super\s*-?\s*set\b\s*/i.exec(s) ?? /^(?:super|set)\s+(?=[a-e]\s*[.)])/i.exec(s);
  if (ss) {
    superset = true;
    s = s.slice(ss[0].length);
  }
  /* "1." / "1)" / "3.a." / "3. a." / "2._a." — a number is a LABEL only with its point or bracket, or a letter
     glued on ("3a"). "3 Claps" in a warm-up is three claps, not lift number three. */
  const m = /^(\d{1,2})\s*[.)]\s*(?:[,_]?\s*([a-e])\s*[.)])?\s*/i.exec(s) ?? /^(\d{1,2})([a-e])\b[.)]?\s*/i.exec(s);
  if (m) return { n: m[1], letter: m[2]?.toLowerCase() ?? null, superset, rest: s.slice(m[0].length) };
  const l = /^([a-e])\s*[.)]\s*/i.exec(s);
  if (l) return { n: null, letter: l[1].toLowerCase(), superset, rest: s.slice(l[0].length) };
  return superset ? { n: null, letter: null, superset, rest: s } : null;
}

/** Title Case for a shouted card — "BACK SQUAT" → "Back Squat", "DEADlift" → "Deadlift". Leaves "DB"/"KB"/"BB". */
function tidyName(raw: string): string {
  const keep = new Set(['DB', 'KB', 'BB', 'EZ', 'RDL', 'RDLS', 'OHP', 'SSB']);
  return raw
    .replace(/["“”]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => {
      const bare = w.replace(/[^A-Za-z']/g, '').toUpperCase();
      if (keep.has(bare.replace(/'S$/, '').replace(/S$/, '')) || keep.has(bare)) return w.toUpperCase().replace(/'S$/, "'s");
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\bDb\//g, 'DB/');
}

/**
 * Split an exercise line into its NAME and its PRESCRIPTION. The name is everything before the first number
 * that starts the prescription ("4,6,8" / "4 sets" / "4x15" / "5 total" / "10/50%" / "100 reps").
 */
function splitName(rest: string): { name: string; rx: string } {
  const m = /\s(?=\d{1,3}\s*(?:,|x|×|sets?\b|total\b|reps?\b|\/|@|%|yds?\b|yards?\b))/i.exec(` ${rest}`);
  if (!m) return { name: rest.replace(/["“”]/g, '').trim(), rx: '' };
  const at = m.index; // index in the padded string == index of the space before the number in `rest`
  return { name: rest.slice(0, at).trim(), rx: rest.slice(at).trim() };
}

const blank = (section: WrittenSection): WrittenExercise => ({
  label: null,
  name: '',
  sets: 0,
  reps: null,
  repsMax: null,
  repScheme: null,
  percent: null,
  percentScheme: null,
  percentOf: null,
  restSec: null,
  restScheme: null,
  note: null,
  group: null,
  section,
});

/** Read the numbers of a prescription into an exercise. Returns what was NOT understood, for the note. */
function applyRx(ex: WrittenExercise, rx: string, bare = false): string {
  let text = rx;
  const take = (re: RegExp | string) => {
    text = text.replace(re, ' ');
  };
  /* "5 total sets, 15 total reps" beside the lift — a tally, never a note. */
  take(/\b\d{1,3}\s*total\s+(?:sets|reps)\b\s*,?/gi);

  /* A ramp written inline: "5@65%, 4@75%, 3@80%" or with rests "5@87% rest 20s, 5@87% rest 20s, 3@90% rest 2:30". */
  const items = [...text.matchAll(ITEM)];
  if (items.length >= 2) {
    ex.repScheme = items.map((m) => Number(m[1]));
    ex.percentScheme = items.map((m) => Number(m[2]));
    const rests = items.map((m) => (m[3] ? seconds(m[3].replace(/\s*(min\w*|sec\w*|s)$/i, ''), /min/i.test(m[3]) ? 'min' : 's') : null));
    if (rests.some((r) => r != null)) ex.restScheme = rests;
    ex.sets = items.length;
    take(ITEM);
  }

  /* The SeeSaw: "10/50% 5/65% 10/55% 5/70% 10/60%". */
  const pairs = [...text.matchAll(PAIR)];
  if (pairs.length >= 2) {
    ex.repScheme = pairs.map((m) => Number(m[1]));
    ex.percentScheme = pairs.map((m) => Number(m[2]));
    ex.sets = pairs.length;
    take(PAIR);
  }

  /* "4,6,8,6,4 reps" — a different count each set. */
  const scheme = /(\d{1,3}(?:\s*,\s*\d{1,3}){1,19})\s*(?:reps?)?/i.exec(text);
  if (!ex.repScheme && scheme) {
    ex.repScheme = scheme[1].split(',').map((x) => Number(x.trim()));
    ex.sets = ex.repScheme.length;
    take(/(\d{1,3}(?:\s*,\s*\d{1,3}){1,19})\s*(?:reps?)?/i);
  }

  /* "5 reps each leg", "5 each arm", "per side" — said once, kept as the note; the count is per side. */
  const side = /\b(?:each|per)\s+(leg|arm|side|hand)\b/i.exec(text);
  if (side) {
    ex.note = joinNote(ex.note, `Each ${side[1].toLowerCase()}`);
    take(side[0]);
  }

  /* "4 sets of 4 reps", "4x15 reps", "5 sets of 2-4 reps", "5 sets of 30 yds", "10 sets of 10 reps". */
  const sxr = /(\d{1,2})\s*(?:sets?\s*(?:of|x|×)?|x|×)\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*(reps?|yds?|yards?|secs?|seconds?|s|mins?|minutes?)?\b/i.exec(text);
  if (sxr && !ex.repScheme) {
    ex.sets = Number(sxr[1]);
    const unit = (sxr[4] ?? '').toLowerCase();
    if (/^y/.test(unit)) {
      /* A carry for distance: the app counts reps and seconds, not yards, so the distance goes in the note —
         written out, never squeezed into a rep count that would then be summed as volume. */
      ex.reps = null;
      ex.note = joinNote(ex.note, `${sxr[2]} yds each set`);
    } else if (/^(s|sec|min)/.test(unit)) {
      ex.reps = null;
    } else {
      ex.reps = Number(sxr[2]);
      if (sxr[3]) ex.repsMax = Number(sxr[3]);
    }
    take(sxr[0]);
  }

  /* "6 sets" with no count — a lift done for time or distance, or its own call; the sets are what was said. */
  if (!ex.sets && !ex.repScheme) {
    const bareSets = /\b(\d{1,2})\s*sets?\b(?!\s*(?:of|x|×))/i.exec(text);
    if (bareSets && !/\d\s*reps?\b/i.test(text)) {
      ex.sets = Number(bareSets[1]);
      take(bareSets[0]);
    }
  }

  /*
   * A count with no set count: "2 reps @ 80%" is ONE set of two (Season 11 Day 7 — as many as fit in ten minutes,
   * added as they go). Fifty or more is a TOTAL to reach ("100 reps with 33% of your Bench Max", "125 reps of
   * Triceps"), in as many sets as it takes — no rep target, never a 100-rep set.
   */
  const count = !ex.sets && !ex.repScheme ? /(\d{1,4})\s*reps?\b/i.exec(text) : null;
  if (count) {
    const c = Number(count[1]);
    ex.sets = 1;
    if (c >= 50) {
      ex.reps = null;
      ex.note = joinNote(ex.note, `${c} reps total, in as few sets as you can. Add a set each time you rack it.`);
    } else {
      ex.reps = c;
    }
    take(count[0]);
  }

  /*
   * "33% of your Bench Max", "45-50% of Back Squat max", "around 50-60% of your DEAD max", "40-45% of max" — a
   * percentage of a max, maybe ANOTHER lift's. A range takes its LOW end: the gray weight is a starting point the
   * athlete can go up from, and the author's words ("around 50-60%") stay in the note beside it.
   */
  const of = /(?:(?:@|\bat\b)\s*)?(\d{1,3}(?:\.\d+)?)(?:\s*[-–]\s*\d{1,3}(?:\.\d+)?)?\s*%\s*of\s*(?:your\s*)?(back\s*squat|front\s*squat|squat|bench(?:\s*press)?|dead\s*lift|deadlift|dead|overhead\s*press|press|max)\b\s*(?:max)?/i.exec(text);
  if (of) {
    ex.percent = Number(of[1]);
    const whose = of[2].toLowerCase().replace(/\s+/g, '');
    ex.percentOf = whose === 'max' ? null : whose;
    take(of[0]);
  }

  const pct = PCT.exec(text);
  if (pct && ex.percent == null && !ex.percentScheme) {
    ex.percent = Number(pct[1]);
    take(PCT);
  }

  /* On the LIFT's own line only: a bare "67%" (a table cell has no "@"). Never a range's end ("30-40%") and never
     "40% of Bodyweight" — those are the author talking, and belong in the note. */
  if (bare && ex.percent == null && !ex.percentScheme) {
    const b = /(?<![-–\d])(\d{1,3}(?:\.\d+)?)\s*%(?!\s*of)/.exec(text);
    if (b) {
      ex.percent = Number(b[1]);
      take(b[0]);
    }
  }

  const r = restOf(text);
  if (r != null) {
    ex.restSec = r;
    take(/(?:\d[\d½.\s/:]*(?:to|-|–)?\s*[\d½.\s/:]*\s*(?:min(?:ute)?s?|sec(?:ond)?s?|s)?\s*)?rest\b.*$/i);
  }

  return text.replace(/[,;.\s]+/g, ' ').trim();
}

const joinNote = (a: string | null, b: string): string | null => (!b ? a : a ? (a.includes(b) ? a : `${a} · ${b}`) : b);

/** Words that are only the author talking to the page — kept out of notes. */
const FILLER = /^(?:reps?|sets?|total|each|between|super\s*set)$/i;

/**
 * Read a workout written as text. Never throws; an empty or unreadable text gives an empty workout.
 */
export function readWrittenWorkout(text: string): WrittenWorkout {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const out: WrittenWorkout = { name: '', how: null, after: null, exercises: [], unread: [] };
  let section: WrittenSection = 'main';
  let mode: 'head' | 'warm' | 'lifts' | 'after' = 'head';
  let day: string | null = null;
  let cur: WrittenExercise | null = null;
  let lastN: string | null = null;
  /* Set by a heading (Cardio): the next lift starts a new block even if it is written "a." / "b.". */
  let newBlock = false;
  /** A rest belongs to the whole superset when the lift is in one — it falls at the end of the round. */
  const restFor = (ex: WrittenExercise, r: number) => {
    if (ex.group) for (const e of out.exercises) if (e.group === ex.group) e.restSec = r;
    ex.restSec = r;
  };
  let letterGroup = false;
  const how: string[] = [];
  const after: string[] = [];

  const push = (ex: WrittenExercise) => {
    out.exercises.push(ex);
    cur = ex;
  };
  /** The line after this one — a numbered line holding only a quoted title is a block's name when lettered lifts follow it. */
  let nextLine = '';
  /** "3. "Pumped in the Polo"" — the number (and name) the lettered lifts under it take. */
  let blockTitle: { n: string; text: string } | null = null;
  /** Bullets and asterisks are the page's, not the author's words. */
  const unbullet = (l: string) => l.replace(/^[•·▪◦]\s*/, '').trim();

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    nextLine = lines[li + 1] ?? '';
    /* ── the title and the day ── */
    const dayM = /^day\s*:?\s*(\d{1,2})\b/i.exec(line);
    if (dayM) {
      day = dayM[1];
      continue;
    }
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test(line)) continue;
    const quoted = /^["“](.+?)["”]\s*(?:-\s*\w+)?$/.exec(line);
    if (quoted && !out.name) {
      out.name = tidyTitle(quoted[1]);
      continue;
    }

    /* ── the section headings ── */
    const warm = /^warm[\s-]?up\s*:?\s*(.*)$/i.exec(line);
    if (warm) {
      mode = 'warm';
      if (warm[1]) how.push(`Warm-up: ${warm[1]}`);
      else how.push('Warm-up:');
      continue;
    }
    const rec = /^recovery\s*:?\s*(.*)$/i.exec(line);
    if (rec) {
      mode = 'after';
      if (rec[1]) after.push(rec[1]);
      continue;
    }
    const cardio = /^(?:cardio|finisher|conditioning)\s*:?\s*(.*)$/i.exec(line);
    if (cardio) {
      /* The card's "Cardio" is the last block of the SAME workout — curls and shrugs, KB swings — so it stays
         in the main list, and its lines are read like any other. "Planned Day off" is a note, not a lift. */
      mode = 'lifts';
      section = 'main';
      cur = null;
      /* Its lifts carry on the numbering: Day 1's cardio "a. / b." is 5a / 5b, never a second "4a" beside lift 4. */
      newBlock = true;
      if (cardio[1]) handleLift(cardio[1], true);
      continue;
    }

    if (mode === 'after') {
      after.push(unbullet(line));
      continue;
    }

    /*
     * WARM-UP SETS WITH PERCENTAGES — "Hit some Back Squat warm up sets. 5reps @ 60%, 3reps @ 70%, 2reps @ 75%"
     * (Season 11 Day 7). A real warm-up exercise, so its sets get gray weights too; the words stay in the notes.
     */
    if ((mode === 'warm' || mode === 'head') && [...line.matchAll(ITEM)].length >= 2) {
      const before = line.slice(0, line.search(/\d/)).trim();
      const said = [before, ...[...how].reverse()].map((l) => /(?:hit\s+some\s+)?([a-z][a-z\s]*?)\s+warm[\s-]?up\s+sets?/i.exec(l)?.[1]).find(Boolean);
      const ex = blank('warmup');
      applyRx(ex, line);
      ex.name = tidyName(said ?? before ?? 'Warm-up sets');
      if (ex.name) {
        out.exercises.push(ex);
        how.push(line);
        continue;
      }
    }

    handleLift(mode === 'warm' || mode === 'head' ? unbullet(line) : line, false);
  }

  function handleLift(line: string, cardioHead: boolean) {
    /*
     * "* Perform 2 sets of this Cluster." — the rungs above are ONE cluster; do it twice. The scheme is repeated whole,
     * each rung's rest with it: 5@67% rest 30s, 5@67% rest 30s, 5@67% rest 2:30, and again (Season 11 Day 3).
     */
    const cluster = /(?:perform|do|repeat)\s+(\d{1,2})\s*(?:x|×|sets?|rounds?|times)?\s*(?:of\s+)?(?:this|the)\s+cluster/i.exec(line) ?? /repeat\s+(?:this|the)\s+cluster\s+(\d{1,2})\s*(?:x|×|times)/i.exec(line);
    if (cluster && cur && (cur as WrittenExercise).repScheme) {
      const ex = cur as WrittenExercise;
      const times = Math.max(1, Number(cluster[1]));
      const rep = <T,>(xs: T[] | null) => (xs ? Array.from({ length: times }, () => xs).flat() : null);
      const n = ex.repScheme!.length;
      ex.repScheme = rep(ex.repScheme);
      ex.percentScheme = rep(ex.percentScheme);
      ex.restScheme = rep(ex.restScheme ?? (ex.restSec != null ? Array.from({ length: n }, () => ex.restSec) : null));
      ex.sets = ex.repScheme!.length;
      ex.note = joinNote(ex.note, `The cluster, ${times} times through`);
      return;
    }

    /* "Planned Day off" under Cardio — a day off from cardio is not an exercise called that. */
    if (/\bday\s*off\b|\brest\s*day\b|\bnone\b/i.test(line) && !/\d/.test(line)) {
      after.unshift(`Cardio: ${tidySentence(line.toLowerCase())}`);
      return;
    }

    /* One rung of a ramp on its own line: "5 reps @ 65%" — before the rest check, because a rung can carry its
       own rest ("3 reps @ 87% rest 20 sec"). */
    if (RAMP_LINE.test(line) && cur) {
      rampRung(line);
      return;
    }

    /* A tally ("5 total sets, 28 total reps") — says nothing new, except perhaps its rest. Before the rest check,
       so "5 total sets, 40 total reps, 2 min rest" does not leave its tally behind as a note. */
    if (TALLY.test(line) && cur && !labelOf(line)) {
      const r = restOf(line);
      if (r != null) restFor(cur as WrittenExercise, r);
      return;
    }

    /* "125 reps of Biceps" — a new lift even with no number in front, because it names one. */
    if (COUNT_FIRST.test(line) && mode === 'lifts') {
      liftLine(line, null);
      return;
    }

    /* A rest line: belongs to the lift (or superset) above it. */
    if (REST_ONLY.test(line) || (/\brest\b/i.test(line) && !labelOf(line) && cur)) {
      const r = restOf(line);
      if (r != null && cur) {
        const ex = cur as WrittenExercise;
        /* A rest under a superset is the superset's — it falls at the end of the round either way, so every
           member carries it ("30-40% in each hand. 2 min rest" under 3b is 3a's rest too). */
        if (ex.group) {
          for (const e of out.exercises) if (e.group === ex.group) e.restSec = r;
        } else {
          ex.restSec = r;
        }
        /* Whatever else the line says stays, as the author's words — "30-40% in each hand. 2 min rest",
           "2 to 2½ min rest. * No Bouncing". Only the rest phrase itself is taken out. */
        const extra = line
          .replace(REST_PHRASE, ' ')
          .replace(/between\s+(?:each\s+)?(?:super\s*-?\s*sets?|sets?)/gi, ' ')
          .replace(/[*]/g, ' ')
          .replace(/\s*\.\s*/g, '. ')
          .replace(/^[.\s]+|[.\s]+$/g, '')
          .trim();
        if (extra) ex.note = joinNote(ex.note, tidySentence(extra));
        return;
      }
    }

    const lab = labelOf(line);
    /* A lift. Numbered, lettered, or the first line under Cardio. */
    if (lab || cardioHead || (mode === 'lifts' && !cur)) {
      liftLine(line, lab);
      return;
    }

    /* Before the first lift: the warm-up and how the day runs. */
    if (mode === 'head' || mode === 'warm') {
      if (!out.name && mode === 'head' && !/\d/.test(line)) {
        out.name = tidyTitle(line);
        return;
      }
      how.push(line);
      return;
    }

    /* A lift's name that wrapped onto the next line — "Cardio Seated/or Standing BB" / "overhead press" (Season 11
       Day 2). Only while the lift has nothing else yet, and only a few plain words: a sentence is a note. */
    if (cur && mode === 'lifts' && !(cur as WrittenExercise).sets && !(cur as WrittenExercise).repScheme && !(cur as WrittenExercise).percent && !/\d|[.!?:*]/.test(line) && line.split(/\s+/).length <= 4) {
      (cur as WrittenExercise).name = tidyName(`${(cur as WrittenExercise).name} ${line}`);
      return;
    }

    /* Numbers that prescribe the lift above ("5 sets of 5 reps @ 75%" on its own line, the SeeSaw's pairs). */
    if (cur && /\d/.test(line)) {
      const probe = blank(section);
      const left = applyRx(probe, line);
      if (probe.sets || probe.percent != null || probe.restSec != null) {
        const ex = cur as WrittenExercise;
        /* ⚠ NEVER OVER A PRESCRIPTION IT ALREADY HAS. A line under a lift carrying its own sets × reps that was not
           recognised as a lift ("super a. … Pushdowns 6x20", before the reader knew that label) once rewrote the bench
           clusters above it as 6 × 20. It is kept as the author's words instead. */
        if (probe.sets && (ex.sets || ex.repScheme)) {
          ex.note = joinNote(ex.note, tidySentence(line));
          return;
        }
        if (probe.sets) Object.assign(ex, { sets: probe.sets, reps: probe.reps, repsMax: probe.repsMax, repScheme: probe.repScheme, percentScheme: probe.percentScheme });
        if (probe.percent != null) Object.assign(ex, { percent: probe.percent, percentOf: probe.percentOf ?? ex.percentOf });
        if (probe.restSec != null) restFor(ex, probe.restSec);
        /* A SENTENCE that carries numbers ("Get 100 reps with 33% of your Bench Max.") is kept whole as the
           author wrote it — the numbers are read out of it, but the words are not left as fragments. A percentage
           line always is ("use around 50-60% of your DEAD max"): the range and the "around" are the author's. */
        const wordy = probe.percent != null || (left.match(/[A-Za-z]{2,}/g) ?? []).filter((w) => !FILLER.test(w)).length >= 2;
        ex.note = joinNote(ex.note, wordy ? tidySentence(line) : (probe.note ?? ''));
        if (!ex.note) ex.note = null;
        return;
      }
    }

    /* Anything else under a lift is the author talking about it — "Aim to get 30-40% of Bodyweight", "* No Bouncing". */
    if (cur) {
      (cur as WrittenExercise).note = joinNote((cur as WrittenExercise).note, tidySentence(line));
      return;
    }
    out.unread.push(line);
  }

  function rampRung(line: string) {
    const ramp = RAMP_LINE.exec(line);
    if (ramp && cur) {
      const ex = cur as WrittenExercise;
      const firstRung = !ex.percentScheme;
      ex.repScheme = [...(firstRung ? [] : (ex.repScheme ?? [])), Number(ramp[1])];
      ex.percentScheme = [...(firstRung ? [] : ex.percentScheme!), Number(ramp[2])];
      if (ramp[3]) {
        const r = restOf(`rest ${ramp[3]}`);
        const rs = firstRung ? [] : [...(ex.restScheme ?? ex.repScheme.slice(0, -1).map(() => null))];
        rs.push(r);
        ex.restScheme = rs;
      }
      ex.sets = ex.repScheme.length;
      ex.reps = null;
      ex.percent = null;
      return;
    }
  }

  function liftLine(line: string, lab: ReturnType<typeof labelOf>) {
    mode = 'lifts';
    let body = lab ? lab.rest : line;
    const ex = blank(section);
    let n = lab?.n ?? null;
    const letter = lab?.letter ?? null;
    const prev = cur as WrittenExercise | null;
    /* The lettered lifts under a block's title line take its number: "3. "Pumped in the Polo"" → 3a, 3b. */
    if (letter && !n && blockTitle) {
      n = blockTitle.n;
      ex.note = joinNote(ex.note, tidySentence(blockTitle.text));
      blockTitle = null;
    }
    /* "b." / "super set b." carries on the superset above; "3.a" or a fresh "a." after a heading starts one. */
    const continuing = !!prev && !newBlock && !n && ((!!letter && letter !== 'a') || (!letter && !!lab?.superset));
    /* A lift written with no number still gets the next one, so the preview reads 1, 2, 3a, 3b, 4 … 5a, 5b. */
    if (!n && !continuing) n = String(Number(lastN ?? 0) + 1);
    if (n) lastN = n;
    newBlock = false;
    if (continuing) {
      ex.group = prev!.group ?? lastN;
      prev!.group = ex.group;
      if (!prev!.label?.match(/[a-e]$/)) prev!.label = `${ex.group}a`;
      ex.label = `${ex.group}${letter ?? String.fromCharCode(97 + out.exercises.filter((e) => e.group === ex.group).length)}`;
    } else if (letter) {
      ex.group = n;
      ex.label = `${n}${letter}`;
    } else {
      ex.label = n;
    }

    /* A phrase in quotes is the author's name for the set — "Ride the SeeSaw" — not part of the lift's name. */
    const quoted = /["“]([^"”]+)["”]/.exec(body);
    if (quoted && !/same\s+as\s+above/i.test(quoted[1])) {
      const rest = body.replace(quoted[0], ' ').replace(/\s+/g, ' ').trim();
      if (!rest) {
        /* Nothing but a quoted phrase: a block's NAME when lettered lifts follow ("3. "Pumped in the Polo"" → 3a, 3b);
           otherwise the lift's own name ("Cardio "Bodyweight Bulgarians"", its sets on the next line). */
        const next = labelOf(nextLine);
        if (next?.letter && !next.n) {
          blockTitle = { n: n ?? String(Number(lastN ?? 0) + 1), text: quoted[1] };
          if (n) lastN = n;
          return;
        }
        body = quoted[1];
      } else {
        ex.note = joinNote(ex.note, tidySentence(quoted[1]));
        body = rest;
      }
    }

    /* "same as above" — the bench on Day 7 takes the squat's ramp. */
    if (/same\s+as\s+above/i.test(body)) {
      const prev = [...out.exercises].reverse().find((e) => e.repScheme || e.percentScheme || e.percent != null);
      const { name } = splitName(body.replace(/["“”]?\s*same\s+as\s+above\s*["“”]?/i, ''));
      Object.assign(ex, {
        name: tidyName(name),
        sets: prev?.sets ?? 0,
        reps: prev?.reps ?? null,
        repScheme: prev?.repScheme ? [...prev.repScheme] : null,
        percent: prev?.percent ?? null,
        percentScheme: prev?.percentScheme ? [...prev.percentScheme] : null,
        restScheme: prev?.restScheme ? [...prev.restScheme] : null,
        restSec: prev?.restSec ?? null,
      });
      push(ex);
      return;
    }

    /* "125 reps of Triceps" — the count comes first and the lift after it. */
    const countFirst = /^(\d{1,4})\s*reps?\s+of\s+([A-Za-z].*)$/i.exec(body);
    const split = countFirst ? { name: countFirst[2], rx: `${countFirst[1]} reps` } : splitName(body);
    let name = split.name;
    const rx = split.rx;
    /* "DB/or KB Farmers Walk", "EZ Bar/or BB Skullcrushers" — the first is the lift; the other is the author's
       "or", kept as a note. The catalogue matches "DB Farmers Walk"; it does not match the slash. */
    const alt = /^(.*?)\s*\/\s*or\s+(\S+)\s+(.+)$/i.exec(name);
    if (alt && alt[1]) {
      name = `${alt[1]} ${alt[3]}`;
      ex.note = joinNote(ex.note, `Or ${alt[2]}`);
    }
    ex.name = tidyName(name);
    const left = applyRx(ex, rx, true);
    if (left && !left.split(' ').every((w) => FILLER.test(w))) ex.note = joinNote(ex.note, tidySentence(left));
    if (!ex.name) {
      /* A line that only carried numbers ("10/50% 5/65% …") prescribes the lift above it. */
      if (cur && ex.sets) {
        Object.assign(cur, { sets: ex.sets, repScheme: ex.repScheme, percentScheme: ex.percentScheme, reps: ex.reps, percent: ex.percent ?? (cur as WrittenExercise).percent });
        if (ex.restSec != null) (cur as WrittenExercise).restSec = ex.restSec;
        return;
      }
      out.unread.push(line);
      return;
    }
    push(ex);
    return;
  }

  void letterGroup;
  /* A superset of one is not a superset. */
  const counts = new Map<string, number>();
  for (const e of out.exercises) if (e.group) counts.set(e.group, (counts.get(e.group) ?? 0) + 1);
  for (const e of out.exercises) if (e.group && (counts.get(e.group) ?? 0) < 2) e.group = null;

  /* A lift with no set count at all is one set — never an assumed three (the import's own rule, PO 09-27). */
  for (const e of out.exercises) if (!e.sets) e.sets = 1;

  out.name = out.name || (day ? `Day ${day}` : 'Workout');
  if (day && !new RegExp(`\\bday\\s*${day}\\b`, 'i').test(out.name)) out.name = `Day ${day}: ${out.name}`;
  out.how = how.length ? how.join('\n').replace(/^Warm-up:\n/, 'Warm-up: ') : null;
  out.after = after.length ? after.join(' · ') : null;
  return out;
}

function tidyTitle(s: string): string {
  const t = s.replace(/["“”]/g, '').trim();
  return t === t.toUpperCase() || /[A-Z]{3,}/.test(t) ? t.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : t;
}

function tidySentence(s: string): string {
  const t = s.replace(/^[*•\-\s]+/, '').replace(/\s+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/* ── into the shape the app stores ───────────────────────────────────────── */

/** The catalogue key of a max named in words — "bench" → the key its percentages resolve against. */
export const MAX_LIFT_KEYS: Record<string, string> = {
  squat: 'barbell-back-squat',
  backsquat: 'barbell-back-squat',
  frontsquat: 'barbell-front-squat',
  bench: 'barbell-bench-press',
  benchpress: 'barbell-bench-press',
  deadlift: 'barbell-deadlift',
  /* "your DEAD max" — how Squatober writes it. */
  dead: 'barbell-deadlift',
  press: 'barbell-overhead-press',
  overheadpress: 'barbell-overhead-press',
};

/** What a template row needs from a written lift. Structural, so the app's `TemplateExercise` satisfies it. */
export interface WrittenTemplateRow {
  catalogKey: string | null;
  name: string;
  sets: number;
  targetReps: number;
  section: WrittenSection;
  groupId: string | null;
  groupName: string | null;
  groupKind: 'superset' | 'circuit' | null;
  groupRounds: number | null;
  coachNote: string | null;
  repScheme?: number[];
  repsMax?: number;
  percentOfMax?: number;
  percentScheme?: (number | null)[];
  percentOf?: string;
  restSec?: number;
  restScheme?: (number | null)[];
}

/**
 * How a coach writes a lift → how the catalogue names it. Only spellings, never a different exercise: "RDL" IS
 * a Romanian deadlift; "Triceps" is not any particular one, so it stays unmatched and keeps its words.
 */
const SHORTHAND: [RegExp, string][] = [
  [/\bdb\b/gi, 'Dumbbell'],
  [/\bkb\b/gi, 'Kettlebell'],
  [/\bbb\b/gi, 'Barbell'],
  [/\brdl'?s?\b/gi, 'Romanian Deadlift'],
  [/\brear\s+lat(?:eral)?s?\b/gi, 'Rear Delt Fly'],
  [/\bskull\s*crushers?\b/gi, 'Skull Crusher'],
  [/\bfarmers?'?\s*(?:walks?|carry|carries)\b/gi, 'Farmer Carry'],
  [/\bchin\s*ups?\b/gi, 'Chin-Up'],
  [/\bpull\s*ups?\b/gi, 'Pull-Up'],
  [/\bbicep\s+curls?\b/gi, 'Biceps Curl'],
  [/\bone[\s-]arm\b/gi, 'Single-Arm'],
  /* "Bodyweight Bulgarians" (Season 11) — the catalogue's plain Bulgarian split squat IS the bodyweight one. */
  [/\bbodyweight\s+bulgarians?\b/gi, 'Bulgarian Split Squat'],
  [/\bbulgarians\b/gi, 'Bulgarian Split Squat'],
];

/** The words a coach puts in FRONT of a lift to say how to do it — "Slow Strict", "Heavy". A tempo, not a lift. */
const HOW_WORDS = /^(?:(?:slow|strict|heavy|light|paused?|explosive|controlled|tempo)\s+)+/i;

/**
 * The spellings to try, most faithful first: the name as written, then with a coach's HOW words taken off
 * ("Slow Strict Chin Up" → "Chin Up"), then with shorthand expanded and plurals dropped. The EZ bar is a
 * barbell to the catalogue's skull crusher.
 */
export function nameCandidates(name: string): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim();
    if (t && !out.includes(t)) out.push(t);
  };
  const bare = name.replace(HOW_WORDS, '');
  for (const base of [name, bare]) {
    add(base);
    let x = base;
    for (const [re, to] of SHORTHAND) x = x.replace(re, to);
    add(x);
    add(x.replace(/s\b/g, ''));
    add(x.replace(/\bEZ\s*Bar\b/i, 'Barbell'));
    /* "Heavy Alternating DB Curls" → "Alternating Dumbbell Curl": the catalogue puts the grip word first. */
    const alt = /^(.*?)\b(alternating|incline|hammer|seated|standing)\s+(dumbbell|barbell|kettlebell)\s+(.+)$/i.exec(x);
    if (alt) add(`${alt[2]} ${alt[3]} ${alt[4].replace(/s\b/g, '')}`);
    /* "Kettlebell Suitcase/waiter Carry" → "Kettlebell Suitcase Carry", then the other: the author's "either". */
    const slash = /^(.*?)\b(\w+)\s*\/\s*(\w+)\s+(.+)$/.exec(x);
    if (slash) {
      add(`${slash[1]}${slash[2]} ${slash[4]}`);
      add(`${slash[1]}${slash[3]} ${slash[4]}`);
    }
  }
  return out;
}

/** The words taken off the front of the name as a how-to ("Slow Strict"), for the note. */
export function howWordsOf(name: string): string | null {
  const m = HOW_WORDS.exec(name);
  return m ? m[0].trim() : null;
}

/**
 * A written workout → template rows. `resolveKey` is the catalogue lookup (the screen passes
 * `resolveExerciseName`); a name it does not know keeps its written name and no key, as an import does.
 */
export function writtenToTemplate(w: WrittenWorkout, resolveKey: (name: string) => string | undefined): WrittenTemplateRow[] {
  return w.exercises.map((e) => {
    let key: string | null = null;
    for (const c of nameCandidates(e.name)) {
      key = resolveKey(c) ?? null;
      if (key) break;
    }
    /* "Slow Strict Chin Up" matched as Chin-Up: the words that were taken off to match it are HOW to do it,
       so they go at the front of the note, never lost. */
    const how = key && resolveKey(e.name) == null ? howWordsOf(e.name) : null;
    if (how) e = { ...e, note: joinNote(`${how.charAt(0).toUpperCase()}${how.slice(1).toLowerCase()}`, e.note ?? '') };
    const row: WrittenTemplateRow = {
      catalogKey: key,
      name: e.name,
      sets: e.sets,
      /* ZERO when the card gives no count — a carry for distance, "100 reps total" — the logger's rule for "no
         target" (a fabricated 8 would go into the history as reps nobody was asked for). */
      targetReps: e.repScheme?.[0] ?? e.reps ?? 0,
      section: e.section,
      groupId: e.group ? `w${e.group}` : null,
      groupName: null,
      groupKind: e.group ? 'superset' : null,
      groupRounds: null,
      coachNote: e.note,
    };
    if (e.repScheme) row.repScheme = e.repScheme;
    if (e.repsMax != null) row.repsMax = e.repsMax;
    if (e.percentScheme) row.percentScheme = e.percentScheme;
    else if (e.percent != null) row.percentOfMax = e.percent;
    if (e.percentOf) {
      const k = MAX_LIFT_KEYS[e.percentOf];
      if (k) row.percentOf = k;
    }
    if (e.restScheme) row.restScheme = e.restScheme;
    if (e.restSec != null) row.restSec = e.restSec;
    return row;
  });
}

/**
 * A photo's transcription (tab-separated rows from `program-photo-read`, §4.3 — the model copies characters, it
 * decides nothing) → text this reader understands, for the poster to check and fix in the box before posting.
 *
 * A row with an Exercise becomes a numbered lift line; its Sets/Reps cells are written the way a card writes them
 * ("5 sets of 4,6,8,6,4 reps"), and every other cell — a percentage, a rest, a note — follows as written. A row
 * with no exercise (a "Rest 2:00" row, a sentence) is kept as its own line, where it attaches to the lift above.
 */
export function tsvToWrittenText(tsv: string): string {
  const rows = tsv
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.split('\t').map((c) => c.trim()))
    .filter((r) => r.some(Boolean));
  if (!rows.length) return '';
  const head = rows[0].map((h) => h.toLowerCase());
  const has = (n: string) => head.indexOf(n);
  const ex = has('exercise');
  const sets = has('sets');
  const reps = has('reps');
  const time = has('time');
  const known = new Set([ex, sets, reps, time, has('week'), has('day')].filter((i) => i >= 0));
  if (ex < 0) return rows.map((r) => r.filter(Boolean).join(' ')).join('\n');

  const out: string[] = [];
  let n = 0;
  for (const r of rows.slice(1)) {
    const name = r[ex] ?? '';
    const rest = r.filter((c, i) => c && !known.has(i));
    if (!name) {
      const line = [r[sets], r[reps], r[time], ...rest].filter(Boolean).join(' ');
      if (line) out.push(line);
      continue;
    }
    n += 1;
    const s = sets >= 0 ? r[sets] : '';
    const rp = reps >= 0 ? r[reps] : '';
    const t = time >= 0 ? r[time] : '';
    const rx = s && rp ? `${s} sets of ${rp} reps` : rp ? `${rp} reps` : s ? `${s} sets` : '';
    out.push([`${n}.`, name, rx, t, ...rest].filter(Boolean).join(' '));
  }
  return out.join('\n');
}

/* ── back to words — so a posted workout can be edited in the same box it was written in ────────────────── */

/** Whose max, in the words this reader takes back ("45% of back squat max"). The inverse of `MAX_LIFT_KEYS`. */
const MAX_WORDS: Record<string, string> = {
  'barbell-back-squat': 'back squat',
  'barbell-front-squat': 'front squat',
  'barbell-bench-press': 'bench',
  'barbell-deadlift': 'deadlift',
  'barbell-overhead-press': 'overhead press',
};

const clockText = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

/**
 * A posted workout → text this reader reads back to the SAME workout (PO 2026-09-28: "edit posts"). The poster edits
 * words, never a form — the same box, the same live preview. `writtenToTemplate(readWrittenWorkout(text))` of what
 * this returns equals the rows it was given; `roundTrips` checks exactly that before an edit is offered, so a post
 * this cannot express faithfully is never silently changed by being opened and saved.
 */
export function rowsToWrittenText(w: { name: string; how?: string | null; after?: string | null; rows: readonly WrittenTemplateRow[] }): string {
  const out: string[] = [`"${w.name}"`];
  const itemCount = (l: string) => [...l.matchAll(ITEM)].length;
  const howLines = (w.how ?? '').split('\n').filter((l) => l.trim() && itemCount(l) < 2);
  if (howLines.length && !/^warm[\s-]?up\b/i.test(howLines[0])) out.push('Warm up:');
  out.push(...howLines);

  const rx = (r: WrittenTemplateRow): { line: string; note: string | null } => {
    let note = r.coachNote ?? null;
    const of = r.percentOf && MAX_WORDS[r.percentOf] ? ` of ${MAX_WORDS[r.percentOf]} max` : '';
    if (r.percentScheme?.length) {
      const reps = r.repScheme ?? r.percentScheme.map(() => r.targetReps);
      return {
        line: reps.map((x, i) => `${x} reps @ ${r.percentScheme![i]}%${r.restScheme?.[i] != null ? ` rest ${clockText(r.restScheme[i]!)}` : ''}`).join(', '),
        note,
      };
    }
    const pct = r.percentOfMax != null ? ` @ ${r.percentOfMax}%${of}` : '';
    if (r.repScheme?.length) return { line: `${r.repScheme.join(',')} reps${pct}`, note };
    /* No count (a carry for yards — its distance is already in the note, "30 yds each set" — or "100 reps total"):
       just the sets, and the note exactly as it stands, so nothing in it is said twice or moves. */
    const reps = r.targetReps ? ` of ${r.targetReps}${r.repsMax ? `-${r.repsMax}` : ''} reps` : '';
    return { line: `${r.sets} ${r.sets === 1 ? 'set' : 'sets'}${reps}${pct}`, note };
  };

  for (const r of w.rows.filter((x) => x.section === 'warmup')) {
    if (r.percentScheme?.length) out.push(`${r.name} warm up sets: ${rx(r).line}`);
  }

  let n = 0;
  const main = w.rows.filter((x) => x.section !== 'warmup');
  for (let i = 0; i < main.length; i++) {
    const r = main[i];
    const inGroup = !!r.groupId;
    const first = !inGroup || main[i - 1]?.groupId !== r.groupId;
    const last = !inGroup || main[i + 1]?.groupId !== r.groupId;
    if (first) n += 1;
    const letter = inGroup ? String.fromCharCode(97 + main.slice(0, i).filter((x) => x.groupId === r.groupId).length) : '';
    const { line, note } = rx(r);
    const head = !inGroup ? `${n}.` : first ? `${n}. ${letter}.` : `super set ${letter}.`;
    out.push(`${head} ${r.name} ${line}`);
    if (note) out.push(`* ${note}`);
    /* One rest for the lift — or, in a superset, once after its last member: the round's rest. */
    if (!r.restScheme?.length && r.restSec != null && (!inGroup || last)) out.push(`rest ${clockText(r.restSec)}${inGroup ? ' between each super set' : ''}`);
  }
  if (w.after) out.push(`Recovery: ${w.after}`);
  return out.join('\n');
}

/**
 * Would these rows come back exactly from their own text? Only then is "Edit the workout" offered — a posted workout
 * that went up from a saved template may carry something the text cannot say, and opening and saving it must never
 * quietly change it.
 */
export function roundTrips(w: { name: string; how?: string | null; after?: string | null; rows: readonly WrittenTemplateRow[] }, resolveKey: (name: string) => string | undefined): boolean {
  const back = readWrittenWorkout(rowsToWrittenText(w));
  const rows = writtenToTemplate(back, resolveKey);
  /* ⚠ KEY ORDER IS NOT MEANING. A post comes back out of Postgres `jsonb`, which re-orders an object's keys (shortest
     first), so a plain JSON.stringify would call every stored workout "changed" and never offer the edit. Keys are
     sorted; values — every number, every note — must match exactly. */
  const stable = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, stable((v as Record<string, unknown>)[k])])) : v;
  const norm = (r: WrittenTemplateRow) => JSON.stringify(stable({ ...r, groupId: r.groupId ? 'g' + r.groupId.replace(/\D/g, '') : null }));
  return (
    back.name === w.name &&
    (back.after ?? null) === (w.after ?? null) &&
    rows.length === w.rows.length &&
    rows.every((r, i) => norm(r) === norm(w.rows[i] as WrittenTemplateRow))
  );
}
