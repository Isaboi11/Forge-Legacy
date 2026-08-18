import { test } from 'node:test';
import assert from 'node:assert/strict';
import { composeHome, isHomeReady, selectHomePrograms, HOME_READY_CEILING_MS } from '../composition.ts';

/** A settled athlete with nothing going on — the base every case below varies one field from. */
const BASE = {
  chapterLoading: false,
  awaiting: false,
  startChosen: false,
  hasProgram: false,
  hasProgramSession: false,
  hasPlannedWorkout: false,
  resumeSets: null,
  guidedOnRamp: false,
  hasSuggestion: false,
  guidedPathOpen: false,
};

const compose = (over = {}) => composeHome({ ...BASE, ...over });

/**
 * THE DEFECT THIS MODULE EXISTS TO FIX. An athlete who trains day to day and never builds a program used to
 * get no hero, no Start Workout button, no goal tile, and a card reading "You don't have a program yet" —
 * forever, since `awaiting` goes false the moment they log their first session.
 */
test('the day-to-day athlete gets a Start Workout hero and their goal tile, and is asked nothing', () => {
  const c = compose();
  assert.equal(c.hero, 'open');
  assert.equal(c.startingPoint, 'none', 'no chooser — the question was answered by them training');
  assert.equal(c.showMissionTile, true, 'their goal never depended on a program');
  assert.equal(c.showProgramTile, false);
  assert.equal(c.showQuietProgramLink, true, 'available, subordinate');
  assert.equal(c.heroOffersFreestyle, false, 'the button already opens the freestyle/cardio choice');
});

test('the brand-new athlete keeps the chooser, and is not handed a goal tile on arrival', () => {
  const c = compose({ awaiting: true });
  assert.equal(c.startingPoint, 'chooser');
  assert.equal(c.hero, 'none', 'nothing to resume, nothing to run — the chooser IS the offer');
  assert.equal(c.showMissionTile, false);
  assert.equal(c.showQuietProgramLink, false, 'the chooser already holds both program doors');
});

test('an athlete with a program is composed exactly as before', () => {
  const c = compose({ hasProgram: true, hasProgramSession: true });
  assert.equal(c.hero, 'program');
  assert.equal(c.heroOffersFreestyle, true, '"Something else today?" still offered over a planned day');
  assert.equal(c.startingPoint, 'none');
  assert.deepEqual([c.showProgramTile, c.showMissionTile], [true, true]);
  assert.equal(c.showQuietProgramLink, false, 'they have one');
});

/**
 * Precedence, not preference. The logger treats a launch intent landing on top of logged work as a conflict
 * and prompts for it — so offering the program day here would walk the athlete into a question they did not
 * ask. `continueWorkout` writes no intent for the same reason.
 */
test('unfinished work outranks a program day', () => {
  const c = compose({ hasProgram: true, hasProgramSession: true, resumeSets: 12 });
  assert.equal(c.hero, 'resume');
  assert.equal(c.heroOffersFreestyle, true);
});

test('unfinished work is offered to the brand-new athlete too', () => {
  // They started a session and quit before saving, so `workout_count` is still 0 and they read as awaiting.
  // Continue was unreachable for them as well.
  const c = compose({ awaiting: true, resumeSets: 3 });
  assert.equal(c.hero, 'resume');
});

/*
 * ══ CHOOSING IS THE ANSWER ══
 *
 * "Settled" used to mean only "has logged a workout", which is one beat after the athlete decides. The
 * visible failure: tap "Start a freestyle workout", train, come back before saving, and Home showed the
 * Continue card with "How do you want to start?" printed underneath it — the question asked again, over
 * the evidence that it had been answered.
 */
test('picking a door closes the question, before any workout is saved', () => {
  const c = compose({ awaiting: true, startChosen: true });
  assert.equal(c.startingPoint, 'none', 'they answered — do not ask again');
  assert.equal(c.hero, 'open', 'the same hero a program athlete gets, in its no-program face');
  assert.equal(c.showQuietProgramLink, true, 'and the subtle route to a program comes with it');
  assert.equal(c.showMissionTile, true);
});

test('mid-session, the chooser is never printed under the Continue card', () => {
  const c = compose({ awaiting: true, startChosen: true, resumeSets: 4 });
  assert.equal(c.hero, 'resume');
  assert.equal(c.startingPoint, 'none');
});

test('a chosen freestyle athlete is composed exactly like one who has already trained', () => {
  const chose = compose({ awaiting: true, startChosen: true });
  const trained = compose({ awaiting: false, startChosen: false });
  assert.deepEqual(chose, trained, 'the two routes to settled must produce one screen');
});

test('the question survives until it is actually answered', () => {
  // Landing on Home, opening a sheet, closing it — none of that is a choice.
  assert.equal(compose({ awaiting: true, startChosen: false }).startingPoint, 'chooser');
  assert.equal(compose({ awaiting: true, startChosen: false }).hero, 'none');
});

test('resumeSets 0 is real unfinished work, not absence — only null means nothing to resume', () => {
  // Home passes null when `hasLoggedWork` is false, so a 0 that reaches here would be a genuine session.
  assert.equal(compose({ resumeSets: 0 }).hero, 'resume');
  assert.equal(compose({ resumeSets: null }).hero, 'open');
});

/**
 * `useQuery` starts at `data: null`. Before this, the first frame of a brand-new athlete's first launch
 * already flashed "You don't have a program yet" — one frame, and the worst possible one to say it on.
 */
test('the loading frame claims nothing about the athlete', () => {
  const c = compose({ chapterLoading: true, awaiting: true });
  assert.deepEqual(c, {
    hero: 'none',
    heroOffersFreestyle: false,
    startingPoint: 'none',
    showQuietFreestyle: false,
    showQuietProgramLink: false,
    showMissionTile: false,
    showProgramTile: false,
  });
});

test('…except unfinished work, which is local and therefore knowable on the first frame', () => {
  const c = compose({ chapterLoading: true, resumeSets: 5 });
  assert.equal(c.hero, 'resume');
  assert.equal(c.showMissionTile, false, 'still says nothing it would have to take back');
});

test('a program that yields no session still gets a Start Workout button', () => {
  // Previously this athlete got no hero AND no chooser — a Home with nothing to press.
  const c = compose({ hasProgram: true, hasProgramSession: false });
  assert.equal(c.hero, 'open');
  assert.equal(c.showProgramTile, true);
});

test('the guided on-ramp faces are reachable only while awaiting without a program', () => {
  assert.equal(compose({ awaiting: true, hasSuggestion: true }).startingPoint, 'suggestion');
  assert.equal(compose({ awaiting: true, guidedPathOpen: true }).startingPoint, 'intake');
  // A suggestion outranks a half-open stepper — they already finished it.
  assert.equal(
    compose({ awaiting: true, hasSuggestion: true, guidedPathOpen: true }).startingPoint,
    'suggestion',
  );
  assert.equal(
    compose({ awaiting: true, hasProgram: true, hasSuggestion: true }).startingPoint,
    'none',
    'a program ends the question',
  );
});

/**
 * ⚠ THE QUIET "OR JUST TRAIN TODAY" IS RETIRED, BECAUSE IT BECAME THE THING IT GUARDED AGAINST.
 *
 * It used to appear only when the chooser's own first card was NOT "Start a freestyle workout" — its
 * entire job was to stop the same offer being made twice on one card. The chooser is now three fixed
 * doors and **"Just train today" is permanently one of them**, so there is no state left in which the
 * link is anything but the second copy.
 *
 * Kept as a field rather than deleted: it is part of the composition's contract, and a flag that is
 * honestly always false is easier to read than one quietly removed.
 */
test('"Or just train today" is never drawn — the chooser always carries that door itself', () => {
  for (const guidedOnRamp of [true, false])
    for (const awaiting of [true, false])
      for (const startChosen of [true, false]) {
        assert.equal(
          compose({ awaiting, guidedOnRamp, startChosen }).showQuietFreestyle,
          false,
          `guided=${guidedOnRamp} awaiting=${awaiting} chosen=${startChosen}`,
        );
      }
});

/** Two ways to say "start something" on one card is not two choices — it is one choice, said twice. */
test('freestyle is never offered twice on the same card, in any state', () => {
  for (const chapterLoading of [true, false])
    for (const awaiting of [true, false])
      for (const hasProgram of [true, false])
        for (const hasProgramSession of [true, false])
          for (const resumeSets of [null, 4])
            for (const guidedOnRamp of [true, false]) {
              const c = compose({
                chapterLoading, awaiting, hasProgram, hasProgramSession, resumeSets, guidedOnRamp,
              });
              const state = JSON.stringify({ chapterLoading, awaiting, hasProgram, resumeSets, guidedOnRamp });
              assert.ok(
                !(c.hero === 'open' && c.heroOffersFreestyle),
                `open hero must not repeat its own button: ${state}`,
              );
              assert.ok(
                !(c.showQuietFreestyle && c.startingPoint !== 'chooser'),
                `quiet freestyle without a chooser: ${state}`,
              );
            }
});

/**
 * THE INVARIANT THAT ACTUALLY MATTERS. "You don't have a program yet" — the copy H-1 §6 forbids — has
 * exactly one source in the app: the chooser. So the guarantee to hold is that the chooser cannot draw
 * for a settled athlete, in any combination of the other inputs. If it can't draw, it can't be said.
 *
 * Note the slot is NOT mutually exclusive with the hero in general: an awaiting athlete who finished the
 * intake sees the suggested program's day as the hero AND the suggestion card below it, which is the
 * existing, deliberate behaviour (the recommendation feeds Home's real slots rather than a card of its own).
 */
test('the "no program yet" chooser can never draw for an athlete who has trained or chosen', () => {
  for (const [settledBy, over] of [['trained', { awaiting: false }], ['chose', { awaiting: true, startChosen: true }]])
    for (const hasProgram of [true, false])
      for (const hasProgramSession of [true, false])
        for (const resumeSets of [null, 7])
          for (const guidedOnRamp of [true, false])
            for (const hasSuggestion of [true, false])
              for (const guidedPathOpen of [true, false]) {
                const c = compose({
                  ...over, hasProgram, hasProgramSession, resumeSets,
                  guidedOnRamp, hasSuggestion, guidedPathOpen,
                });
                assert.equal(
                  c.startingPoint,
                  'none',
                  `slot drew for an athlete settled by ${settledBy}: ${JSON.stringify({ hasProgram, hasSuggestion, guidedPathOpen })}`,
                );
              }
});

test('the program tile follows the program and nothing else', () => {
  for (const awaiting of [true, false])
    for (const resumeSets of [null, 2])
      for (const hasProgramSession of [true, false]) {
        assert.equal(compose({ hasProgram: true, awaiting, resumeSets, hasProgramSession }).showProgramTile, true);
        assert.equal(compose({ hasProgram: false, awaiting, resumeSets, hasProgramSession }).showProgramTile, false);
      }
});

// ── which program Home may speak for ─────────────────────────────────────────

const p = (id, state) => ({ id, state });

test('an active program is both the anchor and the session source', () => {
  const s = selectHomePrograms([p('a', 'active')]);
  assert.equal(s.active?.id, 'a');
  assert.equal(s.anchor?.id, 'a');
});

test('a PLANNED program anchors the tile but never yields a session', () => {
  const s = selectHomePrograms([p('b', 'future')]);
  assert.equal(s.anchor?.id, 'b', 'still named, still linked — Start stays one tap away');
  assert.equal(s.active, null, 'the regression: this used to make Home render as if enrolled');
});

test('an active program outranks a planned one for both roles', () => {
  const s = selectHomePrograms([p('planned', 'future'), p('running', 'active')]);
  assert.equal(s.active?.id, 'running');
  assert.equal(s.anchor?.id, 'running');
});

test('a sealed program anchors nothing — continuing it could advance nothing', () => {
  for (const state of ['graduated', 'ended_early']) {
    const s = selectHomePrograms([p('done', state)]);
    assert.equal(s.active, null, state);
    assert.equal(s.anchor, null, state);
  }
});

test('a graduated program does not shadow a planned one waiting behind it', () => {
  const s = selectHomePrograms([p('old', 'graduated'), p('next', 'future')]);
  assert.equal(s.anchor?.id, 'next');
  assert.equal(s.active, null);
});

test('no programs at all is a real state, not a fallback', () => {
  assert.deepEqual(selectHomePrograms([]), { active: null, anchor: null });
  assert.deepEqual(selectHomePrograms(null), { active: null, anchor: null });
  assert.deepEqual(selectHomePrograms(undefined), { active: null, anchor: null });
});

/**
 * THE ONE-OFF BUILT FOR LATER (0136) — where it sits in the pecking order, and why.
 *
 * Below a program day: a scheduled session is a commitment to a plan, this is a note left for a day with
 * nothing on it. Above `open`: having planned one is a stronger answer to "how do you want to start?"
 * than any tap on the chooser, so it must not be gated on `settled` the way `open` is.
 */
test('a workout built for later takes the hero when nothing is scheduled', () => {
  const c = compose({ hasPlannedWorkout: true });
  assert.equal(c.hero, 'planned');
  assert.equal(c.heroOffersFreestyle, true, 'they may not want it today, and must be able to say so');
});

test('a program day outranks a workout built for later', () => {
  const c = compose({ hasPlannedWorkout: true, hasProgramSession: true });
  assert.equal(c.hero, 'program', 'the scheduled session keeps the card');
});

test('unfinished work outranks both', () => {
  const c = compose({ hasPlannedWorkout: true, hasProgramSession: true, resumeSets: 4 });
  assert.equal(c.hero, 'resume');
});

test('a planned workout answers the starting-point question on its own', () => {
  // `awaiting` + no `startChosen` is the brand-new athlete, who would otherwise get `none` and the
  // chooser. Having built one is the answer, and asking over the top of it is the defect `startChosen`
  // was added to fix.
  const c = compose({ awaiting: true, hasPlannedWorkout: true });
  assert.equal(c.hero, 'planned');
});

/*
 * ══ isHomeReady — the gate that turned twelve arrivals into one ══
 *
 * Home's sections each drew when their own read landed, so the screen visibly assembled itself on every
 * launch (PO: "I see it all get pieced together"). These hold the two properties that make holding the
 * whole screen safe rather than a hang.
 */

test('Home waits for every read, and appears the moment the last one lands', () => {
  assert.equal(isHomeReady([true, true, false], false), false, 'one outstanding read still holds it');
  assert.equal(isHomeReady([true, true, true], false), true);
});

test('the ceiling releases the screen even with reads still outstanding', () => {
  // The failure this prevents is the worst one available here: a splash that never lifts. One hung
  // request must cost Home a section, not the launch.
  assert.equal(isHomeReady([true, false, false], true), true);
  assert.equal(isHomeReady([false], true), true);
});

test('a screen with nothing to wait for is ready immediately', () => {
  // Not a curiosity — `[].every()` is true, so this is the behaviour that makes the gate degrade to
  // "draw now" rather than "wait forever" if the caller's list is ever emptied.
  assert.equal(isHomeReady([], false), true);
});

test('the ceiling is a launch-length wait, not a timeout', () => {
  // Bounds, not a value: past ~2.5s a held splash stops reading as a launch and starts reading as a
  // hang, and under a second it would fire before the reads it exists to wait for.
  assert.ok(HOME_READY_CEILING_MS >= 1500 && HOME_READY_CEILING_MS <= 3000, `${HOME_READY_CEILING_MS}ms`);
});

/*
 * ══ ⚠ THE HOLE BETWEEN THE TWO SLOTS ══
 *
 * PO: *"What happened to my start workout card?"* — the Train Today hero vanished from Home entirely
 * after they sealed Chapter I and started Chapter II.
 *
 * `awaiting` means "the active chapter has no workouts in it", which was a fair reading of "brand-new
 * athlete" for exactly as long as an athlete could only have ONE chapter. Chapter creation made a second
 * one reachable and the reading stopped holding: a veteran with an eight-week program on their second
 * chapter matched it perfectly.
 *
 * The vanishing itself was a second, independent defect, and the more dangerous one. `startingPoint` has
 * always treated a program as an answer to "How do you want to start?"; the hero did not. So with a
 * program AND `awaiting`, the hero abstained (not settled) and the chooser abstained (there is a
 * program) — and Home rendered NEITHER. No hero, no chooser, no way to start training.
 *
 * `fetchAwaitingChapter` no longer reports a second chapter as awaiting. These lock the other half: the
 * two slots decide from one predicate, so they can never both fall silent again.
 */
test('⚠ a program-holding athlete on a fresh chapter still gets a hero', () => {
  const c = compose({ awaiting: true, hasProgram: true });
  assert.notEqual(c.hero, 'none', 'Home drew no hero AND no chooser — there was no way to start a workout');
  assert.equal(c.hero, 'open', 'nothing scheduled today, so the freestyle hero is the offer');
});

test('⚠ the hero and the starting point never both abstain', () => {
  // Exhaustive over every combination of the flags that feed the decision. The PO's state was one cell
  // of this table, and nothing in the module said the table had to be covered.
  const bool = [false, true];
  for (const awaiting of bool)
    for (const startChosen of bool)
      for (const hasProgram of bool)
        for (const hasProgramSession of bool)
          for (const hasPlannedWorkout of bool)
            for (const resumeSets of [null, 4]) {
              const c = compose({ awaiting, startChosen, hasProgram, hasProgramSession, hasPlannedWorkout, resumeSets });
              const silent = c.hero === 'none' && c.startingPoint === 'none';
              assert.equal(
                silent,
                false,
                `Home offers nothing at all for ${JSON.stringify({ awaiting, startChosen, hasProgram, hasProgramSession, hasPlannedWorkout, resumeSets })}`,
              );
            }
});

test('a genuinely new athlete with no program is still asked the question', () => {
  // The fix must not swallow the case the chooser exists for.
  const c = compose({ awaiting: true, hasProgram: false });
  assert.equal(c.startingPoint, 'chooser');
  assert.equal(c.hero, 'none', 'the chooser IS the offer — a hero beside it would ask twice');
});

test('a program with a session today still shows the session, not the freestyle hero', () => {
  const c = compose({ awaiting: true, hasProgram: true, hasProgramSession: true });
  assert.equal(c.hero, 'program', 'the planned day outranks the open hero');
});

test('unfinished work still outranks everything on a fresh chapter', () => {
  const c = compose({ awaiting: true, hasProgram: true, resumeSets: 7 });
  assert.equal(c.hero, 'resume');
});
