import test from 'node:test';
import assert from 'node:assert/strict';

import { HOME_STEPS, SCREEN_TOURS, TAB_STEPS, legsIn, planTour } from '../tour-plan.ts';

const ALL_ANCHORS = HOME_STEPS.map((s) => s.anchor).filter(Boolean);

const plan = (over = {}) =>
  planTour({ tabsDone: false, homeDone: false, homeHasCards: false, anchors: ALL_ANCHORS, ...over });

test('a program-less Home gets the tabs leg and nothing else — there is nothing on it to spotlight', () => {
  const steps = plan({ homeHasCards: false });
  assert.deepEqual(legsIn(steps), ['tabs']);
  assert.equal(steps.length, TAB_STEPS.length);
  assert.deepEqual(steps.map((s) => s.title), ['Home', 'Workouts', 'Legacy', 'Squads']);
});

test('a program exists after the tabs leg was walked — the run is the seven Home steps alone', () => {
  const steps = plan({ tabsDone: true, homeHasCards: true });
  assert.deepEqual(legsIn(steps), ['home']);
  assert.equal(steps.length, 7);
  assert.deepEqual(
    steps.map((s) => s.anchor),
    ['chapter', 'todays-workout', 'current-program', 'mission', 'your-circle', 'train-together', 'competitions'],
    'top-to-bottom in the order the screen is read',
  );
});

test('Train Together and Competitions are separate steps, not one card describing a row', () => {
  const titles = HOME_STEPS.map((s) => s.title);
  assert.ok(titles.includes('Train Together'));
  assert.ok(titles.includes('Competitions'));
});

/**
 * NEVER BOTH LEGS IN ONE RUN. A run is planned once against the anchors mounted at that instant, and the
 * tabs leg navigates away from Home — so a combined run would walk back to cards it counted but that had
 * been unmounted and released in between. That is the "tour ended early" defect. Each leg is planned when
 * it runs, against the screen it describes.
 */
test('an athlete who arrives with a program already gets the map first — tabs only, Home follows separately', () => {
  const steps = plan({ tabsDone: false, homeHasCards: true });
  assert.deepEqual(legsIn(steps), ['tabs'], 'the Home leg is NOT bolted onto this run');
  assert.equal(steps.length, TAB_STEPS.length);
});

test('…and once the tabs leg is recorded, the very next plan is the Home leg', () => {
  const steps = plan({ tabsDone: true, homeHasCards: true });
  assert.deepEqual(legsIn(steps), ['home']);
  assert.equal(steps.length, HOME_STEPS.length);
});

test('no plan ever mixes legs, under any input', () => {
  for (const tabsDone of [true, false])
    for (const homeDone of [true, false])
      for (const homeHasCards of [true, false])
        for (const replay of [true, false]) {
          const legs = legsIn(plan({ tabsDone, homeDone, homeHasCards, replay }));
          assert.ok(legs.length <= 1, `mixed legs for ${JSON.stringify({ tabsDone, homeDone, homeHasCards, replay })}`);
        }
});

test('a step whose card is not on screen is dropped from the run, not rung around nothing', () => {
  const anchors = ALL_ANCHORS.filter((a) => a !== 'current-program' && a !== 'mission');
  const steps = plan({ tabsDone: true, homeHasCards: true, anchors });
  assert.equal(steps.length, 5, 'and the counter reads "of 5" — never "of 7" with two dead steps');
  assert.ok(!steps.some((s) => s.anchor === 'current-program' || s.anchor === 'mission'));
});

/**
 * THE DAY-TO-DAY ATHLETE GETS THE WALKTHROUGH. They used to get nothing: the Home leg was owed only to the
 * `has-program` face, so someone who trains four times a week and never builds a program was never shown
 * around the screen they open every morning — for as long as they used the app.
 *
 * Their Home draws every card but Current Program (the Workout CTA is always present, and Mission never
 * depended on a program), so the anchor filter does the whole job: six real steps, no empty rectangle.
 */
test('a settled Home without a program plans six steps — only Current Program drops', () => {
  const anchors = ALL_ANCHORS.filter((a) => a !== 'current-program');
  const steps = plan({ tabsDone: true, homeHasCards: true, anchors });
  assert.equal(steps.length, HOME_STEPS.length - 1, 'the counter reads "of 6"');
  assert.ok(!steps.some((s) => s.anchor === 'current-program'));
  assert.ok(steps.some((s) => s.anchor === 'mission'), 'Mission is theirs and always was');
  assert.ok(steps.some((s) => s.anchor === 'todays-workout'), 'so is the Workout CTA');
});

/**
 * The step that rings the Workout CTA runs for athletes with and without a program, so its copy must be
 * true of both. It used to open "Your next session, already built" — a sentence with no referent on a card
 * that says "Train Today" and holds nothing planned.
 */
test('the Today’s workout step describes a card that may hold no program', () => {
  const step = HOME_STEPS.find((s) => s.anchor === 'todays-workout');
  assert.ok(step, 'the Workout CTA still has a step');
  assert.ok(
    !/already built\.\s/.test(step.body.slice(0, 40)),
    'it must not OPEN by asserting a program exists',
  );
  assert.match(step.body, /Not running one\?/, 'the program-less athlete is addressed explicitly');
});

/** The first-run face is still tabs-only — nobody eats the map and the walkthrough back to back. */
test('a first-run Home is owed the map and nothing else', () => {
  assert.deepEqual(legsIn(plan({ tabsDone: false, homeHasCards: false })), ['tabs']);
  assert.deepEqual(plan({ tabsDone: true, homeHasCards: false }), [], 'and no Home leg follows it');
});

test('tabs steps survive an empty anchor registry — they spotlight nothing by design', () => {
  const steps = plan({ homeHasCards: true, anchors: [] });
  assert.deepEqual(legsIn(steps), ['tabs'], 'every Home step dropped; the tabs leg is anchor-free');
  assert.equal(steps.length, TAB_STEPS.length);
});

/**
 * "Skip" retires only the legs the athlete reached — the provider records
 * `legsIn(run.slice(0, stepIndex + 1))`. Skipping out of the map must not consume a Home walkthrough
 * nobody has seen a card of.
 */
test('skipping inside the tabs leg leaves the Home leg owed', () => {
  const run = plan({ tabsDone: false, homeHasCards: true }); // tabs + home, one run
  const skippedAtStep2 = legsIn(run.slice(0, 2));
  assert.deepEqual(skippedAtStep2, ['tabs'], 'only the leg being walked is retired');
});

test('skipping inside the Home leg retires the Home leg and nothing else', () => {
  const run = plan({ tabsDone: true, homeHasCards: true });
  assert.deepEqual(legsIn(run.slice(0, 3)), ['home'], 'a run holds one leg, so a skip can only ever retire one');
});

test('both legs done = no run at all', () => {
  assert.deepEqual(plan({ tabsDone: true, homeDone: true, homeHasCards: true }), []);
});

test('replay re-runs everything, one leg at a time', () => {
  // First plan after "Replay all tips": the map.
  const first = plan({ tabsDone: true, homeDone: true, homeHasCards: true, replay: true });
  assert.deepEqual(legsIn(first), ['tabs']);
  assert.equal(first.length, TAB_STEPS.length);
  // The provider records that leg as it finishes, so the next plan is the Home walkthrough.
  const second = plan({ tabsDone: true, homeDone: false, homeHasCards: true });
  assert.deepEqual(legsIn(second), ['home']);
  assert.equal(second.length, HOME_STEPS.length);
});

test('replay with no program replays only the tabs — the Home leg has nothing to point at yet', () => {
  const steps = plan({ tabsDone: true, homeDone: true, homeHasCards: false, replay: true });
  assert.deepEqual(legsIn(steps), ['tabs']);
});

test('every step carries copy, and every Home step carries an anchor', () => {
  for (const step of [...TAB_STEPS, ...HOME_STEPS]) {
    assert.ok(step.key && step.title && step.body, `${step.key} is fully authored`);
    assert.ok(step.route.startsWith('/'), `${step.key} names a real route`);
  }
  for (const step of HOME_STEPS) {
    assert.ok(step.anchor, `${step.key} rings a real card`);
    assert.equal(step.route, '/', 'the Home leg never leaves Home');
  }
  for (const step of TAB_STEPS) assert.equal(step.anchor, undefined);
});

test('step keys are unique — the overlay keys its card on them', () => {
  const keys = [...TAB_STEPS, ...HOME_STEPS].map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length);
});

// ── per-surface walkthroughs ────────────────────────────────────────────────────────────────────────

const SURFACES = Object.keys(SCREEN_TOURS);

const WORKOUTS_CLUSTER = ['workouts', 'program-builder', 'day-builder', 'workout', 'program-detail', 'exercise-library', 'templates'];
const LEGACY_CLUSTER = [
  'legacy',
  'chapter-detail',
  'goals',
  'progress-hub',
  'photos',
  'transformation',
  'accomplishments',
  'legacy-timeline',
  'honors',
  'trophy-case',
];

test('the Workouts cluster is covered end to end, branched screens included', () => {
  for (const key of WORKOUTS_CLUSTER) {
    assert.ok(SCREEN_TOURS[key]?.length > 0, `${key} has a walkthrough`);
  }
});

const SQUADS_CLUSTER = [
  'squads',
  'squad-detail',
  'discover-squads',
  'squad-preview',
  'squad-settings',
  'squad-requests',
  'squad-records',
  'squad-composer',
  'friends',
  'add-friend',
];

test('the Legacy cluster is covered end to end — hub plus ten branches', () => {
  for (const key of LEGACY_CLUSTER) {
    assert.ok(SCREEN_TOURS[key]?.length > 0, `${key} has a walkthrough`);
  }
});

test('the Squads cluster is covered end to end, Friends included', () => {
  for (const key of SQUADS_CLUSTER) {
    assert.ok(SCREEN_TOURS[key]?.length > 0, `${key} has a walkthrough`);
  }
});

/**
 * The Squads cluster's through-line is CONSENT: a squad is entered by approval, never by walking in;
 * friendship is mutual and searched by handle, never browsed; and squad-mates see training numbers a
 * stranger cannot. Each of those is a rule the screen itself never states.
 */
test('Squads teaches the consent model, not the buttons', () => {
  const said = (k, key) => {
    const s = SCREEN_TOURS[k].find((x) => x.key === key);
    return `${s.title} ${s.body}`;
  };
  assert.match(said('squads', 'sq-card'), /invited|ask|owner says yes/i, 'nobody walks into a squad');
  assert.match(said('squads', 'sq-discover'), /not the same as enterable/i, 'public ≠ open');
  assert.match(said('squad-preview', 'sp-request'), /approve|decline/i, 'the owner decides');
  assert.match(said('squad-detail', 'sd-records'), /stranger never can/i, 'the firewall lifts inside a squad only');
  assert.match(said('squad-detail', 'sd-checkins'), /presence/i, 'check-ins are not posts');
  assert.match(said('squad-composer', 'sc-post'), /never appear in a feed on their own/i, 'nothing posts itself');
  assert.match(said('friends', 'fr-add'), /mutual|accept/i, 'friendship takes both');
  assert.match(said('friends', 'fr-add'), /no following|no browsing/i, 'and it is a circle, not an audience');
  assert.match(said('add-friend', 'af-search'), /no directory/i, 'handle search only, on purpose');
});

test('Legacy teaches the ideas, not the controls', () => {
  const said = (k, key) => {
    const s = SCREEN_TOURS[k].find((x) => x.key === key);
    return `${s.title} ${s.body}`;
  };
  assert.match(said('legacy', 'lg-pinned'), /six/i, 'the museum cap is stated');
  assert.match(said('legacy', 'lg-collections'), /write|earn/i, 'accomplishments vs honors');
  assert.match(said('chapter-detail', 'cd-seal'), /permanent|can’t be edited|freeze/i, 'sealing is permanent');
  assert.match(said('chapter-detail', 'cd-archive'), /only place/i, 'photos are created here');
  assert.match(said('photos', 'pg-count'), /no add button/i, 'and NOT here');
  assert.match(said('transformation', 'tf-grid'), /isn’t the photo gallery/i, 'the two photo features differ');
  assert.match(said('honors', 'hn-categories'), /catalogue|checklist/i, 'no list of the unearned');
});

/**
 * The Featured Legacy Moment is a LOCKED five-tier spec (`Featured-Legacy-Moment-Standards.md`) that
 * `deriveFeatured` implements for exactly one event type. The tour must describe the APP, not the spec —
 * copy promising "the most meaningful thing recently" would be teaching a system nobody has built, which
 * is precisely the failure the stale Workouts tour was guilty of.
 */
test('the Featured step describes what the code does, not what the spec says', () => {
  const step = SCREEN_TOURS.legacy.find((s) => s.key === 'lg-featured');
  const said = `${step.title} ${step.body}`;
  assert.match(said, /chosen for you|don’t pick/i, 'it is not curated by the athlete');
  assert.match(said, /sealed/i, 'and it is specifically the last sealed chapter');
  assert.doesNotMatch(said, /most meaningful/i, 'no promise of the unbuilt tier system');
});

/** The cross-screen collision: three curation-shaped ideas, all locked, differently named. */
test('Featured on Profile is disambiguated from Pinned Legacy', () => {
  const step = SCREEN_TOURS.accomplishments.find((s) => s.key === 'ac-featured');
  assert.match(step.body, /Pinned Legacy/, 'names the thing it is not');
  assert.match(step.body, /three/i);
  assert.match(step.body, /six/i);
});

test('Home has no per-surface tour — the guided run’s Home leg is its walkthrough', () => {
  assert.deepEqual(SCREEN_TOURS.home, []);
});

test('every spotlit step rings a real card — a card-only tour teaches a screen it can’t point at', () => {
  const anchored = [...WORKOUTS_CLUSTER, ...LEGACY_CLUSTER, ...SQUADS_CLUSTER];
  for (const key of anchored) {
    for (const step of SCREEN_TOURS[key]) {
      assert.ok(step.anchor, `${key}/${step.key} names an anchor`);
    }
  }
});

test('every step is fully authored', () => {
  for (const key of SURFACES) {
    for (const step of SCREEN_TOURS[key]) {
      assert.ok(step.key, `${key} step has a key`);
      assert.ok(step.title?.length, `${key}/${step.key} has a title`);
      assert.ok(step.body?.length > 20, `${key}/${step.key} has real copy`);
    }
  }
});

test('step keys are unique within each surface', () => {
  for (const key of SURFACES) {
    const keys = SCREEN_TOURS[key].map((s) => s.key);
    assert.equal(new Set(keys).size, keys.length, `${key} has no duplicate step keys`);
  }
});

test('no anchor is claimed by two surfaces — the registry is keyed by id alone', () => {
  const seen = new Map();
  for (const key of SURFACES) {
    for (const step of SCREEN_TOURS[key]) {
      if (!step.anchor) continue;
      const prior = seen.get(step.anchor);
      assert.equal(prior, undefined, `${step.anchor} is claimed by both ${prior} and ${key}`);
      seen.set(step.anchor, key);
    }
  }
  // …and the guided run's Home leg must not collide with them either.
  for (const step of HOME_STEPS) {
    assert.ok(!seen.has(step.anchor), `${step.anchor} is claimed by both the Home leg and ${seen.get(step.anchor)}`);
  }
});

test('the walkthroughs teach the decisions, not the labels', () => {
  // Title + body: which half carries the claim is a copy decision, not a contract.
  const said = (k, key) => {
    const s = SCREEN_TOURS[k].find((x) => x.key === key);
    return `${s.title} ${s.body}`;
  };
  const body = said;
  assert.match(said('workouts', 'wk-templates'), /already done/i, 'a template is a session you did');
  assert.match(body('workouts', 'wk-start'), /TRACK|LOG/, 'track vs log is spelled out');
  assert.match(body('program-builder', 'pb-structure'), /Repeat the same week|Customize each week/);
  assert.match(body('day-builder', 'db-sections'), /optional/i, 'which sections are optional');
  assert.match(body('workout', 'w-sets'), /Actual/, 'target vs actual');
  assert.match(body('program-detail', 'pd-actions'), /End Program/, 'ending is not deleting');
});
