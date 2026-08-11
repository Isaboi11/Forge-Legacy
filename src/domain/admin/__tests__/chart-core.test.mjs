import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ADMIN_RAMP,
  areaPath,
  barFractions,
  cellState,
  compactNumber,
  deltaLabel,
  gridLines,
  groupedNumber,
  linePath,
  pctOf,
  rampStep,
  scaleY,
  DEFAULT_BOX,
} from '../chart-core.ts';

/**
 * The operator dashboard's chart math.
 *
 * Every test here pins a rule that, if it regressed, would put a CONFIDENT AND FALSE claim in front of
 * the one person who acts on this screen. That is a different bar from "the component renders" — a
 * chart that is merely ugly gets fixed; a chart that is wrong gets believed.
 */

// ── linePath / areaPath ──────────────────────────────────────────────────────

test('an empty series draws nothing rather than throwing', () => {
  assert.equal(linePath([]), '');
  assert.equal(areaPath([]), '');
});

test('a single point draws a flat segment, not an invisible dot', () => {
  const d = linePath([5]);
  assert.match(d, /^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/);
  // And the area under it still closes, so the wash does not disappear on a one-day range.
  assert.ok(areaPath([5]).endsWith('Z'));
});

test('an ALL-EQUAL series still renders — the range-0 divide-by-zero guard', () => {
  // This is the case that killed the chart it was copied from: max - min === 0, so every y is NaN and
  // the path is the string "MNaN NaN LNaN NaN", which renders as nothing at all with no error.
  const d = linePath([7, 7, 7, 7]);
  assert.ok(!d.includes('NaN'), `path should not contain NaN: ${d}`);
  const ys = [...d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => Number(m[2]));
  assert.equal(new Set(ys).size, 1, 'a flat series should be a flat line');
});

test('an all-zero series renders on the baseline without NaN', () => {
  const d = linePath([0, 0, 0]);
  assert.ok(!d.includes('NaN'));
  assert.ok(d.startsWith('M'));
});

test('count series are drawn against a ZERO baseline, not the series minimum', () => {
  // 3 → 9 against a floor of 3 would triple in height for a change of six people. Truncating a count
  // axis is the classic way to make noise look like a trend.
  const box = DEFAULT_BOX;
  const floor = box.h - box.padBot;
  assert.equal(scaleY(0, 3, 9, box), floor, 'zero must sit on the baseline even when min is 3');
  assert.ok(scaleY(3, 3, 9, box) < floor, 'the series minimum must be above the baseline');
  // 'min' baseline is opt-in and still available.
  assert.equal(scaleY(3, 3, 9, box, 'min'), floor);
});

test('a negative value cannot escape the plot box on a zero baseline', () => {
  const y = scaleY(-5, -5, 10, DEFAULT_BOX);
  assert.ok(y <= DEFAULT_BOX.h - DEFAULT_BOX.padBot);
  assert.ok(y >= 0);
});

// ── rampStep / cellState ─────────────────────────────────────────────────────

test('rampStep spans the whole ramp and clamps out-of-range input', () => {
  assert.equal(rampStep(100), ADMIN_RAMP.length - 1);
  assert.equal(rampStep(140), ADMIN_RAMP.length - 1, 'over 100 clamps rather than indexing off the end');
  assert.equal(rampStep(0.5), 0);
  assert.ok(rampStep(50) > rampStep(10), 'the ramp must be monotonic in the value it encodes');
  for (const pct of [1, 25, 50, 75, 99, 100]) {
    const s = rampStep(pct);
    assert.ok(s >= 0 && s < ADMIN_RAMP.length, `${pct}% → step ${s} is out of range`);
  }
});

test('ZERO is not a ramp step — it is a known fact with its own rendering', () => {
  // A 0% cohort cell means "nobody came back", which is real and must print its number. A cell past
  // the cohort's age means "we do not know yet" and must print nothing. Giving them the same fill is
  // the single most common way a cohort grid lies.
  assert.equal(rampStep(0), -1);
  assert.equal(rampStep(-3), -1);
  assert.equal(rampStep(Number.NaN), -1);
});

test('a cell beyond the cohort age is UNKNOWN, never zero', () => {
  assert.equal(cellState(0, 5), 'known');
  assert.equal(cellState(5, 5), 'known');
  assert.equal(cellState(6, 5), 'unknown');
  // A cohort born this week has aged 0 weeks: only k=0 is knowable.
  assert.equal(cellState(1, 0), 'unknown');
});

// ── deltaLabel ───────────────────────────────────────────────────────────────

test('deltaLabel never renders Infinity when the previous window was zero', () => {
  const d = deltaLabel(7, 0);
  assert.equal(d.dir, 'up');
  assert.equal(d.text, '+7', 'percent from zero is undefined, so report the absolute');
  assert.ok(!d.text.includes('Infinity'));
  assert.ok(!d.text.includes('NaN'));
});

test('deltaLabel carries its own sign, because colour alone is not readable', () => {
  // greenMuted vs redMuted is deutan ΔE 5.1 — below the 6.0 floor. For a meaningful share of readers
  // they are the same colour, so the TEXT has to say which way it went.
  assert.equal(deltaLabel(112, 100).text, '+12%');
  assert.equal(deltaLabel(96, 100).text, '−4%');
  assert.equal(deltaLabel(96, 100).dir, 'down');
  assert.ok(deltaLabel(112, 100).text.startsWith('+'));
});

test('deltaLabel says "no change" rather than +0%', () => {
  assert.deepEqual(deltaLabel(0, 0), { dir: 'flat', text: 'no change' });
  assert.deepEqual(deltaLabel(40, 40), { dir: 'flat', text: 'no change' });
});

test('deltaLabel returns null when there is nothing to compare against', () => {
  assert.equal(deltaLabel(5, null), null);
  assert.equal(deltaLabel(null, 5), null);
  assert.equal(deltaLabel(5, undefined), null);
});

// ── number formatting ────────────────────────────────────────────────────────

test('compactNumber switches units at the right boundaries', () => {
  assert.equal(compactNumber(0), '0');
  assert.equal(compactNumber(999), '999');
  assert.equal(compactNumber(1000), '1K');
  assert.equal(compactNumber(1284), '1.3K');
  assert.equal(compactNumber(12_900), '13K', 'ten and over drops the decimal');
  // The boundary case: 999,999 rounds to 1000K, which is not a number anybody writes.
  assert.equal(compactNumber(999_999), '1M');
  assert.equal(compactNumber(1_000_000), '1M');
  assert.equal(compactNumber(1_200_000), '1.2M');
});

test('a missing number reads as an em dash, never as 0 or NaN', () => {
  // "0 athletes" and "we could not load it" are different claims and must not look the same.
  assert.equal(compactNumber(null), '—');
  assert.equal(compactNumber(undefined), '—');
  assert.equal(compactNumber(Number.NaN), '—');
  assert.equal(groupedNumber(null), '—');
});

test('groupedNumber inserts thousands separators', () => {
  assert.equal(groupedNumber(1284), '1,284');
  assert.equal(groupedNumber(999), '999');
  assert.equal(groupedNumber(1_234_567), '1,234,567');
});

test('pctOf refuses to divide by a denominator that cannot support a percentage', () => {
  assert.equal(pctOf(3, 0), null);
  assert.equal(pctOf(3, null), null);
  assert.equal(pctOf(1, 3), 33.3);
  assert.equal(pctOf(0, 10), 0);
});

// ── bars and gridlines ───────────────────────────────────────────────────────

test('barFractions handles an all-zero set without NaN', () => {
  assert.deepEqual(barFractions([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(barFractions([5, 10]), [0.5, 1]);
  assert.deepEqual(barFractions([]), []);
});

test('gridLines survive an empty series', () => {
  const g = gridLines([]);
  assert.equal(g.length, 3);
  assert.ok(g.every((l) => Number.isFinite(l.y) && Number.isFinite(l.value)));
});
