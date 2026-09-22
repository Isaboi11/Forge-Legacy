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
  assert.equal(c.showGetStarted, false, 'arrival rows are for arriving — they have trained');
  assert.equal(c.showMissionTile, true, 'their goal never depended on a program');
  assert.equal(c.showProgramTile, false);
  assert.equal(c.showQuietProgramLink, true, 'available, subordinate');
  assert.equal(c.heroOffersFreestyle, false, 'the button already opens the freestyle/cardio choice');
});

/*
 * ══ THE ARRIVAL HOME — `Onboarding-Amendment-006` ══
 *
 * PO mockup, 2026-09-21: the chapter, "Start Your First Workout", then three GET STARTED rows. The
 * "How do you want to start?" chooser that used to own this spot is gone — the first workout is the offer.
 */
test('the brand-new athlete gets the first-workout hero and Get Started, and no goal tile yet', () => {
  const c = compose({ awaiting: true });
  assert.equal(c.hero, 'open', 'the first workout is the offer — nothing is asked in front of it');
  assert.equal(c.showGetStarted, true);
  assert.equal(c.showMissionTile, false);
  assert.equal(c.showQuietProgramLink, false, 'Get Started already carries the way to programs');
});

test('an athlete with a program is composed exactly as before', () => {
  const c = compose({ hasProgram: true, hasProgramSession: true });
  assert.equal(c.hero, 'program');
  assert.equal(c.heroOffersFreestyle, true, '"Something else today?" still offered over a planned day');
  assert.equal(c.showGetStarted, false);
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
  assert.equal(c.showGetStarted, false, 'they answered — the arrival rows go');
  assert.equal(c.hero, 'open', 'the same hero a program athlete gets, in its no-program face');
  assert.equal(c.showQuietProgramLink, true, 'and the subtle route to a program comes with it');
  assert.equal(c.showMissionTile, true);
});

test('mid-session, the arrival rows are never printed under the Continue card', () => {
  const c = compose({ awaiting: true, startChosen: true, resumeSets: 4 });
  assert.equal(c.hero, 'resume');
  assert.equal(c.showGetStarted, false);
});

test('a chosen freestyle athlete is composed exactly like one who has already trained', () => {
  const chose = compose({ awaiting: true, startChosen: true });
  const trained = compose({ awaiting: false, startChosen: false });
  assert.deepEqual(chose, trained, 'the two routes to settled must produce one screen');
});

test('Get Started survives until the athlete actually settles', () => {
  // Landing on Home, opening a sheet, closing it — none of that is a choice.
  assert.equal(compose({ awaiting: true, startChosen: false }).showGetStarted, true);
  assert.equal(compose({ awaiting: true, startChosen: false }).hero, 'open');
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
    showGetStarted: false,
    showQuietProgramLink: false,
    showMissionTile: false,
    showProgramTile: false,
    showSocialCards: false,
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

/** Two ways to say "start something" on one card is not two choices — it is one choice, said twice. */
test('freestyle is never offered twice on the same card, in any state', () => {
  for (const chapterLoading of [true, false])
    for (const awaiting of [true, false])
      for (const hasProgram of [true, false])
        for (const hasProgramSession of [true, false])
          for (const resumeSets of [null, 4]) {
            const c = compose({ chapterLoading, awaiting, hasProgram, hasProgramSession, resumeSets });
            const state = JSON.stringify({ chapterLoading, awaiting, hasProgram, resumeSets });
            assert.ok(
              !(c.hero === 'open' && c.heroOffersFreestyle),
              `open hero must not repeat its own button: ${state}`,
            );
          }
});

/**
 * The arrival rows can never draw for a settled athlete, in any combination of the other inputs — the
 * same guarantee the retired chooser carried, so "what to do first" is never asked of someone who did it.
 */
test('Get Started can never draw for an athlete who has trained, chosen, or holds a program', () => {
  for (const [settledBy, over] of [
    ['trained', { awaiting: false }],
    ['chose', { awaiting: true, startChosen: true }],
    ['program', { awaiting: true, hasProgram: true }],
  ])
    for (const hasProgramSession of [true, false])
      for (const hasPlannedWorkout of [true, false])
        for (const resumeSets of [null, 7]) {
          const c = compose({ ...over, hasProgramSession, hasPlannedWorkout, resumeSets });
          assert.equal(c.showGetStarted, false, `drew for an athlete settled by ${settledBy}`);
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
 * THE ONE-OFF SLOT (0136) — where it sits in the pecking order, and why.
 *
 * ⚠ REVERSED against a program day by `Squad-Architecture-Amendment-005` §3 (SQ-A5-D2). It used to rank
 * below, on the reasoning that a scheduled session is a commitment where a one-off is a note left for an
 * empty day. The flaw: with the hero on `program` the slot has NO other route on Home, so ranking it
 * second hid it rather than deferring it — which became unshippable once a squad post could fill it.
 *
 * Above `open`, unchanged: having something in the slot is a stronger answer to "how do you want to
 * start?" than any tap on the chooser, so it must not be gated on `settled` the way `open` is.
 */
test('a workout built for later takes the hero when nothing is scheduled', () => {
  const c = compose({ hasPlannedWorkout: true });
  assert.equal(c.hero, 'planned');
  assert.equal(c.heroOffersFreestyle, true, 'they may not want it today, and must be able to say so');
});

/**
 * ⚠ THIS ASSERTION IS THE REVERSAL. It read `'program'` until 2026-09-03 and the change is deliberate —
 * PO: "if they go in and deliberately click on our workout for the next day then that one takes
 * precedence". If a future change flips it back, the squad-posted workout becomes invisible to every
 * athlete running a program, which is most of them.
 */
test('the occupied slot outranks a program day', () => {
  const c = compose({ hasPlannedWorkout: true, hasProgramSession: true });
  assert.equal(c.hero, 'planned', 'the deliberate act beats the passively-rendered schedule');
  assert.equal(c.heroOffersFreestyle, true, 'and they can still say "something else today"');
});

/**
 * The domain cannot tell a self-planned workout from one taken off a squad post, and must not learn to.
 * Both are the same act — someone decided this is what tomorrow is — so both get the same rank. Ranking
 * them against each other would be the product claiming a squad's intention outweighs the athlete's own.
 */
test('the slot ranks the same however it was filled', () => {
  const built = compose({ hasPlannedWorkout: true, hasProgramSession: true, hasProgram: true });
  const taken = compose({ hasPlannedWorkout: true, hasProgramSession: true, hasProgram: true });
  assert.deepEqual(built, taken);
  assert.equal(built.hero, 'planned');
});

/** The program is not stranded by the reversal — the tile still carries it. That asymmetry is the argument. */
test('a program outranked on the hero still keeps its tile', () => {
  const c = compose({ hasPlannedWorkout: true, hasProgramSession: true, hasProgram: true });
  assert.equal(c.hero, 'planned');
  assert.equal(c.showProgramTile, true, 'reachable elsewhere — which the slot never was');
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

test('⚠ outside the loading frame, the hero never abstains', () => {
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
              const silent = c.hero === 'none';
              assert.equal(
                silent,
                false,
                `Home offers nothing at all for ${JSON.stringify({ awaiting, startChosen, hasProgram, hasProgramSession, hasPlannedWorkout, resumeSets })}`,
              );
            }
});

test('a genuinely new athlete with no program still gets their arrival rows', () => {
  const c = compose({ awaiting: true, hasProgram: false });
  assert.equal(c.showGetStarted, true);
  assert.equal(c.hero, 'open');
});

test('a program with a session today still shows the session, not the freestyle hero', () => {
  const c = compose({ awaiting: true, hasProgram: true, hasProgramSession: true });
  assert.equal(c.hero, 'program', 'the planned day outranks the open hero');
});

test('unfinished work still outranks everything on a fresh chapter', () => {
  const c = compose({ awaiting: true, hasProgram: true, resumeSets: 7 });
  assert.equal(c.hero, 'resume');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// THE SOCIAL CARDS — `Onboarding-Amendment-005` ONB-A5-D2/D3
//
// Your Circle and the Train Together / Competitions row are withheld until a first workout exists.
// These tests hold the two things that make that a reduction rather than a gate: it keys off the first
// workout and nothing else, and it never runs backwards.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('a brand-new athlete gets no social cards', () => {
  assert.equal(compose({ awaiting: true }).showSocialCards, false);
});

test('they arrive the moment the athlete engages at all', () => {
  assert.equal(compose({ awaiting: false }).showSocialCards, true);
  assert.equal(compose({ awaiting: true, startChosen: true }).showSocialCards, true);
  assert.equal(compose({ awaiting: true, hasProgram: true }).showSocialCards, true);
});

test('the loading frame claims nothing, in the same direction as every other field', () => {
  // Drawing them before the chapter read lands means drawing them and then taking them away.
  assert.equal(compose({ chapterLoading: true, awaiting: false }).showSocialCards, false);
});

test('the social cards graduate with the mission tile, never on their own schedule', () => {
  // ⚠ THIS IS THE ASSERTION THAT WOULD HAVE CAUGHT THIS FILE'S OWN FIRST WRONG GUESS. An earlier draft
  // keyed the cards to the first WORKOUT while everything else keyed to `settled`, which produced two
  // different Homes for two athletes in the same state. Tying them together here means any future
  // attempt to split them fails loudly rather than shipping as a subtle inconsistency.
  for (const awaiting of [true, false]) {
    for (const startChosen of [true, false]) {
      for (const hasProgram of [true, false]) {
        const c = compose({ awaiting, startChosen, hasProgram });
        assert.equal(
          c.showSocialCards,
          c.showMissionTile,
          `awaiting=${awaiting} startChosen=${startChosen} hasProgram=${hasProgram}`,
        );
      }
    }
  }
});

test('Get Started hands over to the settled Home in one moment, never overlapping it', () => {
  // The arrival rows leave exactly when the mission tile and the social cards arrive. Both on screen, or
  // neither, would be two Homes at once — or a Home with a gap where the first one used to be.
  for (const awaiting of [true, false])
    for (const startChosen of [true, false])
      for (const hasProgram of [true, false]) {
        const c = compose({ awaiting, startChosen, hasProgram });
        assert.equal(c.showGetStarted, !c.showMissionTile, JSON.stringify({ awaiting, startChosen, hasProgram }));
      }
});
