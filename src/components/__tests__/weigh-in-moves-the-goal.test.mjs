/**
 * weigh-in-moves-the-goal.test.mjs — a weigh-in moves the weight goal, and the sheet can be used.
 *
 * PO (2026-08-28), two reports on one sheet: *"Take off the goal part cause some people it is a goal.
 * And then make sure it actually works and that the keyboard doesn't cover and nothing is covering
 * anything."* Then: *"I entered my new weight and it didn't move the goal at all. Why?"*
 *
 * Because nothing asked it to — the only caller of `syncAutoGoals` was the Goals screen's own effect.
 * And the sheet's bodyweight field collapsed to zero height on iOS (`flex: 1` in a column with no
 * definite height), so the "+ Add measurements" link drew through the input. Both are source facts;
 * this holds them.
 *
 * Run:  node --test src/components/__tests__/weigh-in-moves-the-goal.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SHEET = read('../forge/LogWeightSheet.tsx');
const BODY = read('../forge/BodySection.tsx');
const LEGACY = read('../../app/(tabs)/legacy.tsx');
const HOOK = read('../../hooks/useBodyGoalSync.ts');
const DATA = read('../../data/goals-live.ts');
const LEGACY_DATA = read('../../data/legacy-live.ts');
const GOAL_FORM = read('../../app/goals.tsx');

test('the sheet no longer tells the athlete weight is not a goal', () => {
  assert.doesNotMatch(strip(SHEET), /no goal weight|no pressure/, 'the "no goal weight" line is back');
});

test('⚠ a column field never carries flex: 1 — that is the zero-height collapse on iOS', () => {
  const s = strip(SHEET);
  assert.match(s, /fieldWrap: \{ gap: 7 \},/, 'fieldWrap must not carry flex: 1');
  assert.match(s, /fieldGrow: \{ flex: 1 \},/, 'the grow style for the three-up row is gone');
  // Only the measurement row's three fields grow.
  assert.match(s, /field\(`Bodyweight \(\$\{unitLabel\}\)`, weight, setWeight, 'e\.g\. 199', 'w'\)/, 'the bodyweight field must not grow');
  assert.equal((s.match(/, true\)\}/g) ?? []).length, 3, 'exactly the three measurement fields grow');
});

test('a saved weigh-in syncs the body goals, and the Legacy tab syncs them on focus', () => {
  assert.match(strip(BODY), /onSaved=\{\(\) => \{\s*refetch\(\);\s*void syncBodyGoals\(\);\s*\}\}/, 'BodySection no longer syncs the goal after a weigh-in');
  assert.match(strip(LEGACY), /void syncBodyGoals\(\)\.then\(\(changed\) => changed && refetch\(\)\);/, 'the Legacy tab no longer syncs body goals on focus');
});

test('the sync is body-kind only, and a goal it achieves still gets its ceremony', () => {
  const d = strip(DATA);
  assert.match(d, /export async function syncBodyGoals\(\)/);
  assert.match(d, /usesBaseline\(g\.metricKind\) && isAutoTracked\(g\) && g\.achievedAt == null && g\.target != null/, 'the body sync must filter to weight/measurement goals');
  const h = strip(HOOK);
  assert.match(h, /kind: 'goalAchieved'/, 'a primary goal achieved by a weigh-in must fire M-3');
  assert.match(h, /showToast\('Goal achieved · recorded in your legacy'\)/, 'a secondary goal achieved by a weigh-in must say so');
});

test('⚠ the Legacy card reads the goal’s direction and baseline — or a cut draws a full bar', () => {
  // 193 against a 190 target rendered as 100% on Legacy while the chapter screen said 0%: the Legacy
  // row selected neither `metric_dir` nor `metric_start_value`, so `progressPct` fell to `current / target`.
  const s = strip(LEGACY_DATA);
  assert.match(s, /select\('chapter_id, name, target, unit, current, achieved_at, metric_dir, metric_start_value'\)/, 'the Legacy goal select lost the direction / baseline');
  assert.match(s, /metricDir: g\.metric_dir === 'down' \? \('down' as const\) : \('up' as const\),/, 'the direction is not mapped');
  assert.match(s, /metricStartValue: g\.metric_start_value \?\? null,/, 'the baseline is not mapped');
});

test('an existing goal switched to bodyweight measures from where it began, not from today', () => {
  assert.match(strip(GOAL_FORM), /existing\s*\?\s*startBodyReading\(bodyEntries, existing\.createdAt, bodyColumn\)\s*:\s*latestBodyReading\(bodyEntries, bodyColumn\)/, 'the form no longer anchors an edited goal at its creation');
});
