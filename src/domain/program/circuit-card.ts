/**
 * A WORKOUT APP'S SCREEN, COPIED AS TEXT → THE WORKOUT, BY CODE (AI Road to 10 Sprint 3b, IM-1).
 *
 * A screenshot of a coaching app (the Bridger Logan cards — 32 of the corpus's 61) comes off the card reader in one
 * strict shape, a block at a time:
 *
 *   CIRCUIT                       ← a block of moves done round after round
 *   Rounds: 2                     ← the screen's repeat icon (the card reader copies it; it may sit above or below)
 *   Warm up muscle group          ← the block's heading: a warm-up, a stretch, a finisher, an AMRAP
 *   30s Straight bar stretch      ← one move per line: a count or a clock, then the move
 *   20 Wall Balls
 *
 *   Barbell Squat                 ← a lift on its own: its name (sometimes wrapped onto a second line) …
 *   Rounds: 4
 *   10-8-6-4 reps                 ← … then one count per set, "F" for to failure, or a clock ("20-20-20 sec", "15 min")
 *
 * The AI layout (`workout-tidy`) rewrote these, and lost the shape doing it: a warm-up circuit read as lift 1, a
 * finisher filed under Recovery, every circuit move one set, "Rounds: 8m" as a lift's name (corpus 11-17). The shape
 * is regular enough that code reads it exactly — so when EVERY line of a card fits it, this is the reading, and every
 * number in it is the card's own, placed by the rule that says what it is. One line that does not fit, and this
 * returns null: the card is something else, and goes the way it always did.
 *
 * Pure, relative imports: tested under `node --test` (`circuit-card.test.mjs`).
 */
import type { WrittenExercise, WrittenWorkout } from '../workout/written-workout.ts';

export type CircuitKind = 'warmup' | 'cooldown' | 'work';

export interface CircuitMove {
  name: string;
  /** A count ("20 Wall Balls") — null when the move is a clock or has neither. */
  reps: number | null;
  /** A clock in seconds ("30s", "1m", "2m"). */
  sec: number | null;
}

export type CircuitBlock =
  | { type: 'circuit'; heading: string; kind: CircuitKind; rounds: number | null; clock: number | null; moves: CircuitMove[] }
  | {
      type: 'lift';
      name: string;
      rounds: number | null;
      /** One count per set, "F" = to failure. */
      ladder: (number | 'F')[] | null;
      /** A clock per set ("20-20-20 sec") or one clock ("15 min"). */
      clocks: number[] | null;
    };

const CIRCUIT = /^circuit$/i;
/** "Rounds: 4" (sets) or "Rounds: 8m" (an AMRAP's clock). */
const ROUNDS = /^rounds?\s*:\s*(\d{1,3})\s*(m|min|mins|minutes|s|sec|secs|seconds)?\s*$/i;
/** "30s Straight bar stretch", "1m Alt Arm KB Swing", "20 Wall Balls", "20\tWall Ball Mt Climbers". */
const MOVE = /^(\d{1,3})\s*(s|sec|secs|m|min|mins)?\s+([A-Za-z(].*)$/i;
/** "10-8-6-4 reps", "F-F-F reps", "10-10-10-F reps", "12 reps". */
const LADDER = /^((?:\d{1,3}|F)(?:\s*[-–]\s*(?:\d{1,3}|F))*)\s*reps?\.?$/i;
/** "20-20-20-20-20 sec", "15 min", "3 min", "45 s". */
const CLOCKS = /^(\d{1,3}(?:\s*[-–]\s*\d{1,3})*)\s*(s|sec|secs|seconds|m|min|mins|minutes)\.?$/i;
/** A line that is only a name: letters first (a "(Optional)" in front, "45°" are names too), no clock or count after. */
const NAME = /^(?:\d{1,2}\s+)?[A-Za-z(0-9][^\n]*$/;

const secsOf = (n: number, unit: string | undefined) => (/^m/i.test(unit ?? '') ? n * 60 : n);

function kindOf(heading: string): CircuitKind {
  if (/warm[\s-]?up/i.test(heading)) return 'warmup';
  if (/stretch|cool[\s-]?down|mobility|sore/i.test(heading)) return 'cooldown';
  return 'work';
}

/** "3 Round Finisher", "4 rounds" → 3 / 4. */
const roundsInHeading = (h: string) => {
  const m = /\b(\d{1,2})\s*rounds?\b/i.exec(h);
  return m ? Number(m[1]) : null;
};
/** "20 MIN AMRAP", "AMRAP 25 Min" → seconds. */
const clockInHeading = (h: string) => {
  const m = /\b(\d{1,3})\s*(?:min(?:ute)?s?|m)\b/i.exec(h);
  return m && /amrap|emom|for\s+time/i.test(h) ? Number(m[1]) * 60 : null;
};

/** A numbered heading or name on an app's screen ("2 HIIT CIRCUIT", "1 Sprint Sled Push") — the number is the screen's. */
const unnumber = (s: string) => s.replace(/^\d{1,2}\s+(?=[A-Za-z(])/, '').trim();

/**
 * The card's blocks, or null when any line of it does not fit the shape — then it is not an app's screen, and
 * nothing here is used. Needs at least two blocks and one lift or work circuit; a card of plain prose never fits.
 */
export function readCircuitCard(text: string): CircuitBlock[] | null {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim());
  const blocks: CircuitBlock[] = [];
  let i = 0;
  const at = (k: number) => lines[k] ?? '';
  const skipBlank = () => {
    while (i < lines.length && !lines[i]) i++;
  };
  /** A lift's prescription line starts at `k`, after any "Rounds:" lines. Returns where it is, or -1. */
  const rxAt = (k: number) => {
    let j = k;
    while (ROUNDS.test(at(j))) j++;
    return LADDER.test(at(j)) || CLOCKS.test(at(j)) ? j : -1;
  };

  /** A heading with moves under it and no "CIRCUIT" above — the card reader sometimes leaves the word out. */
  const headsMoves = (k: number) => {
    let j = k + 1;
    while (ROUNDS.test(at(j))) j++;
    return MOVE.test(at(j)) && rxAt(j + 1) < 0;
  };

  skipBlank();
  while (i < lines.length) {
    const line = lines[i];
    const bare = !CIRCUIT.test(line) && NAME.test(line) && !MOVE.test(line) && !ROUNDS.test(line) && !LADDER.test(line) && !CLOCKS.test(line) && rxAt(i + 1) < 0 && headsMoves(i);
    if (CIRCUIT.test(line) || bare) {
      if (!bare) i++;
      let rounds: number | null = null;
      let clock: number | null = null;
      const takeRounds = () => {
        while (ROUNDS.test(at(i))) {
          const m = ROUNDS.exec(at(i))!;
          if (m[2]) clock = secsOf(Number(m[1]), m[2]);
          else rounds = Number(m[1]);
          i++;
        }
      };
      takeRounds();
      const heading = at(i);
      if (!heading || CIRCUIT.test(heading) || LADDER.test(heading) || CLOCKS.test(heading)) return null;
      i++;
      takeRounds();
      /* "3 Round Finisher" keeps its 3 — it is the rounds, not the screen's numbering ("2 HIIT CIRCUIT"). */
      const h = /^\d{1,2}\s+rounds?\b/i.test(heading) ? heading : unnumber(heading);
      rounds ??= roundsInHeading(h);
      clock ??= clockInHeading(h);
      const moves: CircuitMove[] = [];
      while (i < lines.length && lines[i] && !CIRCUIT.test(lines[i])) {
        const l = lines[i];
        const m = MOVE.exec(l);
        /* A count-less line is a move only when the line after it is not its prescription — otherwise it is the
           next lift's name ("Barbell Squat" / "10-8-6-4 reps", with no blank line between, on some screenshots). */
        if (m && !/^rounds?\b/i.test(m[3]) && rxAt(i + 1) < 0) {
          const n = Number(m[1]);
          const timed = !!m[2];
          moves.push({ name: m[3].trim(), reps: timed ? null : n, sec: timed ? secsOf(n, m[2]) : null });
          i++;
          continue;
        }
        if (!m && NAME.test(l) && !ROUNDS.test(l) && !LADDER.test(l) && !CLOCKS.test(l) && rxAt(i + 1) < 0 && rxAt(i + 2) < 0) {
          moves.push({ name: l, reps: null, sec: null });
          i++;
          continue;
        }
        break;
      }
      if (!moves.length) return null;
      blocks.push({ type: 'circuit', heading: h, kind: kindOf(h), rounds, clock, moves });
      skipBlank();
      continue;
    }

    /* A lift: one name line, or a name wrapped onto two ("DB Staggered-Stance" / "Rom deadlift"), then its sets. */
    if (!NAME.test(line) || ROUNDS.test(line) || LADDER.test(line) || CLOCKS.test(line)) return null;
    let nameLines = 1;
    let rx = rxAt(i + 1);
    if (rx < 0 && NAME.test(at(i + 1)) && !CIRCUIT.test(at(i + 1)) && !MOVE.test(at(i + 1))) {
      rx = rxAt(i + 2);
      nameLines = 2;
    }
    if (rx < 0) return null;
    const name = unnumber(lines.slice(i, i + nameLines).join(' '));
    let rounds: number | null = null;
    for (let k = i + nameLines; k < rx; k++) {
      const m = ROUNDS.exec(at(k))!;
      if (!m[2]) rounds = Number(m[1]);
    }
    const p = at(rx);
    const lm = LADDER.exec(p);
    const cm = lm ? null : CLOCKS.exec(p);
    blocks.push({
      type: 'lift',
      name,
      rounds,
      ladder: lm ? lm[1].split(/\s*[-–]\s*/).map((x) => (/^f$/i.test(x) ? 'F' : Number(x))) : null,
      clocks: cm ? cm[1].split(/\s*[-–]\s*/).map((x) => secsOf(Number(x), cm[2])) : null,
    });
    i = rx + 1;
    skipBlank();
  }
  const work = blocks.filter((b) => b.type === 'lift' || b.kind === 'work').length;
  return blocks.length >= 2 && work >= 1 ? blocks : null;
}

const clockWords = (sec: number) => (sec % 60 === 0 ? `${sec / 60} min` : `${sec} seconds`);
const moveWords = (m: CircuitMove) => `${m.sec != null ? (m.sec % 60 === 0 ? `${m.sec / 60}m` : `${m.sec}s`) : m.reps != null ? m.reps : ''} ${m.name}`.trim();

const blank = (name: string, section: WrittenExercise['section']): WrittenExercise => ({
  label: null,
  name,
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

const join = (a: string | null, b: string | null): string | null => (!b ? a : a ? `${a} · ${b}` : b);

/**
 * The blocks as the written reader's own result (`WrittenWorkout`), so the preview, the checks and Create treat it
 * exactly like any other card. Only what the screen says is set:
 *
 *   · a lift's ladder is its sets — one count each ("10-8-6-4" keeps its order), all the same is N × R, "F-F-F" is
 *     every set to failure, a clock ladder ("20-20-20 sec") is that many timed sets;
 *   · a work circuit is a superset; each move is done once a round, so "Rounds: 3" is its sets. An AMRAP's clock
 *     ("Rounds: 8m") is not a set count — its moves stay one set, and the clock goes in the first move's note;
 *   · a warm-up circuit (and a warm-up lift: "(Optional) Stairmaster 3 min", "Warm up Row") is the warm-up line; a
 *     stretch circuit is what comes after. Neither is ever a lift.
 */
export function circuitWorkout(blocks: readonly CircuitBlock[]): WrittenWorkout {
  const how: string[] = [];
  const after: string[] = [];
  const exercises: WrittenExercise[] = [];
  let n = 0;
  const lifted = () => exercises.some((e) => e.section === 'main');
  for (const b of blocks) {
    if (b.type === 'lift') {
      /* A clock-only lift before any lifting whose name says it is optional or a warm-up — the screen's warm-up. */
      const clockOnly = !!b.clocks && b.clocks.length === 1;
      if (clockOnly && !lifted() && /^\(?optional\)?|\bwarm[\s-]?up\b/i.test(b.name)) {
        how.push(`${b.name} ${clockWords(b.clocks![0])}`);
        continue;
      }
      const ex = blank(b.name, 'main');
      n += 1;
      ex.label = String(n);
      if (b.ladder) {
        const nums = b.ladder.filter((x): x is number => x !== 'F');
        if (nums.length === b.ladder.length) {
          if (nums.every((x) => x === nums[0])) {
            ex.sets = nums.length;
            ex.reps = nums[0];
          } else {
            ex.repScheme = nums;
            ex.sets = nums.length;
          }
        } else if (!nums.length) {
          /* "F-F-F reps": every set to failure — `writtenToWeeks` reads the ladder off the note (IM-1, 11-17). */
          ex.sets = b.ladder.length;
          ex.note = `${b.ladder.join('-')} reps`;
        } else {
          /* "10-10-10-F": counted sets, then one to failure. The app holds a count per set, not an "F" among them, so
             the sets are the card's and the last one's words say how it ends. */
          ex.sets = b.ladder.length;
          ex.reps = nums[0];
          ex.note = `${b.ladder.join('-')} reps — the F set is to failure`;
        }
      } else if (b.clocks) {
        ex.sets = b.clocks.length;
        if (b.clocks.every((c) => c === b.clocks![0])) ex.note = `${clockWords(b.clocks[0])} each set`;
        else ex.note = b.clocks.map(clockWords).join(', ');
      }
      /* The repeat icon's count agrees with the ladder on every screen in the corpus; when it does not, the ladder —
         a count per set, written out — is what was prescribed, and the difference is said. */
      if (b.rounds != null && b.rounds !== ex.sets) ex.note = join(ex.note, `The screen says ${b.rounds} rounds`);
      exercises.push(ex);
      continue;
    }

    const words = `${b.heading}${b.rounds ? ` (${b.rounds} rounds)` : ''}: ${b.moves.map(moveWords).join(', ')}`;
    if (b.kind === 'warmup' && !lifted()) {
      how.push(words);
      continue;
    }
    if (b.kind === 'cooldown' || b.kind === 'warmup') {
      after.push(words);
      continue;
    }
    n += 1;
    const group = b.moves.length > 1 ? String(n) : null;
    b.moves.forEach((m, k) => {
      const ex = blank(m.name, 'main');
      ex.group = group;
      ex.label = group ? `${n}${String.fromCharCode(97 + k)}` : String(n);
      ex.sets = b.rounds ?? 1;
      ex.reps = m.reps;
      if (m.sec != null) ex.note = `${clockWords(m.sec)} each set`;
      if (k === 0) ex.note = join(ex.note, b.clock != null ? `${b.heading} — as many rounds as you can in ${clockWords(b.clock)}` : b.heading);
      exercises.push(ex);
    });
  }
  return { name: 'Workout', how: how.length ? `Warm-up: ${how.join('\n')}` : null, after: after.length ? after.join(' · ') : null, exercises, unread: [] };
}

/** The card's words back as one block per paragraph, for the paste box that shows what the read was made from. */
export function circuitCardText(blocks: readonly CircuitBlock[]): string {
  return blocks
    .map((b) =>
      b.type === 'lift'
        ? [b.name, b.rounds != null ? `Rounds: ${b.rounds}` : null, b.ladder ? `${b.ladder.join('-')} reps` : b.clocks!.map((c) => (c % 60 === 0 ? `${c / 60} min` : `${c} sec`)).join('-')]
            .filter(Boolean)
            .join('\n')
        : ['CIRCUIT', b.rounds != null ? `Rounds: ${b.rounds}` : null, b.clock != null ? `Rounds: ${b.clock / 60}m` : null, b.heading, ...b.moves.map(moveWords)].filter(Boolean).join('\n'),
    )
    .join('\n\n');
}
