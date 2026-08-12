import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bodyTargetProblem,
  bodyTargetSummary,
  directionLabels,
  goalSections,
  historyDate,
  isQuantifiable,
  meetsTarget,
  orderedUnits,
  parseTarget,
  progressEntryLine,
  progressLabel,
  progressPct,
  resolveBodyTarget,
  UNIT_CHIPS,
  validateGoal,
} from '../goals.ts';

const g = (over = {}) => ({
  id: 'g1',
  chapterId: 'ch-1',
  name: 'Squat 405 lb',
  target: 405,
  unit: 'lb',
  current: 225,
  isPrimary: false,
  targetDate: null,
  achievedAt: null,
  createdAt: '2026-06-01T00:00:00Z',
  ...over,
});

// ── quantifiable vs narrative ──────────────────────────────────────────────────

test('a goal is quantifiable when it has a target, narrative otherwise', () => {
  assert.equal(isQuantifiable(g()), true);
  assert.equal(isQuantifiable(g({ target: null })), false);
});

test('progress is a clamped percentage for quantifiable, 0/100 for narrative', () => {
  assert.equal(progressPct(g({ current: 225, target: 405 })), 56);
  assert.equal(progressPct(g({ current: 500, target: 405 })), 100, 'never over 100');
  assert.equal(progressPct(g({ current: -5, target: 405 })), 0, 'never below 0');
  assert.equal(progressPct(g({ target: null, achievedAt: null })), 0, 'narrative in progress');
  assert.equal(progressPct(g({ target: null, achievedAt: '2026-06-02T00:00:00Z' })), 100, 'narrative achieved');
});

test('meetsTarget fires only when a real target is reached', () => {
  assert.equal(meetsTarget(g({ current: 405, target: 405 })), true);
  assert.equal(meetsTarget(g({ current: 404, target: 405 })), false);
  assert.equal(meetsTarget(g({ target: null, current: 999 })), false, 'a narrative goal is never auto-complete');
});

test('the progress line reads the way the design shows it, and trims trailing zeros', () => {
  assert.equal(progressLabel(g({ current: 225, target: 405, unit: 'lb' })), '225 / 405 lb');
  assert.equal(progressLabel(g({ current: 5.5, target: 26.2, unit: 'mi' })), '5.5 / 26.2 mi');
  assert.equal(progressLabel(g({ target: null, achievedAt: null })), 'In progress');
  assert.equal(progressLabel(g({ target: null, achievedAt: '2026-01-01T00:00:00Z' })), 'Achieved');
});

// ── G-1 sections ────────────────────────────────────────────────────────────────

test('sections put the primary on top, split secondary into active and achieved', () => {
  const goals = [
    g({ id: 'p', isPrimary: true, achievedAt: '2026-07-01T00:00:00Z' }), // achieved primary STAYS primary
    g({ id: 's1', createdAt: '2026-06-10T00:00:00Z' }),
    g({ id: 's2', createdAt: '2026-06-20T00:00:00Z' }),
    g({ id: 's3', achievedAt: '2026-06-15T00:00:00Z', createdAt: '2026-06-05T00:00:00Z' }),
  ];
  const s = goalSections(goals);
  assert.equal(s.primary.id, 'p', 'the achieved primary is still the primary, pinned — not moved to Achieved');
  assert.deepEqual(s.active.map((x) => x.id), ['s2', 's1'], 'active secondary, newest first');
  assert.deepEqual(s.achieved.map((x) => x.id), ['s3'], 'achieved secondary');
});

test('no primary is a valid state (a fresh chapter)', () => {
  const s = goalSections([g({ id: 'a', isPrimary: false })]);
  assert.equal(s.primary, null);
  assert.equal(s.active.length, 1);
});

// ── form ──────────────────────────────────────────────────────────────────────

test('parseTarget yields a positive number or null for a narrative goal', () => {
  assert.equal(parseTarget('405'), 405);
  assert.equal(parseTarget('26.2'), 26.2);
  assert.equal(parseTarget(''), null, 'blank = narrative');
  assert.equal(parseTarget('  '), null);
  assert.equal(parseTarget('0'), null, 'zero is not a target');
  assert.equal(parseTarget('-5'), null);
  assert.equal(parseTarget('abc'), null);
});

test('a goal needs a name; a present target must be a positive number', () => {
  assert.equal(validateGoal({ name: 'Run a marathon', target: '' }).ok, true, 'narrative is fine');
  assert.equal(validateGoal({ name: 'Squat', target: '405' }).ok, true);
  assert.equal(validateGoal({ name: '', target: '' }).ok, false);
  assert.equal(validateGoal({ name: '  ', target: '405' }).ok, false);
  assert.equal(validateGoal({ name: 'x'.repeat(61), target: '' }).ok, false);
  assert.equal(validateGoal({ name: 'ok', target: 'lots' }).ok, false, 'a garbage target is rejected, not silently dropped');
});

test('a history row reads "from → to unit", trimming zeros, and dates compactly', () => {
  assert.equal(progressEntryLine({ fromValue: 365, toValue: 405 }, 'lb'), '365 → 405 lb');
  assert.equal(progressEntryLine({ fromValue: 5, toValue: 5.5 }, 'mi'), '5 → 5.5 mi');
  assert.equal(progressEntryLine({ fromValue: 0, toValue: 3 }, null), '0 → 3', 'no unit, no trailing space');
  assert.equal(historyDate('2026-06-14T10:00:00Z'), 'Jun 14');
  assert.equal(historyDate('nope'), '');
});

// ── body goals: direction is asked, and 15 can mean "add 15" ──────────────────
//
// The defect these guard: "weight" was a quantity with no direction, so the app inferred one by asking
// whether the target sat below the latest weigh-in. That question has no answer before the first weigh-in
// — it defaulted to 'up' — and it cannot express "add 15 lb" at all.

const body = (over = {}) => ({ mode: 'target', dir: 'up', value: 180, baseline: 165, ...over });

test('an amount to change resolves against the baseline, each way', () => {
  // The PO's case, literally: 165 lb and the goal is to add 15.
  assert.equal(resolveBodyTarget(body({ mode: 'change', dir: 'up', value: 15, baseline: 165 })), 180);
  assert.equal(resolveBodyTarget(body({ mode: 'change', dir: 'down', value: 15, baseline: 200 })), 185);
  assert.equal(resolveBodyTarget(body({ mode: 'target', value: 185 })), 185, 'an absolute target is itself');
});

test('the SAME number means opposite things — which is why the direction is asked', () => {
  const gain = resolveBodyTarget(body({ mode: 'change', dir: 'up', value: 15, baseline: 185 }));
  const lose = resolveBodyTarget(body({ mode: 'change', dir: 'down', value: 15, baseline: 185 }));
  assert.equal(gain, 200);
  assert.equal(lose, 170);
  assert.notEqual(gain, lose, 'direction cannot be inferred from the number — it is the whole question');
});

test('a change that cannot resolve yields null rather than a wrong number', () => {
  assert.equal(resolveBodyTarget(body({ mode: 'change', value: 15, baseline: null })), null, 'nothing to change from');
  assert.equal(resolveBodyTarget(body({ mode: 'change', dir: 'down', value: 200, baseline: 165 })), null, 'would leave nothing');
  assert.equal(resolveBodyTarget(body({ value: 0 })), null);
  assert.equal(resolveBodyTarget(body({ value: null })), null);
});

test('a goal that contradicts itself is stopped, not silently rewritten', () => {
  // The old inference took "Lose, goal 200" from a 185 lb athlete and saved it as a GAIN.
  assert.match(bodyTargetProblem(body({ dir: 'down', value: 200, baseline: 185 }), 'lb'), /not below your current 185 lb/);
  assert.match(bodyTargetProblem(body({ dir: 'up', value: 170, baseline: 185 }), 'lb'), /not above your current 185 lb/);
  assert.match(bodyTargetProblem(body({ mode: 'change', dir: 'down', value: 300, baseline: 185 }), 'lb'), /can't lose 300 lb from 185 lb/);
  assert.match(bodyTargetProblem(body({ mode: 'change', value: 15, baseline: null }), 'lb'), /needs somewhere to start/);
});

test('a sound body goal reports no problem — including before there is any reading', () => {
  assert.equal(bodyTargetProblem(body({ dir: 'up', value: 200, baseline: 185 }), 'lb'), null);
  assert.equal(bodyTargetProblem(body({ dir: 'down', value: 175, baseline: 185 }), 'lb'), null);
  // No weigh-in yet: there is nothing to contradict, and the chosen direction stands on its own. This is
  // exactly the case the inference could not answer.
  assert.equal(bodyTargetProblem(body({ dir: 'down', value: 175, baseline: null }), 'lb'), null);
  assert.equal(bodyTargetProblem(body({ value: 0 }), 'lb'), null, 'an empty field is the target validator’s job');
});

test('the summary states the journey the goal will actually track', () => {
  assert.equal(bodyTargetSummary(body({ mode: 'change', dir: 'up', value: 15, baseline: 165 }), 'lb', 'body_weight'), '165 lb → 180 lb · gain 15 lb');
  assert.equal(bodyTargetSummary(body({ dir: 'down', value: 185, baseline: 200 }), 'lb', 'body_weight'), '200 lb → 185 lb · lose 15 lb');
  assert.equal(bodyTargetSummary(body({ dir: 'down', value: 32, baseline: 34 }), 'in', 'body_measure'), '34 in → 32 in · shrink 2 in');
  assert.equal(bodyTargetSummary(body({ baseline: null }), 'lb', 'body_weight'), null, 'no baseline, no journey to state');
});

test('each metric calls its directions what an athlete would call them', () => {
  assert.deepEqual(directionLabels('body_weight'), { down: 'Lose', up: 'Gain' });
  assert.deepEqual(directionLabels('body_measure'), { down: 'Shrink', up: 'Grow' });
});

test('a gain goal reads its progress from the baseline, not from zero', () => {
  // 165 → 180, currently 170: a third of the way. Without the baseline this was 170/180 = 94%.
  const gain = { target: 180, current: 170, achievedAt: null, metricDir: 'up', metricStartValue: 165 };
  assert.equal(progressPct(gain), 33);
  assert.equal(meetsTarget({ ...gain, current: 180 }), true);
  assert.equal(meetsTarget({ ...gain, current: 179 }), false);

  const cut = { target: 185, current: 195, achievedAt: null, metricDir: 'down', metricStartValue: 200 };
  assert.equal(progressPct(cut), 33);
  assert.equal(meetsTarget({ ...cut, current: 184 }), true);
  assert.equal(meetsTarget({ ...cut, current: 190 }), false);
});

test('unit chips smart-order by goal name and always offer the full set', () => {
  assert.equal(orderedUnits('Run a 5K')[0], 'mi', 'running surfaces distance first');
  assert.equal(orderedUnits('Squat 405')[0], 'lb', 'lifting surfaces load first');
  for (const chips of [orderedUnits('Run'), orderedUnits('anything')]) {
    assert.equal(new Set(chips).size, UNIT_CHIPS.length, 'every unit stays available, no duplicates');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ "LOSE 5 LB" DREW A FULL BAR — the PO's own goal, 2026-08-11
// ─────────────────────────────────────────────────────────────────────────────

test('a cut that has not started yet is 0%, not 100% — the reported bug', () => {
  // 195 lb, target 190. Saved before the editor asked, so metricDir defaulted to 'up'.
  const g = { target: 190, current: 195, achievedAt: null, metricDir: 'up', metricStartValue: 195 };
  assert.equal(progressPct(g), 0);
});

test('…and it is not silently marked achieved either', () => {
  const g = { target: 190, current: 195, metricDir: 'up', metricStartValue: 195 };
  assert.equal(meetsTarget(g), false);
});

test('the bar moves a pound at a time as weight is logged', () => {
  const at = (current) => progressPct({ target: 190, current, achievedAt: null, metricDir: 'up', metricStartValue: 195 });
  assert.equal(at(195), 0);
  assert.equal(at(194), 20);
  assert.equal(at(193), 40);
  assert.equal(at(192.5), 50);
  assert.equal(at(191), 80);
  assert.equal(at(190), 100);
});

test('overshooting the target stays at 100, never above', () => {
  assert.equal(progressPct({ target: 190, current: 186, achievedAt: null, metricDir: 'down', metricStartValue: 195 }), 100);
  assert.equal(meetsTarget({ target: 190, current: 186, metricDir: 'down', metricStartValue: 195 }), true);
});

test('gaining backwards reads as 0, not as negative progress', () => {
  assert.equal(progressPct({ target: 190, current: 198, achievedAt: null, metricDir: 'down', metricStartValue: 195 }), 0);
});

test('a cut with NO baseline yet is 0% — never the accumulate ratio', () => {
  // 195 / 190 = 103% → the old code clamped that to a full bar.
  assert.equal(progressPct({ target: 190, current: 195, achievedAt: null, metricDir: 'down', metricStartValue: null }), 0);
});

test('a cut with no baseline still reads 100 once it actually arrives', () => {
  assert.equal(progressPct({ target: 190, current: 189, achievedAt: null, metricDir: 'down', metricStartValue: null }), 100);
});

test('a GAIN goal is unaffected — the numbers say up and it climbs', () => {
  const at = (current) => progressPct({ target: 200, current, achievedAt: null, metricDir: 'up', metricStartValue: 190 });
  assert.equal(at(190), 0);
  assert.equal(at(195), 50);
  assert.equal(at(200), 100);
});

test('a stored direction that disagrees with the numbers cannot make the bar lie', () => {
  // "Gain to 190" from 195 is a contradiction `bodyTargetProblem` surfaces in words. The BAR must still
  // draw the journey the numbers describe rather than declaring it finished.
  assert.equal(progressPct({ target: 190, current: 195, achievedAt: null, metricDir: 'up', metricStartValue: 195 }), 0);
  assert.equal(progressPct({ target: 190, current: 192, achievedAt: null, metricDir: 'up', metricStartValue: 195 }), 60);
});

test('an accumulate goal with no baseline keeps the original ratio behaviour', () => {
  assert.equal(progressPct({ target: 400, current: 100, achievedAt: null }), 25);
  assert.equal(progressPct({ target: 400, current: 500, achievedAt: null }), 100);
});
