/**
 * ⚠ THE REPEAT DEFECT — showing a nudge without recording it, and what that costs.
 *
 * PO, 2026-08-26: *"coach holt as prompted me the same prompt about honors about three times now… why
 * it's repeating even after I clicked on it, and why other things haven't come up (is it because I've
 * used everything?)"*
 *
 * Both halves of that report come from ONE omission. `CoachBubble` renders the invitation on the coin
 * every time the athlete lands on a home surface, but until this was fixed it only wrote `shown` when
 * they TAPPED the coin. A line that is read and not tapped left no trace, so the next arrival re-ran
 * `chooseNudge` against an empty history and picked the same one.
 *
 * The second half is the more expensive one and it is not obvious: `honors` is eligible whenever
 * `honors > 0`, which is FOREVER once earned, and it sits third in a strictly ordered catalogue. An
 * un-retired nudge at the head does not just repeat — it starves every nudge below it permanently. The
 * answer to "is it because I've used everything?" is no: nothing below `honors` was ever reachable.
 *
 * These tests hold the DECISION side of that. They pass against the pure domain either way, which is
 * the point — they describe what the caller must do for the cadence to mean anything.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { chooseNudge, NUDGES, GAP_DAYS } from '../nudges.ts';

const NOW = Date.parse('2026-08-26T12:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86_400_000).toISOString();

/** The reporting athlete: trained plenty, has photos, goals and honors already. */
const po = (over = {}) => ({
  sessions: 40, photos: 4, goals: 2, templates: 0, squads: 0, honors: 6, weighIns: 0, programs: 0, ...over,
});

test('⚠ a nudge that is shown but never recorded repeats forever', () => {
  const signals = po();
  /* Four arrivals on a home surface — Home, Workouts, Legacy, Squads — with nothing written between
     them, which is exactly what the caller did before the fix. */
  const seen = [];
  for (let i = 0; i < 4; i++) seen.push(chooseNudge(signals, {}, NOW + i * 60_000)?.id);
  assert.deepEqual(seen, ['honors', 'honors', 'honors', 'honors'],
    'an unrecorded nudge is re-chosen on every single arrival');
});

test('⚠ …and it starves everything below it, which is why nothing else ever appeared', () => {
  const signals = po();
  /* Every nudge the catalogue could still offer this athlete. */
  const reachable = NUDGES.filter((n) => n.eligible(signals)).map((n) => n.id);
  assert.ok(reachable.length > 1, 'more than one invitation is genuinely available');
  assert.equal(reachable[0], 'honors', 'honors is the highest-priority eligible one');

  /* With an empty history the ONLY one ever chosen is the head of that list. */
  const everChosen = new Set();
  for (let i = 0; i < 50; i++) everChosen.add(chooseNudge(signals, {}, NOW + i * 3_600_000)?.id);
  assert.deepEqual([...everChosen], ['honors'],
    'the tail of the catalogue is unreachable while the head is never retired');

  /* The answer to "have I used everything?" — no. These were waiting behind it. */
  assert.ok(reachable.slice(1).length >= 3, 'several invitations were still owed: ' + reachable.slice(1));
});

test('recording the display is what unblocks the queue', () => {
  const signals = po();
  const shown = chooseNudge(signals, {}, NOW);
  assert.equal(shown.id, 'honors');

  /* What the caller must write the moment the line is on screen. */
  const history = { honors: { shownAt: new Date(NOW).toISOString() } };

  /* Immediately after, the global gap keeps him quiet — one a week, not one a tab. */
  assert.equal(chooseNudge(signals, history, NOW + 60_000), null,
    'the gap is measured from the display, so switching tabs says nothing');

  /* And once the week is up, the NEXT invitation gets its turn instead of the same one again. */
  const later = NOW + (GAP_DAYS + 1) * 86_400_000;
  const next = chooseNudge(signals, history, later);
  assert.ok(next, 'a new invitation is due');
  assert.notEqual(next.id, 'honors', 'not the one already spoken');
});

test('tapping through to the feature still retires it permanently', () => {
  const signals = po();
  const history = { honors: { shownAt: daysAgo(30), usedAt: daysAgo(30) } };
  const later = NOW + 86_400_000;
  for (let i = 0; i < 10; i++) {
    assert.notEqual(chooseNudge(signals, history, later + i * 86_400_000)?.id, 'honors',
      'a used nudge never returns');
  }
});
