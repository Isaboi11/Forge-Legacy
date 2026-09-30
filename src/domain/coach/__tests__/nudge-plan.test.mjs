/**
 * The two invitations added by Monetization Amendment 009 — the `plan` nudge (you keep running the same
 * workout; want a plan built on it?) and the weekly review's closing offer.
 *
 * What these hold is the line between helping somebody find the coach and selling to them. MA6-D9 allows
 * exactly two paywall moments and the nudge catalogue has never sold anything; both invitations lead to
 * the FEATURE, and both go quiet the moment following them would land on the upgrade screen instead.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseNudge, NUDGES, NUDGE_LINES, REPEAT_MIN, GAP_DAYS, DISMISS_COOLDOWN_DAYS, repeatedWorkout, reviewOffer } from '../nudges.ts';

const NOW = Date.parse('2026-09-30T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86_400_000).toISOString();

const fresh = (over = {}) => ({
  sessions: 10, photos: 0, goals: 0, templates: 0, squads: 0, honors: 0, weighIns: 0, programs: 0, ...over,
});
const REPEAT = { name: 'Push Day A', count: 4 };

test('repeatedWorkout: three of the same is a routine, and the app’s own default names never are', () => {
  assert.equal(repeatedWorkout(['Push Day A', 'Pull Day', 'Push Day A']), null, 'twice is a coincidence');
  assert.deepEqual(repeatedWorkout(['Push Day A', 'Pull Day', 'push day a ', 'Legs', 'Push Day A']), { name: 'Push Day A', count: 3 });
  // What a session is called when nobody named it (workout.tsx / save-core FREESTYLE_NAME).
  assert.equal(repeatedWorkout(['Freestyle Workout', 'Freestyle Workout', 'Freestyle Workout', 'Workout', 'Workout', 'Workout']), null);
  assert.equal(repeatedWorkout([null, undefined, '', '  ']), null);
  assert.equal(repeatedWorkout([]), null);
});

test('repeatedWorkout: the most repeated wins, and a tie goes to the one done most recently', () => {
  const names = ['Legs', 'Push', 'Legs', 'Push', 'Legs', 'Push', 'Pull', 'Push'];
  assert.deepEqual(repeatedWorkout(names), { name: 'Push', count: 4 });
  assert.deepEqual(repeatedWorkout(['Legs', 'Push', 'Legs', 'Push', 'Legs', 'Push']), { name: 'Legs', count: 3 });
  assert.equal(REPEAT_MIN, 3);
});

test('plan leads the catalogue, but only on evidence and only with no program', () => {
  assert.equal(chooseNudge(fresh({ repeat: REPEAT }), {}, NOW)?.id, 'plan');
  assert.notEqual(chooseNudge(fresh(), {}, NOW)?.id, 'plan', 'no repeated workout, nothing to point at');
  assert.notEqual(chooseNudge(fresh({ repeat: { name: 'Push', count: 2 } }), {}, NOW)?.id, 'plan');
  assert.notEqual(chooseNudge(fresh({ repeat: REPEAT, programs: 1 }), {}, NOW)?.id, 'plan', 'they already have a plan');
  // …and it still respects the cadence everything else lives under.
  assert.equal(chooseNudge(fresh({ repeat: REPEAT, sessions: 2 }), {}, NOW), null);
  assert.equal(chooseNudge(fresh({ repeat: REPEAT }), { photos: { shownAt: daysAgo(GAP_DAYS - 1) } }, NOW), null);
});

test('the line names the workout and the count, and is still a question', () => {
  const def = NUDGES.find((n) => n.id === 'plan');
  for (let i = 0; i < NUDGE_LINES.plan.length * 3; i++) {
    const line = def.line(fresh({ repeat: REPEAT }));
    assert.match(line, /Push Day A/);
    assert.match(line, /\b4\b/);
    assert.match(line, /\?$/);
    assert.doesNotMatch(line, /\{/);
  }
});

test('⚠ it never invites anyone to a paywall: silent once the free Holt program is used (MA9-D1, MA6-D9)', () => {
  const spent = fresh({ repeat: REPEAT, canBuildProgram: false });
  const n = chooseNudge(spent, {}, NOW);
  assert.ok(n, 'the rest of the catalogue still speaks');
  assert.ok(n.id !== 'plan' && n.id !== 'program', `offered ${n.id}, which now leads to the upgrade screen`);
  // Every row the catalogue can ever offer this athlete, not just the first.
  assert.ok(!NUDGES.filter((x) => x.eligible(spent)).some((x) => x.id === 'plan' || x.id === 'program'));
  assert.equal(reviewOffer(spent, {}, NOW), false);
  // No wording sells, names a price, or mentions a trial (MA6-D11: trial language only on P-8 and the site).
  for (const line of NUDGE_LINES.plan) assert.doesNotMatch(line, /premium|upgrade|free|trial|\$|plan screen/i, line);
  assert.doesNotMatch(NUDGES.find((x) => x.id === 'plan').route, /subscription|paywall|upgrade|premium/i);
});

test('plan and program are one question: an answer to either is an answer to both', () => {
  const s = fresh({ repeat: REPEAT, photos: 1, goals: 1, honors: 0 });
  // Refused the generic ask twice → the specific one never asks.
  assert.notEqual(chooseNudge(s, { program: { shownAt: daysAgo(40), dismissedCount: 2, dismissedAt: daysAgo(30) } }, NOW)?.id, 'plan');
  // Refused it once, recently → not yet.
  assert.notEqual(chooseNudge(s, { program: { shownAt: daysAgo(10), dismissedCount: 1, dismissedAt: daysAgo(DISMISS_COOLDOWN_DAYS - 1) } }, NOW)?.id, 'plan');
  // Accepted it → never.
  assert.notEqual(chooseNudge(s, { program: { shownAt: daysAgo(40), usedAt: daysAgo(40) } }, NOW)?.id, 'plan');
  // Saw the generic ask once and let it pass → naming the workout is new information, asked once.
  assert.equal(chooseNudge(s, { program: { shownAt: daysAgo(30) } }, NOW)?.id, 'plan');
  // The specific ask subsumes the generic one: `program` never follows a `plan` that was shown.
  const afterPlan = chooseNudge(fresh({ photos: 1, goals: 1 }), { plan: { shownAt: daysAgo(30) } }, NOW);
  assert.notEqual(afterPlan?.id, 'program');
  assert.notEqual(afterPlan?.id, 'plan');
});

test('reviewOffer: the same question at the foot of the weekly review, under the same answers', () => {
  assert.equal(reviewOffer(fresh(), {}, NOW), true);
  assert.equal(reviewOffer(fresh({ programs: 1 }), {}, NOW), false, 'they have a plan');
  assert.equal(reviewOffer(fresh({ sessions: 2 }), {}, NOW), false, 'too new to be asked anything');
  assert.equal(reviewOffer(fresh(), { plan: { usedAt: daysAgo(3) } }, NOW), false, 'they said yes');
  assert.equal(reviewOffer(fresh(), { program: { dismissedCount: 2, dismissedAt: daysAgo(90) } }, NOW), false, 'two refusals is an answer');
  assert.equal(reviewOffer(fresh(), { program: { dismissedCount: 1, dismissedAt: daysAgo(5) } }, NOW), false, 'cooling down');
  assert.equal(reviewOffer(fresh(), { plan: { shownAt: daysAgo(2) } }, NOW), false, 'the coin asked this week already');
  assert.equal(reviewOffer(fresh(), { plan: { shownAt: daysAgo(GAP_DAYS + 1) } }, NOW), true);
  // An unrelated nudge this week does not silence it: it is a line on a page they opened, not a second coin.
  assert.equal(reviewOffer(fresh(), { photos: { shownAt: daysAgo(1) } }, NOW), true);
});
