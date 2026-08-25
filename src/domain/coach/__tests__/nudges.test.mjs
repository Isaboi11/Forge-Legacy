/**
 * The nudge cadence — the numbers ARE the design, so this is where they are held.
 *
 * A nag on the coin is expensive in a way a nag elsewhere is not: it is the same object that carries the
 * progression call mid-workout, so teaching the athlete to ignore it costs the coaching too.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseNudge, NUDGES, MIN_SESSIONS, GAP_DAYS, DISMISS_COOLDOWN_DAYS, MAX_DISMISSALS } from '../nudges.ts';

const NOW = Date.parse('2026-08-25T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86_400_000).toISOString();

/** An athlete who has trained enough to be spoken to and has done nothing else. */
const fresh = (over = {}) => ({
  sessions: 10, photos: 0, goals: 0, templates: 0, squads: 0, honors: 0, weighIns: 0, programs: 0, ...over,
});

test('silence until the main loop is learned', () => {
  for (let s = 0; s < MIN_SESSIONS; s++) {
    assert.equal(chooseNudge(fresh({ sessions: s }), {}, NOW), null, `${s} sessions must be silent`);
  }
  assert.ok(chooseNudge(fresh({ sessions: MIN_SESSIONS }), {}, NOW), 'and speaks at the threshold');
});

test('one nudge, not a queue of eight', () => {
  const n = chooseNudge(fresh(), {}, NOW);
  assert.ok(n);
  assert.equal(typeof n.id, 'string');
});

test('⚠ the gap is GLOBAL — eight nudges cannot take turns delivering one a day', () => {
  /*
   * The failure this guards: a per-nudge gap looks identical in the code and lets the catalogue empty
   * itself in eight days. `photos` was shown yesterday, so NOTHING else may speak either.
   */
  const history = { photos: { shownAt: daysAgo(1) } };
  assert.equal(chooseNudge(fresh(), history, NOW), null);
});

test('…and it reopens exactly at the gap', () => {
  assert.equal(chooseNudge(fresh(), { photos: { shownAt: daysAgo(GAP_DAYS - 1) } }, NOW), null);
  assert.ok(chooseNudge(fresh(), { photos: { shownAt: daysAgo(GAP_DAYS) } }, NOW));
});

test('using the feature retires its nudge forever', () => {
  const history = { photos: { shownAt: daysAgo(30), usedAt: daysAgo(29) } };
  const n = chooseNudge(fresh({ photos: 3 }), history, NOW);
  assert.notEqual(n?.id, 'photos');
});

test('a refusal waits, and a second refusal ends it', () => {
  /* ⚠ `shownAt` IS OLD AND `dismissedAt` IS RECENT, which is the case that matters. The global gap reads
     `shownAt`, so an old showing clears it and the dismissal cooldown is then the only thing holding the
     nudge back — exactly the rule under test. (Written first with both at 30 days, which passes the
     cooldown and proved nothing.) */
  const once = { photos: { shownAt: daysAgo(30), dismissedAt: daysAgo(5), dismissedCount: 1 } };
  assert.notEqual(chooseNudge(fresh(), once, NOW)?.id, 'photos', 'still cooling down');

  const cooled = { photos: { shownAt: daysAgo(60), dismissedAt: daysAgo(DISMISS_COOLDOWN_DAYS), dismissedCount: 1 } };
  assert.equal(chooseNudge(fresh(), cooled, NOW)?.id, 'photos', 'a no today is not a no forever');

  const twice = { photos: { shownAt: daysAgo(60), dismissedAt: daysAgo(60), dismissedCount: MAX_DISMISSALS } };
  assert.notEqual(chooseNudge(fresh(), twice, NOW)?.id, 'photos', 'two refusals is an answer');
});

test('a nudge already shown does not repeat itself while others are unseen', () => {
  const history = { photos: { shownAt: daysAgo(30) } };
  const n = chooseNudge(fresh(), history, NOW);
  assert.ok(n);
  assert.notEqual(n.id, 'photos', 'it waits behind the ones never shown');
});

test('⚠ nothing is offered that the athlete has already done', () => {
  /* A nudge to a feature in use is the app not looking at what it already knows. */
  const done = fresh({ photos: 2, goals: 1, templates: 4, squads: 1, weighIns: 9, programs: 1, sessions: 40 });
  for (let i = 0; i < 20; i++) {
    const n = chooseNudge(done, {}, NOW);
    if (!n) break;
    assert.ok(!['photos', 'goals', 'templates', 'squads', 'metrics', 'program'].includes(n.id), `offered ${n.id}, which they already use`);
    break;
  }
});

test('honors is only offered once there are honors to look at', () => {
  const none = chooseNudge(fresh({ honors: 0 }), {}, NOW);
  assert.notEqual(none?.id, 'honors');
  // With everything else already done, honors is the one thing left that is real.
  const some = fresh({ honors: 4, photos: 1, goals: 1, templates: 1, squads: 1, weighIns: 1, programs: 1 });
  assert.equal(chooseNudge(some, {}, NOW)?.id, 'honors');
  assert.match(NUDGES.find((n) => n.id === 'honors').line(some), /4 honors/);
});

test('every line is a question, and every route is a real path', () => {
  const s = fresh();
  for (const n of NUDGES) {
    assert.match(n.line(s), /\?$/, `${n.id} must invite, not instruct`);
    assert.match(n.route, /^\//, `${n.id} route must be a path`);
  }
});

test('the catalogue holds nothing that sells or exposes', () => {
  /* Plan §3: no paywall, nothing that puts the athlete in front of other people uninvited. */
  for (const n of NUDGES) {
    assert.ok(!/subscription|paywall|upgrade|premium/i.test(n.route), `${n.id} routes at the paywall`);
    assert.ok(!/challenge|friend|add-friend/i.test(n.route), `${n.id} exposes the athlete socially`);
  }
});

test('ids are unique — a duplicate would share one history row and silence its twin', () => {
  const ids = NUDGES.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
});
