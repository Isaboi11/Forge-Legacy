import test from 'node:test';
import assert from 'node:assert/strict';

import { parseProgramTable } from '../import-parse.ts';

/*
 * ══ GENERATED PROGRAMS — the same plan, written five hundred ways ══
 *
 * PO, 2026-09-22: *"are you able to create a bunch of different variants to test and see? That way we
 * can make sure all the gaps we are finding works?"*
 *
 * Every real program the PO sent is one point in a space of choices: how the day is labelled, how the
 * scheme is written, whether it is a table or typed out, what noise surrounds it. This builds the plan
 * FIRST and then writes it out in each combination, so the correct reading is known rather than argued
 * — a mismatch here is a gap, not a difference of opinion. The real photographed programs are held
 * separately, byte for byte, in `photo-programs.test.mjs`; these cover the space between them.
 *
 * It earned its place on the first run: a day called "Day 1" was mistaken for the Day COLUMN's own
 * header word, which silently switched multi-week detection off for every program whose days are
 * numbered — a bug none of the eighteen photographs happened to expose.
 */

const LIFTS = [
  ['Bench Press', 4, 8], ['Barbell Row', 4, 8], ['Overhead Press', 3, 10], ['Lat Pulldown', 3, 12],
  ['Back Squat', 5, 5], ['Romanian Deadlift', 3, 8], ['Leg Press', 3, 12], ['Leg Curl', 3, 10],
  ['Dumbbell Curl', 3, 12], ['Triceps Pushdown', 3, 15], ['Lateral Raise', 3, 15], ['Face Pull', 3, 15],
];

const dayNames = {
  numbered: (i) => `Day ${i + 1}`,
  weekday: (i) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
  abbrev: (i) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
  named: (i) => ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'][i],
  numberedNamed: (i) => `Day ${i + 1} - ${['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body'][i]}`,
  weekdayNamed: (i) => `${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]}- Upper Body ${'AB'[i % 2]}`,
  dayWord: (i) => `${['Push', 'Pull', 'Leg', 'Upper', 'Lower', 'Core'][i]} Day`,
};

/** How the sets×reps get written, and what they mean. */
const schemes = {
  compact: (s, r) => [`${s}x${r}`, s, r],
  spaced: (s, r) => [`${s} x ${r}`, s, r],
  times: (s, r) => [`${s}×${r}`, s, r],
  range: (s, r) => [`${s}x${r}-${r + 4}`, s, r],
  rangeSpaced: (s, r) => [`${s} x ${r}-${r + 4}`, s, r],
  padded: (s, r) => [`${s}× ${String(r).padStart(2, '0')}-${r + 4}`, s, r],
  words: (s, r) => [`${s} sets of ${r} reps`, s, r],
  wordsShort: (s, r) => [`${s} sets x ${r}`, s, r],
  parens: (s, r) => [`${s} sets (${r}-${r + 4} reps)`, s, r],
  perSide: (s, r) => [`${s}x${r} each side`, s, r],
  seconds: (s, r) => [`${s}x${r}s`, s, r],
};

const FLUFF_TOP = ['THE ULTIMATE PROGRAM', 'By Coach Sam', '© 2026 All rights reserved.', 'Follow @coachsam for more!'];
const FLUFF_BOTTOM = ['SAVE THIS FOR LATER 📌', '#gym #gains #fitness', 'Rest 60-90 seconds between sets.', 'DM me for coaching!'];

/**
 * What a TYPED-OUT heading is called once its scaffolding is trimmed — the parser's own `cleanDayName`
 * rule, which is why "Day 1 - Push" is a day called Push. A table keeps its Day cell verbatim instead.
 */
const typedDayName = (label) =>
  label.replace(/^(?:(?:mon|tues?|wednes|thurs?|fri|satur|sun)day|(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\.?|day|session|workout)\s*\d*\s*[-–—:]\s*/i, '').trim() || label;

/** days × exercises-per-day, as [name, sets, reps]. */
function plan(days, per, offset = 0) {
  return Array.from({ length: days }, (_, d) =>
    Array.from({ length: per }, (_, e) => LIFTS[(d * per + e + offset) % LIFTS.length]),
  );
}

export function variants() {
  const out = [];
  const add = (id, text, expect) => out.push({ id, text, expect });

  const days = 3, per = 4;
  const P = plan(days, per);

  // ── 1. tables: every day-name style × every scheme style ─────────────────
  for (const [dn, dayName] of Object.entries(dayNames)) {
    for (const [sn, scheme] of Object.entries(schemes)) {
      const rows = [['Day', 'Exercise', 'Sets x Reps']];
      P.forEach((day, d) => day.forEach(([n, s, r]) => rows.push([dayName(d), n, scheme(s, r)[0]])));
      add(`table/${dn}/${sn}`, rows.map((r) => r.join('\t')).join('\n'), {
        days: P.map((_, d) => dayName(d)),
        items: P.map((day) => day.map(([n, s, r]) => [n, ...scheme(s, r).slice(1)])),
      });
    }
  }

  // ── 2. separate Sets and Reps columns, including the empty-column cases ──
  for (const shape of ['both', 'setsOnly', 'schemeInReps', 'schemeInSets']) {
    const rows = [['Day', 'Exercise', 'Sets', 'Reps']];
    P.forEach((day, d) =>
      day.forEach(([n, s, r]) => {
        if (shape === 'both') rows.push([`Day ${d + 1}`, n, String(s), `${r}-${r + 4}`]);
        if (shape === 'setsOnly') rows.push([`Day ${d + 1}`, n, String(s), '']);
        if (shape === 'schemeInReps') rows.push([`Day ${d + 1}`, n, '', `${s}x${r}`]);
        if (shape === 'schemeInSets') rows.push([`Day ${d + 1}`, n, `${s} X ${r}`, '']);
      }),
    );
    add(`columns/${shape}`, rows.map((r) => r.join('\t')).join('\n'), {
      days: P.map((_, d) => `Day ${d + 1}`),
      items: P.map((day) => day.map(([n, s, r]) => [n, s, shape === 'setsOnly' ? null : r])),
    });
  }

  // ── 3. typed out, with every heading and bullet style ────────────────────
  for (const [dn, dayName] of Object.entries(dayNames)) {
    for (const bullet of ['', '- ', '• ', '▪️ ', '1. ']) {
      for (const [sn, scheme] of Object.entries(schemes)) {
        const lines = [];
        P.forEach((day, d) => {
          lines.push(dayName(d));
          day.forEach(([n, s, r], i) => lines.push(`${bullet.replace('1.', `${i + 1}.`)}${n} ${scheme(s, r)[0]}`));
        });
        add(`typed/${dn}/${bullet.trim() || 'plain'}/${sn}`, lines.join('\n'), {
          days: P.map((_, d) => typedDayName(dayName(d))),
          items: P.map((day) => day.map(([n, s, r]) => [n, ...scheme(s, r).slice(1)])),
        });
      }
    }
  }

  // ── 4. typed out with the scheme BEFORE the name, and with a dash ────────
  for (const sep of ['before', 'dash', 'colon', 'endash']) {
    const lines = [];
    P.forEach((day, d) => {
      lines.push(`Day ${d + 1}`);
      day.forEach(([n, s, r]) => {
        if (sep === 'before') lines.push(`${s}x ${r}-${r + 4} ${n}`);
        if (sep === 'dash') lines.push(`${n} - ${s}x${r}`);
        if (sep === 'colon') lines.push(`${n}: ${s}x${r}`);
        if (sep === 'endash') lines.push(`${n} – ${s} x ${r}`);
      });
    });
    add(`order/${sep}`, lines.join('\n'), {
      days: P.map((_, d) => `Day ${d + 1}`),
      items: P.map((day) => day.map(([n, s, r]) => [n, s, r])),
    });
  }

  // ── 5. fluff above and below, in both layouts ────────────────────────────
  for (const layout of ['table', 'typed']) {
    const lines = [...FLUFF_TOP];
    if (layout === 'table') {
      lines.push(['Day', 'Exercise', 'Sets', 'Reps'].join('\t'));
      P.forEach((day, d) => day.forEach(([n, s, r]) => lines.push([`Day ${d + 1}`, n, String(s), String(r)].join('\t'))));
    } else {
      P.forEach((day, d) => {
        lines.push(`Day ${d + 1}`);
        day.forEach(([n, s, r]) => lines.push(`${n} ${s}x${r}`));
      });
    }
    lines.push(...FLUFF_BOTTOM);
    add(`fluff/${layout}`, lines.join('\n'), {
      days: P.map((_, d) => `Day ${d + 1}`),
      items: P.map((day) => day.map(([n, s, r]) => [n, s, r])),
    });
  }

  // ── 6. rest days written every way ───────────────────────────────────────
  for (const rest of ['Rest', 'REST', 'Rest Day', 'Off', 'Rest Days', 'Full Rest Day']) {
    const lines = [];
    ['Monday', 'Tuesday', 'Wednesday'].forEach((d, i) => {
      lines.push(d);
      if (i === 1) lines.push(rest);
      else P[i].forEach(([n, s, r]) => lines.push(`${n} ${s}x${r}`));
    });
    add(`rest/typed/${rest}`, lines.join('\n'), {
      days: ['Monday', 'Wednesday'],
      items: [P[0].map(([n, s, r]) => [n, s, r]), P[2].map(([n, s, r]) => [n, s, r])],
    });

    const rows = [['Day', 'Exercise', 'Sets', 'Reps']];
    ['Monday', 'Tuesday', 'Wednesday'].forEach((d, i) => {
      if (i === 1) rows.push([d, rest, '', '']);
      else P[i].forEach(([n, s, r]) => rows.push([d, n, String(s), String(r)]));
    });
    add(`rest/table/${rest}`, rows.map((r) => r.join('\t')).join('\n'), {
      days: ['Monday', 'Wednesday'],
      items: [P[0].map(([n, s, r]) => [n, s, r]), P[2].map(([n, s, r]) => [n, s, r])],
    });
  }

  // ── 7. several weeks, written every way ──────────────────────────────────
  for (const style of ['weekHeading', 'wkHeading', 'weekColumn', 'repeatedBlocks']) {
    const lines = [];
    const rows = [['Week', 'Day', 'Exercise', 'Sets', 'Reps']];
    for (let w = 1; w <= 3; w++) {
      if (style === 'weekHeading') lines.push(`Week ${w}`);
      if (style === 'wkHeading') lines.push(`Wk${w}`);
      P.forEach((day, d) => {
        if (style === 'weekColumn') day.forEach(([n, s, r]) => rows.push([String(w), `Day ${d + 1}`, n, String(s), String(r + w)]));
        else if (style === 'repeatedBlocks') day.forEach(([n, s, r]) => rows.push([`Day ${d + 1}`, n, String(s), String(r + w)]));
        else {
          lines.push(`Day ${d + 1}`);
          day.forEach(([n, s, r]) => lines.push(`${n} ${s}x${r + w}`));
        }
      });
    }
    const text = style === 'weekColumn'
      ? rows.map((r) => r.join('\t')).join('\n')
      : style === 'repeatedBlocks'
        ? rows.slice(1).map((r) => r.slice(0).join('\t')).join('\n').replace(/^/, ['Day', 'Exercise', 'Sets', 'Reps'].join('\t') + '\n')
        : lines.join('\n');
    add(`weeks/${style}`, text, {
      weeks: 3,
      days: P.map((_, d) => `Day ${d + 1}`),
      items: P.map((day) => day.map(([n, s, r]) => [n, s, r + 1])), // week 1
    });
  }

  // ── 8. sections inside a day ─────────────────────────────────────────────
  for (const section of ['Abs', 'Core', 'Warm-up', 'Cool-down', 'Accessories']) {
    const rows = [['Day', 'Exercise', 'Sets', 'Reps']];
    P.forEach((day, d) => {
      day.slice(0, 2).forEach(([n, s, r]) => rows.push([`Day ${d + 1}`, n, String(s), String(r)]));
      rows.push([`Day ${d + 1}`, section, '', '']);
      day.slice(2).forEach(([n, s, r]) => rows.push([`Day ${d + 1}`, n, String(s), String(r)]));
    });
    add(`section/${section}`, rows.map((r) => r.join('\t')).join('\n'), {
      days: P.map((_, d) => `Day ${d + 1}`),
      items: P.map((day) => day.map(([n, s, r]) => [n, s, r])),
    });
  }

  return out;
}

/** A second wave: cardio, delimiters, noise, and the shapes that mix them. */
export function variants2() {
  const out = [];
  const add = (id, text, expect) => out.push({ id, text, expect });
  const P = plan(3, 3);

  // ── 9. other delimiters and line endings ────────────────────────────────
  for (const kind of ['csv', 'semicolon', 'markdown', 'crlf', 'trailingSpaces', 'blankLines', 'nbsp']) {
    const rows = [['Day', 'Exercise', 'Sets', 'Reps'], ...P.flatMap((day, d) => day.map(([n, s, r]) => [`Day ${d + 1}`, n, String(s), String(r)]))];
    let text;
    if (kind === 'csv') text = rows.map((r) => r.join(',')).join('\n');
    else if (kind === 'semicolon') text = rows.map((r) => r.join(';')).join('\n');
    else if (kind === 'markdown') text = rows.map((r) => `| ${r.join(' | ')} |`).join('\n').replace('\n', '\n|---|---|---|---|\n');
    else if (kind === 'crlf') text = rows.map((r) => r.join('\t')).join('\r\n');
    else if (kind === 'trailingSpaces') text = rows.map((r) => r.join('\t') + '   ').join('\n');
    else if (kind === 'blankLines') text = rows.map((r) => r.join('\t')).join('\n\n');
    else text = rows.map((r) => r.join('\t')).join('\n').replace(/ /g, '\u00a0');
    add(`delimiter/${kind}`, text, {
      days: P.map((_, d) => `Day ${d + 1}`),
      items: P.map((day) => day.map(([n, s, r]) => [n, s, r])),
    });
  }

  // ── 10. cardio, written the way plans write it ──────────────────────────
  const CARDIO = [
    ['Run 3 miles', 'run', 3, null], ['20 min bike', 'bike', null, 1200], ['5k run', 'run', 3.107, null],
    ['Easy run 4 mi', 'run', 4, null], ['Row 2000m', 'row', 1.243, null], ['45 min walk', 'walk', null, 2700],
  ];
  for (const [phrase, activity, mi, sec] of CARDIO) {
    for (const layout of ['typed', 'table']) {
      const text = layout === 'typed'
        ? `Monday\n${phrase}\nBench Press 4x8`
        : [['Day', 'Workout'].join('\t'), ['Monday', phrase].join('\t'), ['Tuesday', 'Bench Press 4x8'].join('\t')].join('\n');
      add(`cardio/${layout}/${phrase}`, text, { cardio: { activity, mi, sec } });
    }
  }

  // ── 11. several lifts on one line, and a day label carrying its work ────
  for (const sep of [', ', '; ', ' + ', ' / ']) {
    const line = P[0].map(([n, s, r]) => `${n} ${s}x${r}`).join(sep);
    add(`oneline/${sep.trim() || 'plus'}`, `Day 1: ${line}\nDay 2: ${P[1].map(([n, s, r]) => `${n} ${s}x${r}`).join(sep)}`, {
      days: ['Day 1', 'Day 2'],
      items: [P[0].map(([n, s, r]) => [n, s, r]), P[1].map(([n, s, r]) => [n, s, r])],
    });
  }

  // ── 12. page furniture and repeated headers, as a PDF gives them ────────
  for (const noise of ['pageNumbers', 'repeatedHeader', 'runningHeader']) {
    const lines = [];
    P.forEach((day, d) => {
      if (noise === 'repeatedHeader') lines.push(['Day', 'Exercise', 'Sets', 'Reps'].join('\t'));
      if (noise === 'runningHeader') lines.push('THE ULTIMATE PROGRAM GUIDE');
      day.forEach(([n, s, r]) => lines.push([`Day ${d + 1}`, n, String(s), String(r)].join('\t')));
      if (noise === 'pageNumbers') lines.push(`Page ${d + 1}`);
    });
    if (noise !== 'repeatedHeader') lines.unshift(['Day', 'Exercise', 'Sets', 'Reps'].join('\t'));
    add(`noise/${noise}`, lines.join('\n'), {
      days: P.map((_, d) => `Day ${d + 1}`),
      items: P.map((day) => day.map(([n, s, r]) => [n, s, r])),
    });
  }

  // ── 13. per-side, seconds, AMRAP, and a load on the line ────────────────
  for (const [suffix, sets, reps] of [['each side', 3, 10], ['/side', 3, 10], ['per leg', 3, 10], ['s', 3, 10], [' @ 225 lb', 3, 10], [' @RPE8', 3, 10]]) {
    add(`qualifier/${suffix.trim()}`, `Day 1\nBench Press 3x10${suffix.startsWith(' ') ? suffix : ` ${suffix}`}`, {
      days: ['Day 1'],
      items: [[['Bench Press', sets, reps]]],
    });
  }
  add('qualifier/amrap', 'Day 1\nPull-Ups 3x AMRAP', { days: ['Day 1'], items: [[['Pull-Ups', 3, null]]] });

  return out;
}

const check = (id, text, expect) => {
  const r = parseProgramTable(text);
  assert.equal(r.ok, true, id + ' was refused: ' + (r.ok ? '' : r.error));
  if (expect.cardio) {
    const it = r.weeks[0].days[0].items[0];
    assert.equal(it.kind, 'cardio', id + ': "' + it.name + '" should be a bout');
    assert.equal(it.activity, expect.cardio.activity, id + ' activity');
    if (expect.cardio.mi != null) assert.ok(Math.abs((it.targetMi ?? 0) - expect.cardio.mi) < 0.01, id + ' miles ' + it.targetMi);
    if (expect.cardio.sec != null) assert.equal(it.targetSec, expect.cardio.sec, id + ' seconds');
    return;
  }
  assert.equal(r.weeks.length, expect.weeks ?? 1, id + ' weeks');
  const w = r.weeks[0];
  assert.deepEqual(w.days.map((d) => d.name), expect.days, id + ' days');
  w.days.forEach((d, i) => {
    const want = expect.items[i];
    assert.equal(d.items.length, want.length, id + ' day ' + (i + 1) + ' — got ' + d.items.map((x) => x.name).join(', '));
    d.items.forEach((it, j) => {
      const [n, s, rp] = want[j];
      assert.equal(it.name, n, id + ' day' + (i + 1) + '.' + (j + 1) + ' name');
      if (s != null) assert.equal(it.sets, s, id + ' "' + n + '" sets');
      if (rp != null) assert.equal(it.reps, rp, id + ' "' + n + '" reps');
    });
  });
};

test('every generated layout reads as the plan it was built from', () => {
  const all = [...variants(), ...variants2()];
  assert.ok(all.length > 500, 'expected the whole space, got ' + all.length);
  for (const { id, text, expect } of all) check(id, text, expect);
});
