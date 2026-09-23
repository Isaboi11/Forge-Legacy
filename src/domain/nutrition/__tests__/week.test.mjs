import test from 'node:test';
import assert from 'node:assert/strict';

import {
  barPercent,
  buildWeek,
  chartScale,
  dayCallout,
  dayShortLabel,
  inCalorieRange,
  macroHistory,
  macroSummaries,
  summarise,
  targetOn,
  weekDays,
  weekGapLine,
  weekKicker,
  weekRangeLabel,
} from '../week.ts';

const TODAY = '2026-09-22'; // a Tuesday
const TARGET = { kcal: 2500, protein: 190, carb: 250, fat: 80 };
const HISTORY = [{ from: '2026-01-01', targets: TARGET }];

const day = (iso, kcal, protein = 150, carb = 250, fat = 80) => ({
  iso,
  kcal,
  protein,
  carb,
  fat,
  logged: true,
});

/** Six logged days plus today, which is deliberately light because it is only half over. */
const totalsMap = (rows) => new Map(rows.map((r) => [r.iso, r]));

const FULL = [
  day('2026-09-16', 2460, 184),
  day('2026-09-17', 2610, 171),
  day('2026-09-18', 2090, 142),
  day('2026-09-19', 2530, 192),
  day('2026-09-20', 2380, 158),
  day('2026-09-21', 1850, 128),
  day('2026-09-22', 400, 30), // today, four hours old
];

const buildFull = () => buildWeek(weekDays(TODAY, 0), totalsMap(FULL), HISTORY, TODAY);

/* ── the window ───────────────────────────────────────────────────────────── */

test('the week is a rolling seven days ending today, not a calendar week', () => {
  assert.deepEqual(weekDays(TODAY, 0), [
    '2026-09-16',
    '2026-09-17',
    '2026-09-18',
    '2026-09-19',
    '2026-09-20',
    '2026-09-21',
    '2026-09-22',
  ]);
});

test('stepping back moves the whole window seven days', () => {
  assert.equal(weekDays(TODAY, 1)[6], '2026-09-15');
  assert.equal(weekDays(TODAY, 1)[0], '2026-09-09');
});

test('the kicker names the week the way a person would', () => {
  assert.equal(weekKicker(0), 'This week');
  assert.equal(weekKicker(1), 'Last week');
  assert.equal(weekKicker(3), '3 weeks ago');
});

test('the range collapses a repeated month and keeps both when it straddles one', () => {
  assert.equal(weekRangeLabel(weekDays(TODAY, 0)), 'Sep 16 – 22');
  assert.equal(weekRangeLabel(weekDays('2026-09-05', 0)), 'Aug 30 – Sep 5');
});

test('the live column is labelled Today, the rest by weekday', () => {
  assert.equal(dayShortLabel(TODAY, TODAY), 'Today');
  assert.equal(dayShortLabel('2026-09-21', TODAY), 'Mon');
});

/* ── what counts ──────────────────────────────────────────────────────────── */

test('⚠ TODAY IS EXCLUDED FROM THE AVERAGE — it is unfinished, not light', () => {
  const s = summarise(buildFull());
  assert.equal(s.counted, 6);
  /* The six finished days average 2320. Including today's 400 would read 2046 and tell an athlete
     mid-morning that they are badly under-eating. */
  assert.equal(s.average.kcal, 2320);
});

test('⚠ AN UNLOGGED DAY IS NOT A ZERO — it is counted separately and never averaged', () => {
  const missing = FULL.filter((d) => d.iso !== '2026-09-18');
  const s = summarise(buildWeek(weekDays(TODAY, 0), totalsMap(missing), HISTORY, TODAY));
  assert.equal(s.counted, 5);
  assert.equal(s.missed, 1);
  /* 2460+2610+2530+2380+1850 = 11830 over 5 days. A zero in the mix would have read 1971. */
  assert.equal(s.average.kcal, 2366);
});

test('an old week counts all seven days, because none of them is still being eaten', () => {
  const last = weekDays(TODAY, 1).map((iso) => day(iso, 2500));
  const s = summarise(buildWeek(weekDays(TODAY, 1), totalsMap(last), HISTORY, TODAY));
  assert.equal(s.counted, 7);
  assert.equal(s.missed, 0);
});

/* ── the band ─────────────────────────────────────────────────────────────── */

test('within 4% either way is in range, and the edges round to fifties', () => {
  assert.equal(inCalorieRange(2500, TARGET), true);
  assert.equal(inCalorieRange(2400, TARGET), true);
  assert.equal(inCalorieRange(2600, TARGET), true);
  assert.equal(inCalorieRange(2300, TARGET), false);
  const s = summarise(buildFull());
  assert.deepEqual({ lo: s.band.lo, hi: s.band.hi }, { lo: 2400, hi: 2600 });
  assert.equal(s.band.label, undefined); // the screen formats it; the domain only supplies numbers
});

test('days in range counts only finished, logged days', () => {
  /* 2460 and 2530 are inside 2400–2600; 2610 is 10 over the top. */
  assert.equal(summarise(buildFull()).inRange, 2);
});

test('with no target there is no band, and nothing is "in range"', () => {
  const s = summarise(buildWeek(weekDays(TODAY, 0), totalsMap(FULL), [], TODAY));
  assert.equal(s.band, null);
  assert.equal(s.inRange, 0);
  /* The average still works — it never needed a target. */
  assert.equal(s.average.kcal, 2320);
});

test('⚠ the target is read PER DAY, so a week that straddles a change is judged honestly', () => {
  const history = [
    { from: '2026-01-01', targets: { ...TARGET, kcal: 2000 } },
    { from: '2026-09-20', targets: TARGET },
  ];
  const week = buildWeek(weekDays(TODAY, 0), totalsMap(FULL), history, TODAY);
  assert.equal(week[0].target.kcal, 2000); // Sep 16, under the old target
  assert.equal(week[4].target.kcal, 2500); // Sep 20, the day it changed
  const s = summarise(week);
  assert.equal(s.targetMoved, true);
  /* The band is drawn from the latest target in the window. */
  assert.equal(s.band.target.kcal, 2500);
});

test('targetOn picks the newest row at or before the day, whatever order it arrives in', () => {
  const rows = [
    { from: '2026-09-20', targets: { ...TARGET, kcal: 2500 } },
    { from: '2026-01-01', targets: { ...TARGET, kcal: 2000 } },
  ];
  assert.equal(targetOn(rows, '2026-09-19').kcal, 2000);
  assert.equal(targetOn(rows, '2026-09-20').kcal, 2500);
  assert.equal(targetOn(rows, '2025-12-31'), null);
});

/* ── the chart ────────────────────────────────────────────────────────────── */

test('the chart leaves headroom above the target so a big day does not flatten the rest', () => {
  assert.equal(chartScale(buildFull(), summarise(buildFull()).band), 3250);
});

test('with no target it scales to the week’s own biggest day, so the bars still have shape', () => {
  const week = buildWeek(weekDays(TODAY, 0), totalsMap(FULL), [], TODAY);
  assert.equal(chartScale(week, null), 2610 * 1.15);
});

test('a bar never exceeds the plot, however big the day', () => {
  assert.equal(barPercent(9999, 2500), 100);
  assert.equal(barPercent(1250, 2500), 50);
  assert.equal(barPercent(0, 0), 0);
});

/* ── the callout ──────────────────────────────────────────────────────────── */

test('today reads as what is LEFT, because it is still being eaten', () => {
  const week = buildFull();
  const c = dayCallout(week[6], TODAY);
  assert.equal(c.detail, '2,100 left · in progress');
  assert.equal(c.good, false);
});

test('a day in range says so, and says by how much', () => {
  const c = dayCallout(buildFull()[0], TODAY);
  assert.equal(c.title, 'Wed, Sep 16 · 2,460 cal');
  assert.equal(c.detail, 'In range · 40 under');
  assert.equal(c.good, true);
});

test('a day outside it states the gap plainly, never as a minus', () => {
  const c = dayCallout(buildFull()[5], TODAY);
  assert.equal(c.detail, '650 under');
  assert.equal(c.good, false);
});

test('an unlogged day says so instead of claiming a number', () => {
  const week = buildWeek(weekDays(TODAY, 0), totalsMap([]), HISTORY, TODAY);
  assert.equal(dayCallout(week[0], TODAY).detail, 'Not logged');
});

/* ── macros ───────────────────────────────────────────────────────────────── */

test('a macro row counts the days it fell short, at a 10% tolerance', () => {
  const week = buildFull();
  const [protein] = macroSummaries(week, summarise(week).average);
  /* 184 · 171 · 142 · 192 · 158 · 128 against 190 ± 19, so the floor is 171 — under on 142, 158 and 128.
     171 sits EXACTLY on the line and counts as on target, which is what a tolerance is for. */
  assert.equal(protein.under, 3);
  assert.equal(protein.note, 'Under on 3 of 6 days');
  assert.equal(protein.clean, false);
});

test('a macro that landed every day says so, and is tinted for it', () => {
  const week = buildWeek(
    weekDays(TODAY, 0),
    totalsMap(FULL.map((d) => ({ ...d, fat: 80 }))),
    HISTORY,
    TODAY,
  );
  const fat = macroSummaries(week, summarise(week).average).find((m) => m.key === 'fat');
  assert.equal(fat.note, 'On target all 6 days');
  assert.equal(fat.clean, true);
});

test('with no target a macro states its average and does not invent a verdict', () => {
  const week = buildWeek(weekDays(TODAY, 0), totalsMap(FULL), [], TODAY);
  const [protein] = macroSummaries(week, summarise(week).average);
  assert.equal(protein.target, null);
  assert.equal(protein.note, 'No target set');
  assert.equal(protein.clean, false);
});

/* ── the closing line ─────────────────────────────────────────────────────── */

test('it names the macro that is short on at least half the days', () => {
  const week = buildFull();
  const s = summarise(week);
  const line = weekGapLine(macroSummaries(week, s.average), s);
  assert.match(line, /^Protein is the gap this week: \d+ g a day under target on average\.$/);
});

test('⚠ one light day is noise, not a pattern, and is not scolded', () => {
  const nearly = FULL.map((d) => ({ ...d, protein: 190 }));
  nearly[0] = { ...nearly[0], protein: 100 };
  const week = buildWeek(weekDays(TODAY, 0), totalsMap(nearly), HISTORY, TODAY);
  const s = summarise(week);
  assert.equal(weekGapLine(macroSummaries(week, s.average), s), '');
});

test('unlogged days are named, singular and plural', () => {
  const one = FULL.filter((d) => d.iso !== '2026-09-18');
  const w1 = buildWeek(weekDays(TODAY, 0), totalsMap(one), HISTORY, TODAY);
  assert.match(weekGapLine(macroSummaries(w1, summarise(w1).average), summarise(w1)), /1 unlogged day\./);

  const two = one.filter((d) => d.iso !== '2026-09-19');
  const w2 = buildWeek(weekDays(TODAY, 0), totalsMap(two), HISTORY, TODAY);
  assert.match(weekGapLine(macroSummaries(w2, summarise(w2).average), summarise(w2)), /2 unlogged days\./);
});

/* ── the history sheet ────────────────────────────────────────────────────── */

test('the history lists all seven days, today included but never marked on target', () => {
  const week = buildFull();
  const s = summarise(week);
  const [protein] = macroSummaries(week, s.average);
  const h = macroHistory(week, protein, TODAY);
  assert.equal(h.rows.length, 7);
  assert.equal(h.title, 'Protein');
  assert.equal(h.rows[6].day, 'Today');
  assert.equal(h.rows[6].onTarget, false);
  assert.equal(h.rows[0].value, '184 g');
  /* 190 against a 266 scale. */
  assert.equal(Math.round(h.targetPercent), 71);
});

test('an unlogged day shows a dash rather than a zero', () => {
  const week = buildWeek(weekDays(TODAY, 0), totalsMap([]), HISTORY, TODAY);
  const [protein] = macroSummaries(week, summarise(week).average);
  const h = macroHistory(week, protein, TODAY);
  assert.equal(h.rows[0].value, '—');
  assert.equal(h.rows[0].percent, 0);
});
