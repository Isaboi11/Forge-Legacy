import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveRecommendationId,
  intendedProgramId,
  accessFor,
  canRecommend,
  catalogServesLevel,
  successorIdFor,
  FALLBACK_ID,
  ADVANCED_ID,
} from '../recommend-core.ts';

const SF_I = FALLBACK_ID; // strength-foundation-i-3day
const SF_II = ADVANCED_ID; // strength-foundation-ii-4day

/**
 * The REAL shipping catalog, read off disk rather than hand-listed.
 *
 * A hand-kept list is exactly how the recommender drifted in the first place: `CATALOG_ALIAS` knew about
 * two programs while fourteen shipped, and nothing failed, because every test asserted against the same
 * stale idea of what existed. Reading the directory means adding or removing a program moves these tests
 * on its own.
 *
 * Relative path, no `@/` — a runtime alias import breaks `node --test`.
 */
const PROGRAM_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'training', 'programs');
const CATALOG_IDS = readdirSync(PROGRAM_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(PROGRAM_DIR, f), 'utf8')).id);

/** Every combination the intake can actually produce — the 54 the on-ramp is judged on. */
const GOALS = ['strength', 'muscle', 'fatloss', 'endurance', 'health', 'athletic'];
const EXPS = ['beginner', 'intermediate', 'advanced'];
const ACCESS = [['fullgym'], ['dumbbells'], []];
const EVERY_COMBINATION = GOALS.flatMap((primaryGoal) =>
  EXPS.flatMap((experience) => ACCESS.map((equipment) => ({ primaryGoal, experience, equipment }))),
);

/**
 * "Home Gym" is one checkbox spanning a pair of bands and a fully-kitted garage. Once a real profile
 * exists, the gear decides the tier — otherwise both athletes get the same program.
 */
test('a real Home Gym profile refines the "homegym" answer instead of guessing', () => {
  assert.equal(accessFor(['homegym'], null), 'home', 'no profile — the checkbox stands alone');
  assert.equal(accessFor(['homegym'], ['barbell', 'rack']), 'gym', 'a bar and a rack runs barbell programming');
  assert.equal(accessFor(['homegym'], ['barbell', 'bench']), 'gym');
  assert.equal(accessFor(['homegym'], ['dumbbells']), 'home');
  assert.equal(accessFor(['homegym'], ['barbell']), 'home', 'a loose bar with nothing to rack it on is not a gym');
  assert.equal(accessFor(['homegym'], ['bands', 'mat', 'pullup']), 'bodyweight');
  assert.equal(accessFor(['homegym'], []), 'bodyweight', 'an empty profile is a real answer');
});

test('a home profile never downgrades someone who said they have a full gym', () => {
  assert.equal(accessFor(['fullgym'], []), 'gym', 'their commercial gym is not described by their garage');
  assert.equal(accessFor(['fullgym', 'homegym'], []), 'gym');
});

/**
 * The tier reaches a different intended program AND, now, a different delivered one.
 *
 * This used to close by asserting both tiers resolved to Strength Foundation I, with a note to revisit
 * "when the catalog grows". It has grown, and the alias table was extended to meet it — so the home-gym
 * profile now changes the program an athlete is actually handed, not merely the id the map aimed at.
 * That is the claim worth holding: the profile earns its keep or it is decorative.
 */
test('the refined tier reaches a different program, intended AND delivered', () => {
  const base = { experience: 'beginner', primaryGoal: 'strength' };
  const bareIn = { ...base, equipment: ['homegym'], homeGym: ['bands'] };
  const kittedIn = { ...base, equipment: ['homegym'], homeGym: ['barbell', 'rack', 'bench'] };

  assert.equal(intendedProgramId(kittedIn), 'strength-foundation-1');
  assert.equal(intendedProgramId(bareIn), 'fbh-bodyweight-basics');

  assert.equal(resolveRecommendationId(kittedIn), SF_I, 'a bar and a rack runs barbell programming');
  assert.equal(resolveRecommendationId(bareIn), 'bodyweight-foundation', 'bands and a mat do not');
  assert.notEqual(
    resolveRecommendationId(bareIn),
    resolveRecommendationId(kittedIn),
    'the profile must change the program, or it is decorative',
  );
});

test('accessFor — richest access wins', () => {
  assert.equal(accessFor(['fullgym']), 'gym');
  assert.equal(accessFor(['fullgym', 'bands']), 'gym');
  assert.equal(accessFor(['homegym']), 'home');
  assert.equal(accessFor(['dumbbells']), 'home');
  assert.equal(accessFor(['bands']), 'bodyweight');
  assert.equal(accessFor(['bodyweight']), 'bodyweight');
  assert.equal(accessFor([]), 'bodyweight');
  assert.equal(accessFor(null), 'bodyweight');
  assert.equal(accessFor(undefined), 'bodyweight');
});

test('intendedProgramId — ports the design gym/home/bodyweight map', () => {
  // gym
  assert.equal(intendedProgramId({ primaryGoal: 'strength', experience: 'beginner', equipment: ['fullgym'] }), 'strength-foundation-1');
  assert.equal(intendedProgramId({ primaryGoal: 'strength', experience: 'intermediate', equipment: ['fullgym'] }), 'strength-powerbuilding-1');
  assert.equal(intendedProgramId({ primaryGoal: 'strength', experience: 'advanced', equipment: ['fullgym'] }), 'strength-531');
  assert.equal(intendedProgramId({ primaryGoal: 'muscle', experience: 'intermediate', equipment: ['fullgym'] }), 'mb-hypertrophy-block');
  // home — muscle keeps its own id because a real dumbbell program answers it. Everything else on this
  // tier routes to the no-equipment id: there is no home program for it, and under-serving a dumbbell
  // owner beats prescribing a barbell they do not have.
  assert.equal(intendedProgramId({ primaryGoal: 'muscle', experience: 'beginner', equipment: ['dumbbells'] }), 'fbh-dumbbell-only');
  assert.equal(intendedProgramId({ primaryGoal: 'health', experience: 'beginner', equipment: ['dumbbells'] }), 'fbh-home-minimalist');
  /* ⚠ STRENGTH AT HOME NO LONGER FALLS THROUGH TO THE NO-EQUIPMENT ID. `Within Reach` is authored for
     exactly this athlete, so strength / fat loss / athletic reach it. Endurance still does not: a running
     goal is not answered by dumbbells, and Holt builds those. */
  assert.equal(intendedProgramId({ primaryGoal: 'strength', experience: 'advanced', equipment: ['dumbbells'] }), 'fbh-home-strength');
  assert.equal(intendedProgramId({ primaryGoal: 'fatloss', experience: 'beginner', equipment: ['dumbbells'] }), 'fbh-home-strength');
  assert.equal(intendedProgramId({ primaryGoal: 'endurance', experience: 'beginner', equipment: ['homegym'] }), 'fbh-bodyweight-basics');
  // bodyweight — one id for the whole tier, endurance included.
  assert.equal(intendedProgramId({ primaryGoal: 'strength', experience: 'beginner', equipment: ['bands'] }), 'fbh-bodyweight-basics');
  assert.equal(intendedProgramId({ primaryGoal: 'endurance', experience: 'beginner', equipment: [] }), 'fbh-bodyweight-basics');
  // defaults: no goal → health, no experience → beginner
  assert.equal(intendedProgramId({ equipment: ['fullgym'] }), 'fbh-full-body-3');
});

/**
 * ⚠ THE TIERS THAT CANNOT LOAD A BARBELL MUST NEVER BE HANDED ONE.
 *
 * The failure this rules out is the one that closed the on-ramp: an athlete who owns dumbbells, or
 * nothing at all, being recommended a commercial-gym barbell program because the map had no better id.
 * Both no-equipment tiers may only ever reach programs authored to need no equipment.
 */
test('home and bodyweight access never resolve to a barbell program', () => {
  /* Every one of these is authored to need no barbell and no rack: bodyweight, a pair of dumbbells, or a
     floor. `within-reach-dumbbell-3day` joined them when the dumbbell gap was closed. */
  const NEEDS_NO_EQUIPMENT = new Set([
    'bodyweight-foundation',
    'close-quarters-6day',
    'mobility-foundation',
    'within-reach-dumbbell-3day',
  ]);
  for (const { primaryGoal, experience } of EVERY_COMBINATION) {
    for (const equipment of [['dumbbells'], ['bands'], []]) {
      const id = resolveRecommendationId({ primaryGoal, experience, equipment });
      assert.ok(
        NEEDS_NO_EQUIPMENT.has(id),
        `${primaryGoal}/${experience}/${equipment[0] ?? 'bodyweight'} was handed ${id}, which needs a gym`,
      );
    }
  }
});

test('resolveRecommendationId — each goal reaches the family authored for it', () => {
  const gym = (primaryGoal, experience) => resolveRecommendationId({ primaryGoal, experience, equipment: ['fullgym'] });
  // Strength — the ladder that was always wired.
  assert.equal(gym('strength', 'beginner'), SF_I);
  assert.equal(gym('strength', 'intermediate'), SF_II);
  /* ⚠ ADVANCED HAS ITS OWN BLOCK NOW. It used to collapse onto Strength Foundation II — an Intermediate
     program whose stated goal is "improve gym confidence" — which is the exact case `catalogServesLevel`
     was written to refuse. `Strength Builder I` is also the successor SF-II has always NAMED. */
  assert.equal(gym('strength', 'advanced'), 'strength-builder-i-4day');
  // Muscle — a beginner asking for size gets foundational strength first, on purpose.
  assert.equal(gym('muscle', 'beginner'), SF_I);
  assert.equal(gym('muscle', 'intermediate'), 'muscle-building-intermediate');
  assert.equal(gym('muscle', 'advanced'), 'frame-by-frame-5day');
  // Conditioning answers fat loss and athletic alike.
  assert.equal(gym('fatloss', 'beginner'), 'athletic-conditioning-foundation');
  assert.equal(gym('fatloss', 'advanced'), 'iron-and-engine');
  assert.equal(gym('athletic', 'intermediate'), 'iron-and-engine');
  // Endurance is conditioning until the Running family lands — never a barbell strength block.
  assert.equal(gym('endurance', 'beginner'), 'athletic-conditioning-foundation');
  assert.equal(gym('endurance', 'advanced'), 'iron-and-engine');
  // Health at a gym is the full-body 3-day that teaches the patterns.
  assert.equal(gym('health', 'beginner'), SF_I);
  assert.equal(gym('health', 'advanced'), 'muscle-building-intermediate');
});

/**
 * THE INVARIANT, AND IT IS THE TEST THAT WOULD HAVE CAUGHT THE ORIGINAL DEFECT.
 *
 * It used to assert "SF I or SF II", which was a description of a two-program catalog rather than a
 * property of the function — so it passed contentedly while 51 of 54 combinations resolved to a program
 * chosen by a fallback rather than by the athlete's answers. Asserting membership of the REAL catalog
 * says the thing that actually matters and keeps saying it as the catalog changes.
 */
test('resolveRecommendationId — invariant: always a program that really exists', () => {
  const inCatalog = new Set(CATALOG_IDS);
  const exps = ['beginner', 'intermediate', 'advanced', null, undefined, 'bogus'];
  const equips = [['fullgym'], ['homegym'], ['dumbbells'], ['bands'], ['bodyweight'], [], null, undefined];
  for (const g of [...GOALS, null, undefined]) {
    for (const e of exps) {
      for (const q of equips) {
        const id = resolveRecommendationId({ primaryGoal: g, experience: e, equipment: q });
        assert.ok(inCatalog.has(id), `${g}/${e}/${q} resolved to "${id}", which is not in the catalog`);
      }
    }
  }
  assert.ok(inCatalog.has(resolveRecommendationId({})), 'no inputs at all → still a real program');
});

/*
 * The invariant above is exactly why `canRecommend` cannot be written in terms of it: a fallback makes
 * "an answer exists" true for every input, including the endurance athlete handed a barbell program.
 *
 * (The two-program case this note used to test lives on in "an alias pointing at nothing is not an
 * answer" below, which makes the same assertion for the reason that now matters.)
 */

/**
 * ⭐ THE ON-RAMP IS OPEN ON THE CATALOG THAT ACTUALLY SHIPS.
 *
 * This is the assertion the whole file exists for. `catalogCanRecommend()` feeds Home's starting-point
 * slot: while it is false, "Help me find one" is not drawn at all and a beginner's only doors are
 * freestyle, build-your-own and browse — three doors that each assume they already know what to do.
 */
test('canRecommend — true on the real shipping catalog', () => {
  assert.equal(canRecommend(CATALOG_IDS), true, 'the guided on-ramp must be offered on the real catalog');
});

/**
 * Every combination lands on a program authored for that question rather than on the fallback.
 *
 * `canRecommend` returning true is the summary; this is the evidence, and it names the offender when it
 * breaks instead of just going red.
 */
test('canRecommend — all 54 combinations resolve into the catalog', () => {
  const inCatalog = new Set(CATALOG_IDS);
  const unanswered = EVERY_COMBINATION.map((input) => ({ input, id: resolveRecommendationId(input) }))
    .filter(({ id }) => !inCatalog.has(id))
    .map(({ input, id }) => `${input.primaryGoal}/${input.experience}/${input.equipment[0] ?? 'bodyweight'} → ${id}`);
  assert.deepEqual(unanswered, [], 'these combinations reach a program that does not exist');
});

/**
 * ⚠ THE GUARD FOLLOWS THE ALIAS TO ITS TARGET, AND THIS IS WHAT PROVES IT.
 *
 * `canRecommend` used to count an intended id as answered whenever CATALOG_ALIAS merely MENTIONED it.
 * That held while the table was nearly empty and became meaningless the moment it was filled in to open
 * the on-ramp: every intended id is now named there, so the old rule would return true for any catalog
 * at all — including none. An alias is a pointer, and a pointer to nothing is not an answer.
 */
test('canRecommend — an alias pointing at nothing is not an answer', () => {
  assert.equal(canRecommend([]), false, 'an empty catalog can never answer anything');
  assert.equal(
    canRecommend([SF_I, SF_II]),
    false,
    'the two Strength Foundations answer strength; the other five goals are still unauthored',
  );
});

/**
 * No goal is optional, and no single program is load-bearing by accident: remove any one the recommender
 * actually reaches and the on-ramp closes rather than quietly falling back.
 */
test('canRecommend — dropping any program the recommender depends on closes the on-ramp', () => {
  const reached = [...new Set(EVERY_COMBINATION.map((input) => resolveRecommendationId(input)))];
  assert.ok(reached.length > 1, 'a catalog the recommender only reaches one way is the old defect');
  for (const missing of reached) {
    assert.equal(
      canRecommend(CATALOG_IDS.filter((id) => id !== missing)),
      false,
      `losing ${missing} should close the on-ramp, not silently fall back`,
    );
  }
});

/**
 * ── IS THE CATALOGUE WRITTEN FOR THIS ATHLETE? ───────────────────────────────────────────────────────
 *
 * The worst ninety seconds in the product: fifteen years under the bar, three questions, and out comes
 * "Strength Foundation II — improve gym confidence". One of fourteen programs is tagged Advanced and it
 * is conditioning, so there is nothing better to hand them — which makes admitting it the only honest
 * move left.
 */
test('catalogServesLevel — an advanced athlete is not served an intermediate block', () => {
  assert.equal(catalogServesLevel('advanced', 'Intermediate'), false);
  assert.equal(catalogServesLevel('advanced', 'Beginner'), false);
  assert.equal(catalogServesLevel('advanced', 'Advanced'), true);
});

test('⚠ catalogServesLevel — it only ever looks DOWNWARD', () => {
  /*
   * A beginner offered an Intermediate program is fine and must not trip this. The tag describes
   * TECHNICAL demand rather than required fitness — the same reason `STRETCH_CEILING` deliberately
   * reaches a beginner one tier up. Treating that as a failure would refuse the majority of the
   * catalogue to the athlete who needs it most.
   */
  assert.equal(catalogServesLevel('beginner', 'Intermediate'), true);
  assert.equal(catalogServesLevel('beginner', 'Advanced'), true);
  assert.equal(catalogServesLevel('intermediate', 'Advanced'), true);
  assert.equal(catalogServesLevel('intermediate', 'Intermediate'), true);
  assert.equal(catalogServesLevel('intermediate', 'Beginner'), false);
});

test('catalogServesLevel — an unreadable tag never blocks a recommendation', () => {
  // A data problem must not become a silent product outage.
  for (const bad of [null, undefined, '', 'expert', 'BEGINNER']) {
    assert.equal(catalogServesLevel('advanced', bad), true, `"${bad}" refused a recommendation`);
  }
  // And an unknown experience falls back to beginner, which everything serves.
  assert.equal(catalogServesLevel('bogus', 'Beginner'), true);
});

/**
 * ⭐ THE DEFECT IS CLOSED, AND THIS IS THE TEST THAT SAID IT WOULD BE.
 *
 * It used to assert the opposite — that the catalogue could NOT serve an advanced lifter — with a note
 * saying to update it and the copy it guards the day somebody authored one. `Strength Builder I (4-Day)`
 * is that program, so the assertion flips rather than being deleted: an advanced athlete asking for
 * strength at a full gym must now be handed a block authored at their level.
 */
test('⭐ an advanced lifter is now served a real Advanced block', () => {
  const id = resolveRecommendationId({ primaryGoal: 'strength', experience: 'advanced', equipment: ['fullgym'] });
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'training', 'programs');
  const prog = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .find((p) => p.id === id);
  assert.ok(prog, `the recommendation ${id} is not in the catalogue`);
  assert.equal(prog.difficulty, 'Advanced', `${prog.name} is tagged ${prog.difficulty}`);
  assert.equal(catalogServesLevel('advanced', prog.difficulty), true, `${prog.name} does not serve them`);
  /* The honest-refusal card stays reachable for the goals that still have nothing at that level — muscle
     and health — so removing it along with this defect would be the wrong lesson to take. */
  assert.equal(catalogServesLevel('advanced', 'Intermediate'), false, 'the refusal path must still exist');
});

/**
 * ── WHAT COMES AFTER THE ONE THEY JUST FINISHED ──────────────────────────────────────────────────────
 *
 * Seven programs name a successor and `successorName` was read by nothing, so ten weeks of work ended in
 * silence. It cannot simply be printed: SIX OF THE SEVEN NAMED SUCCESSORS DO NOT EXIST, and promising
 * them would be the on-ramp's original defect arriving at the other end of the athlete's journey.
 */
const CATALOG = readdirSync(PROGRAM_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(PROGRAM_DIR, f), 'utf8')));

test('successorIdFor — finds a real successor through the filing suffix', () => {
  // "Strength Foundation II" is filed as "Strength Foundation II (4-Day)". An exact match finds none of
  // them, which is the whole reason this is a function.
  const id = successorIdFor('Strength Foundation II', CATALOG.map((d) => ({ id: d.id, name: d.name })));
  assert.equal(id, 'strength-foundation-ii-4day');
});

test('⚠ successorIdFor — an unauthored successor returns null rather than a promise', () => {
  const names = CATALOG.map((d) => ({ id: d.id, name: d.name }));
  for (const missing of ['Bodyweight Strength', 'Conditioning Intermediate', 'Muscle Building Advanced']) {
    assert.equal(successorIdFor(missing, names), null, `"${missing}" was matched to something`);
  }
  assert.equal(successorIdFor(null, names), null);
  assert.equal(successorIdFor('   ', names), null);
});

/**
 * The live state, so the day somebody authors one of the six this test tells them the hand-off changed.
 */
test('⚠ how many of the named successors are real', () => {
  const names = CATALOG.map((d) => ({ id: d.id, name: d.name }));
  const named = CATALOG.filter((d) => d.successorName);
  const real = named.filter((d) => successorIdFor(d.successorName, names));
  assert.equal(named.length, 8, 'eight programs name a successor');
  /* Grew from ONE to THREE when `Strength Builder I` landed, which chained the whole strength ladder:
     Foundation I -> Foundation II -> Builder I -> Squat Ascent. Every other named successor is still an
     intention, and `nextAfter` hands those to Holt rather than promising them. */
  assert.equal(real.length, 3, `real successors: ${real.map((d) => d.id).join(', ')}`);
  for (const id of ['strength-foundation-i-3day', 'strength-foundation-ii-4day', 'strength-builder-i-4day']) {
    assert.ok(real.some((d) => d.id === id), `${id} should now reach a real successor`);
  }
});
