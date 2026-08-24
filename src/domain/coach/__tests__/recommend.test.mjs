/**
 * recommend.test.mjs — Holt reading the shelf.
 *
 * ══ THE SHELF IS THE REAL ONE, READ OFF DISK ══
 *
 * Every case below runs against the sixteen actual `programs/*.json` files, not a fixture. That is
 * deliberate and it is this project's own recorded lesson: *a tidy fixture passed; the real input made
 * 90 junk rows.* A hand-written shelf would let me invent a program that makes the scorer look good, and
 * would go quietly stale the day somebody authors a seventeenth. Reading the directory means a new
 * program either keeps these assertions true or turns one red, which is the only way a test about
 * *"which of these"* can stay honest.
 *
 * ══ WHAT IS ACTUALLY BEING ASSERTED ══
 *
 * Not "the scorer returns something". Four things that would each be a real defect on a phone:
 *
 *   1. **Endurance refuses.** The shelf has no Running programs. A ranker with no floor answers "Run a
 *      marathon" with a barbell block, confidently.
 *   2. **Nothing unreachable is ever recommended.** A home athlete must never be handed a commercial-gym
 *      block — that is an athlete adopting twelve weeks on Monday and finding out on Tuesday.
 *   3. **A beginner is never sent two rungs up**, and is preferred DOWN rather than UP when the rungs
 *      do not line up. The asymmetry is the safety property.
 *   4. **Every recommendation says what it got wrong.** A caveat-free card that does not fit is the
 *      *"confident, specific, false claim about the athlete"* this codebase already has a lesson about.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/recommend.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { recommendFromShelf, roomOf, MATCH_FLOOR, SHELF_CANNOT_ADAPT } from '../recommend.ts';
import { nextQuestion, readyToBuild } from '../chat-core.ts';
import { STRENGTH_GOALS, ENDURANCE_GOALS } from '../constraints.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRAM_DIR = join(HERE, '..', '..', 'training', 'programs');

/** The real catalogue, projected exactly the way the sheet projects it. */
const SHELF = readdirSync(PROGRAM_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(PROGRAM_DIR, f), 'utf8')))
  .map((d) => ({
    id: d.id,
    name: d.name,
    family: d.family,
    difficulty: d.difficulty ?? null,
    durationWeeks: d.durationWeeks,
    frequencyPerWeek: d.frequencyPerWeek,
    environment: d.environment ?? null,
    description: d.description ?? null,
    theme: d.theme ?? null,
    goals: d.goals ?? [],
  }));

const byId = (id) => SHELF.find((p) => p.id === id);
const ask = (over) => recommendFromShelf({ goal: 'strength', experience: 'intermediate', daysPerWeek: 4, environment: 'full_gym', ...over }, SHELF);

const ENVIRONMENTS = ['full_gym', 'home', 'bodyweight', 'outdoor'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const DAYS = [2, 3, 4, 5, 6];

test('the shelf under test is the real one, and it is not empty', () => {
  assert.ok(SHELF.length >= 14, `only ${SHELF.length} programs found — the directory read is wrong`);
  for (const p of SHELF) assert.ok(p.id && p.name && p.family, `${p.id ?? '?'} is missing metadata`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. THE REFUSALS
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ every endurance goal refuses — there is no Running program on the shelf', () => {
  /*
   * The premise, asserted rather than assumed: if somebody authors a Running program this flips, and
   * this test should be the thing that notices rather than an athlete being handed a 5K plan that is
   * secretly a squat block.
   */
  assert.equal(SHELF.filter((p) => p.family === 'Running').length, 0, 'a Running program exists — the refusal below is now wrong');

  for (const goal of ENDURANCE_GOALS) {
    for (const environment of ENVIRONMENTS) {
      const out = recommendFromShelf({ goal, experience: 'intermediate', daysPerWeek: 4, environment }, SHELF);
      assert.equal(out.ok, false, `${goal} in ${environment} was answered from a shelf with no running on it`);
      assert.match(out.reason, /running program/i, `${goal} refuses without saying why`);
    }
  }
});

test('the refusal names the way out, it does not just say no', () => {
  const out = recommendFromShelf({ goal: 'run_marathon', experience: 'beginner', daysPerWeek: 4, environment: 'full_gym' }, SHELF);
  assert.equal(out.ok, false);
  // "let me write you one" — a refusal that ends the conversation is a dead end, which is the thing
  // the Discover link existed to fix in the first place.
  assert.match(out.reason, /write you/i);
});

test('an empty shelf refuses rather than throwing', () => {
  const out = recommendFromShelf({ goal: 'strength', experience: 'beginner', daysPerWeek: 3, environment: 'full_gym' }, []);
  assert.equal(out.ok, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. NOTHING UNREACHABLE — the hard gate
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a program is never recommended into a room it cannot be trained in', () => {
  /*
   * Swept over the whole answerable matrix rather than spot-checked, because this is the failure with a
   * cost outside the app: the athlete adopts it, and discovers on day one that every session opens on a
   * barbell they do not own.
   */
  let checked = 0;
  for (const goal of STRENGTH_GOALS) {
    for (const experience of LEVELS) {
      for (const daysPerWeek of DAYS) {
        for (const environment of ENVIRONMENTS) {
          const out = recommendFromShelf({ goal, experience, daysPerWeek, environment }, SHELF);
          if (!out.ok) continue;
          for (const rec of [out.best, out.runnerUp].filter(Boolean)) {
            const room = roomOf(rec.program.environment);
            checked += 1;
            if (environment === 'full_gym') continue; // a gym runs anything
            if (environment === 'home') {
              assert.ok(room === 'home' || room === 'bodyweight', `${goal}/${experience}/${daysPerWeek}d at home got ${rec.program.id} (${room})`);
            } else {
              assert.equal(room, 'bodyweight', `${goal}/${experience}/${daysPerWeek}d ${environment} got ${rec.program.id} (${room})`);
            }
          }
        }
      }
    }
  }
  assert.ok(checked > 100, `only ${checked} recommendations produced — the sweep is not exercising anything`);
});

test('roomOf reads the authored strings, em-dash and all', () => {
  /*
   * ⚠ THE VALUES CARRY AN EM-DASH AND A KIT LIST — 'Home — dumbbells and an adjustable bench'. An
   * equality test would miss every one of them and a dash-splitting one would break on the next
   * authoring pass. Asserted against the real strings, so the parser cannot drift from the catalogue.
   */
  assert.equal(roomOf('Commercial Gym'), 'full_gym');
  assert.equal(roomOf(byId('bodyweight-foundation').environment), 'bodyweight');
  assert.equal(roomOf(byId('within-reach-dumbbell-3day').environment), 'home');
  assert.equal(roomOf(byId('mobility-foundation').environment), 'home');
  assert.equal(roomOf(null), null);
  assert.equal(roomOf('Somewhere nobody has authored yet'), null, 'an unknown room must not resolve to anywhere');

  // And every shipped program resolves — an unresolvable one is silently unrecommendable forever.
  for (const p of SHELF) assert.ok(roomOf(p.environment), `${p.id} has an environment nothing can read: ${p.environment}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. THE RUNG ASYMMETRY
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a beginner is never handed an Advanced program', () => {
  for (const goal of STRENGTH_GOALS) {
    for (const daysPerWeek of DAYS) {
      for (const environment of ENVIRONMENTS) {
        const out = recommendFromShelf({ goal, experience: 'beginner', daysPerWeek, environment }, SHELF);
        if (!out.ok) continue;
        for (const rec of [out.best, out.runnerUp].filter(Boolean)) {
          assert.notEqual(rec.program.difficulty, 'Advanced', `a beginner (${goal}, ${daysPerWeek}d, ${environment}) was offered ${rec.program.id}`);
        }
      }
    }
  }
});

test('⚠ a beginner after muscle gets the beginner strength block, not the intermediate muscle one', () => {
  /*
   * THE CASE THE SECONDARY-FAMILY TABLE EXISTS FOR, and the one that made the rung penalty directional.
   *
   * Every Muscle Building program on the shelf is INTERMEDIATE. Scored on family alone, a beginner is
   * handed a block whose own authored goal reads "Arrive ready for the block periodization of Muscle
   * Building Advanced" — because it was the only row in its family. It is not that the program is
   * dangerous; it is that it assumes a competence the athlete just told us they do not have.
   */
  assert.ok(
    SHELF.filter((p) => p.family === 'Muscle Building').every((p) => p.difficulty === 'Intermediate'),
    'a beginner Muscle Building program now exists — this test is asserting a premise that has changed',
  );

  const out = ask({ goal: 'muscle', experience: 'beginner', daysPerWeek: 3 });
  assert.equal(out.ok, true);
  assert.equal(out.best.program.difficulty, 'Beginner');
  assert.equal(out.best.program.id, 'strength-foundation-i-3day');
  // And it admits it is not the muscle shelf.
  assert.ok(out.best.caveats.some((c) => /rather than a dedicated one/i.test(c)), 'it swapped families and said nothing');
});

test('an advanced athlete is allowed an easier block, and told it is easier', () => {
  const out = ask({ goal: 'mobility', experience: 'advanced', daysPerWeek: 5 });
  assert.equal(out.ok, true);
  assert.equal(out.best.program.id, 'mobility-foundation'); // the only Mobility program there is
  assert.ok(out.best.caveats.some((c) => /inside what you can already do/i.test(c)));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. THE OBVIOUS ANSWERS ARE THE OBVIOUS ONES
// ─────────────────────────────────────────────────────────────────────────────

test('the clean matches land where a coach would put them', () => {
  const cases = [
    [{ goal: 'strength', experience: 'beginner', daysPerWeek: 3, environment: 'full_gym' }, 'strength-foundation-i-3day'],
    [{ goal: 'strength', experience: 'intermediate', daysPerWeek: 4, environment: 'full_gym' }, 'strength-foundation-ii-4day'],
    [{ goal: 'strength', experience: 'advanced', daysPerWeek: 4, environment: 'full_gym' }, 'strength-builder-i-4day'],
    [{ goal: 'muscle', experience: 'intermediate', daysPerWeek: 4, environment: 'full_gym' }, 'muscle-building-intermediate'],
    [{ goal: 'muscle', experience: 'intermediate', daysPerWeek: 6, environment: 'home' }, 'close-quarters-6day'],
    [{ goal: 'weight_loss', experience: 'beginner', daysPerWeek: 4, environment: 'full_gym' }, 'body-recomposition-foundation'],
    [{ goal: 'conditioning', experience: 'beginner', daysPerWeek: 3, environment: 'full_gym' }, 'athletic-conditioning-foundation'],
    [{ goal: 'conditioning', experience: 'advanced', daysPerWeek: 6, environment: 'full_gym' }, 'iron-and-engine'],
    [{ goal: 'mobility', experience: 'beginner', daysPerWeek: 5, environment: 'home' }, 'mobility-foundation'],
    [{ goal: 'health', experience: 'beginner', daysPerWeek: 3, environment: 'bodyweight' }, 'bodyweight-foundation'],
    [{ goal: 'strength', experience: 'intermediate', daysPerWeek: 3, environment: 'home' }, 'within-reach-dumbbell-3day'],
  ];
  for (const [req, expected] of cases) {
    const out = recommendFromShelf(req, SHELF);
    assert.equal(out.ok, true, `${req.goal}/${req.experience}/${req.daysPerWeek}d/${req.environment} refused`);
    assert.equal(out.best.program.id, expected, `${req.goal}/${req.experience}/${req.daysPerWeek}d/${req.environment}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. THE CARD TELLS THE TRUTH
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ a program that does not match the answers always says so', () => {
  /*
   * The recommendation is allowed to be a stretch. It is not allowed to be a stretch SILENTLY — that is
   * the app asserting a fit it did not achieve, and it is the exact shape of the standing lesson about a
   * confident, specific, false claim.
   */
  for (const goal of STRENGTH_GOALS) {
    for (const experience of LEVELS) {
      for (const daysPerWeek of DAYS) {
        for (const environment of ENVIRONMENTS) {
          const out = recommendFromShelf({ goal, experience, daysPerWeek, environment }, SHELF);
          if (!out.ok) continue;
          const { program, caveats } = out.best;
          const where = `${goal}/${experience}/${daysPerWeek}d/${environment} → ${program.id}`;
          if (program.frequencyPerWeek !== daysPerWeek) {
            assert.ok(caveats.some((c) => c.includes(`${program.frequencyPerWeek} days a week`)), `${where}: wrong days, no caveat`);
          }
          if ((program.difficulty ?? '').toLowerCase() !== experience) {
            assert.ok(caveats.some((c) => /pitched at/i.test(c)), `${where}: wrong rung, no caveat`);
          }
        }
      }
    }
  }
});

test('every recommendation gives at least one real reason', () => {
  const out = ask({ goal: 'strength', experience: 'intermediate', daysPerWeek: 4 });
  assert.equal(out.ok, true);
  assert.ok(out.best.because.length >= 2);
  // The weeks line is always true and always present — the one thing that never needs a caveat.
  assert.ok(out.best.because.some((b) => /weeks, start to finish/.test(b)));
});

test('the score never reaches the athlete', () => {
  /*
   * `score` is ordering, not information. A percentage on the card would invite exactly the comparison
   * this feature exists to spare somebody — and a number derived from a hand-tuned table would be a
   * precision the recommendation does not have.
   */
  const out = ask({});
  assert.equal(out.ok, true);
  const shown = [...out.best.because, ...out.best.caveats].join(' ');
  assert.ok(!/\b\d{2,3}\s*(%|points|score)/i.test(shown), `a score leaked into the copy: ${shown}`);
});

test('the runner-up is a real alternative or it is absent', () => {
  let withRunnerUp = 0;
  for (const goal of STRENGTH_GOALS) {
    for (const experience of LEVELS) {
      const out = recommendFromShelf({ goal, experience, daysPerWeek: 4, environment: 'full_gym' }, SHELF);
      if (!out.ok || !out.runnerUp) continue;
      withRunnerUp += 1;
      assert.notEqual(out.runnerUp.program.id, out.best.program.id, 'the same program twice is not a choice');
      assert.ok(out.runnerUp.score >= MATCH_FLOOR, 'a runner-up below the floor is filler');
      assert.ok(out.best.score - out.runnerUp.score <= 20, 'a distant second is not an alternative');
    }
  }
  assert.ok(withRunnerUp > 0, 'no case ever produced a runner-up — the second option is dead code');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. THE THING HE CANNOT DO
// ─────────────────────────────────────────────────────────────────────────────

test('⚠ the "I cannot bend one around you" line names limitations and offers the alternative', () => {
  /*
   * This flow deliberately never asks about a shoulder or a knee, because a catalogue program cannot
   * honour the answer. The rule from `constraints.ts` on the absent `wrists` flag is the same one:
   * "a checkbox that changes nothing is worse than an absent one". So the limit is STATED.
   */
  assert.match(SHELF_CANNOT_ADAPT, /shoulder|knee/i, 'it does not name what it cannot work around');
  assert.match(SHELF_CANNOT_ADAPT, /write you/i, 'it states the limit without offering the way past it');
});

test('determinism — the same question gets the same answer', () => {
  const req = { goal: 'health', experience: 'intermediate', daysPerWeek: 4, environment: 'full_gym' };
  const a = recommendFromShelf(req, SHELF);
  const b = recommendFromShelf(req, [...SHELF].reverse());
  assert.equal(a.ok, b.ok);
  if (a.ok && b.ok) assert.equal(a.best.program.id, b.best.program.id, 'the input order changed the recommendation');
});


// ─────────────────────────────────────────────────────────────────────────────
// 7. THE QUESTIONNAIRE THAT FEEDS IT
// ─────────────────────────────────────────────────────────────────────────────

/** Walk `askShelf` the way the sheet does: take the first chip of each question until it reports ready. */
function walkShelf(start = {}) {
  let c = { ...start };
  const asked = [];
  for (let i = 0; i < 12; i += 1) {
    const q = nextQuestion(c, 'pick');
    if (!q) break;
    asked.push(q.id);
    const chip = q.chips[0];
    c = { ...c, ...chip.patch, ...(chip.picksRace ? { pickingRace: true } : {}) };
  }
  return { constraints: c, asked };
}

test('the shelf asks four questions, and none of them is one it cannot honour', () => {
  const { asked } = walkShelf();
  assert.deepEqual(asked, ['goal', 'experience', 'days', 'where']);
  /*
   * ⚠ `limits` IS THE ABSENCE THAT MATTERS. A catalogue program is a fixed set of authored sessions —
   * it cannot drop a movement for a bad shoulder the way `assemble()` can. Collecting the answer anyway
   * would be the `wrists` failure `constraints.ts` already refused to ship: "the athlete ticks it,
   * believes they have been heard, and gets the same program".
   */
  assert.ok(!asked.includes('limits'), 'it asked about limitations it cannot act on');
  // And neither of the two a shelf program answers for itself.
  assert.ok(!asked.includes('time'), "the sessions are already written; their length is not the athlete's to set");
  assert.ok(!asked.includes('size'), 'the block is however many weeks its author wrote');
});

test('⚠ a cold-start race reports ready with NO experience recorded, and refuses rather than throwing', () => {
  /*
   * ══ THE CRASH THIS TEST EXISTS FOR ══
   *
   * `askShelf` short-circuits on an endurance goal — it does not ask about a room or a diary, because no
   * answer to either changes the fact that the shelf has no running on it. So it reports READY with
   * `experience` still unset, and the sheet's first cut read `merged.experience!.lifting` straight off
   * it. For a returning athlete that is fine: the level is remembered between conversations. For a
   * brand-new athlete whose very first tap is "Run a race", it was a TypeError — a crash on the one path
   * where Holt was about to say something perfectly sensible.
   */
  const { constraints, asked } = walkShelf({ pickingRace: true });
  assert.deepEqual(asked, ['race_distance'], 'a race must not be interrogated before being refused');
  assert.equal(constraints.experience, undefined, 'the premise of this test has changed');
  assert.equal(readyToBuild(constraints, 'pick'), true);

  // What the sheet then does, with the same defaults it uses — and it must be a refusal, not a read.
  const out = recommendFromShelf(
    {
      goal: constraints.goal,
      experience: constraints.experience?.lifting ?? 'beginner',
      daysPerWeek: constraints.daysPerWeek ?? 3,
      environment: constraints.environment ?? 'full_gym',
    },
    SHELF,
  );
  assert.equal(out.ok, false, 'a race was answered off a shelf with no running on it');
});

test('what the shelf collects is enough to answer with, from cold', () => {
  const { constraints } = walkShelf();
  assert.equal(readyToBuild(constraints, 'pick'), true);
  const out = recommendFromShelf(
    { goal: constraints.goal, experience: constraints.experience.lifting, daysPerWeek: constraints.daysPerWeek, environment: constraints.environment },
    SHELF,
  );
  assert.equal(out.ok, true, 'four answered questions produced no recommendation');
});
