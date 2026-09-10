/**
 * The rank replay — the dates on the Rank Journey's rung sheets.
 *
 * The one property that matters most is the first test: the replay's LAST step must be the live rank.
 * If `rawAsOf(today)` ever drifts from how `buildRankSignals` counts, an athlete would be told they earned
 * a rung on a day the engine that actually promotes them never agreed with.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rawAsOf, replayRungs, rungIndex, clinchingSession, RUNG_COUNT } from '../history.ts';
import { assembleSignals } from '../signals.ts';
import { resolveRank } from '../rank.ts';
import { rungStandards } from '../standards.ts';
import { FAMILIES } from '../thresholds.ts';

const DAY = 86_400_000;
const iso = (t) => new Date(t).toISOString();

/** An athlete training `perWeek` days a week (Mon, Wed, Fri, …) for `weeks` weeks from `start`. */
function athlete({ start = '2025-01-06', weeks, perWeek = 3, minutes = 45 }) {
  const t0 = Date.parse(`${start}T12:00:00Z`);
  const sessions = [];
  for (let w = 0; w < weeks; w++) {
    for (let k = 0; k < perWeek; k++) {
      const t = t0 + (w * 7 + k * 2) * DAY;
      sessions.push({ id: `w${w}-${k}`, date: iso(t), durationSec: minutes * 60, state: 'saved', activityType: 'strength', distance: null });
    }
  }
  return {
    athleteType: 'strength',
    sessions,
    loadPRDates: [],
    graduations: [],
    sealedChapterDates: [],
    resolvedGoals: [],
  };
}

test('at today, the cut inputs ARE the live inputs — the replay ends on the rank the engine gives now', () => {
  const d = athlete({ weeks: 30 });
  d.loadPRDates = ['2025-02-10', '2025-04-01'];
  d.graduations = [{ date: '2025-05-01', planKey: 'p1' }, { date: '2025-06-01', planKey: 'p1' }];
  d.sealedChapterDates = ['2025-03-01'];
  d.resolvedGoals = [{ date: '2025-03-01', primaryAchieved: true }, { date: '2025-03-01', primaryAchieved: false }];
  const today = '2025-09-01';

  const raw = rawAsOf(d, today);
  // Exactly what buildRankSignals hands the engine: every row, counted.
  assert.equal(raw.sessions.length, d.sessions.length);
  assert.equal(raw.programGraduations, 2);
  assert.equal(raw.distinctProgramGraduations, 1, 'a re-run of one plan is one distinct plan');
  assert.equal(raw.sealedChapters, 1);
  assert.equal(raw.goalEvents, 2);
  assert.equal(raw.primaryGoalsAchieved, 1);

  const live = resolveRank(assembleSignals(raw));
  const replay = replayRungs(d, today);
  const top = Math.max(...replay.keys());
  assert.equal(top, rungIndex(live.family, live.subTier), 'the replay must end where the live engine stands');
});

test('nothing dated after the cut is counted', () => {
  const d = athlete({ weeks: 4 });
  d.loadPRDates = ['2025-01-07', '2025-12-01'];
  d.sealedChapterDates = ['2026-01-01'];
  const raw = rawAsOf(d, '2025-01-12');
  assert.equal(raw.sessions.length, 3, 'only week one');
  assert.deepEqual(raw.loadPRDates, ['2025-01-07']);
  assert.equal(raw.sealedChapters, 0);
  assert.equal(raw.today, '2025-01-12');
});

test('Foundation I is dated to the first session, and every rung is dated no earlier than the one below it', () => {
  const d = athlete({ weeks: 40 });
  const replay = replayRungs(d, '2025-12-31');
  assert.equal(replay.get(0)?.date, '2025-01-06');
  let prev = '';
  for (let i = 0; i < RUNG_COUNT; i++) {
    const r = replay.get(i);
    if (!r) break;
    assert.ok(r.date >= prev, `rung ${i} (${r.date}) dated before rung ${i - 1} (${prev})`);
    prev = r.date;
  }
  // Contiguous from the bottom: rank never skips a rung without dating it.
  const keys = [...replay.keys()].sort((a, b) => a - b);
  assert.deepEqual(keys, keys.map((_, i) => i));
});

test('Foundation II lands the week the second active week does — the snapshot says so', () => {
  const d = athlete({ weeks: 6 });
  const replay = replayRungs(d, '2025-03-01');
  const f2 = replay.get(rungIndex('foundation', 2));
  assert.ok(f2, 'two active weeks earns Foundation II');
  assert.equal(f2.signals.nativeActiveWeeks, 2, 'the snapshot is the day it was earned, not today');
  assert.equal(f2.date, '2025-01-13', 'the Monday of week two, its first session');
});

test('⚠ the candidate-day replay gives EXACTLY the dates the every-day walk gives', () => {
  /*
   * `candidateDays` skips every day on which no signal can change. That is a claim about the engine, so
   * it is checked against the brute force it replaced — over a history with gaps (so the recent window
   * and the time gates are what move), PRs on non-session days, a graduation and a chapter seal.
   */
  const d = athlete({ weeks: 26, perWeek: 4 });
  // A long stop, then a return — the recent-engagement window empties and refills.
  const back = athlete({ start: '2025-11-03', weeks: 30, perWeek: 3 });
  d.sessions.push(...back.sessions);
  // A 5-minute session is not meaningful — it must not move the journey start the time gates hang on.
  d.sessions.push({ id: 'short', date: '2024-12-20T09:00:00Z', durationSec: 300, state: 'saved', activityType: 'strength', distance: null });
  d.loadPRDates = ['2025-02-04', '2025-03-19', '2025-05-02', '2025-12-10', '2026-02-11', '2026-03-30'];
  d.graduations = [{ date: '2025-04-15', planKey: 'p1' }, { date: '2026-03-01', planKey: 'p2' }];
  d.sealedChapterDates = ['2025-06-30'];
  d.resolvedGoals = [{ date: '2025-06-30', primaryAchieved: true }];
  const today = '2026-08-01';

  const brute = new Map();
  let best = -1;
  for (let t = Date.parse('2024-12-20T00:00:00Z'); t <= Date.parse(`${today}T00:00:00Z`); t += DAY) {
    const dayISO = new Date(t).toISOString().slice(0, 10);
    const signals = assembleSignals(rawAsOf(d, dayISO));
    const r = resolveRank(signals);
    const idx = rungIndex(r.family, r.subTier);
    if (idx > best) {
      for (let i = best + 1; i <= idx; i++) brute.set(i, dayISO);
      best = idx;
    }
  }
  const fast = replayRungs(d, today);
  assert.ok(brute.size > 4, `fixture too small to prove anything (${brute.size} rungs)`);
  assert.deepEqual(new Map([...fast].map(([k, v]) => [k, v.date])), brute);
});

test('every dated rung falls inside the replayed range', () => {
  const d = athlete({ weeks: 8 });
  const replay = replayRungs(d, '2025-06-01');
  for (const { date } of replay.values()) {
    assert.ok(date >= '2025-01-06' && date <= '2025-06-01', `rung dated outside the replayed range: ${date}`);
  }
});

test('every rung the replay dates, its standards were met on that day (the sheet cannot show a red row on an earned rung)', () => {
  const d = athlete({ weeks: 40, perWeek: 4 });
  d.loadPRDates = ['2025-02-04', '2025-03-19', '2025-06-02'];
  const replay = replayRungs(d, '2025-12-31');
  for (const [idx, { signals }] of replay) {
    const family = FAMILIES[Math.floor(idx / 4)];
    const level = (idx % 4) + 1;
    const rows = rungStandards(family, level, signals);
    if (rows === 'start' || rows === 'none') continue;
    for (const r of rows) assert.ok(r.met, `${family} ${level}: "${r.label}" shown unmet on the day it was earned (${r.have}/${r.need})`);
  }
});

test('rung standards route correctly — the start, a family entry, a sub-tier, and Legacy past I', () => {
  assert.equal(rungStandards('foundation', 1, null), 'start');
  assert.ok(Array.isArray(rungStandards('builder', 1, null)) && rungStandards('builder', 1, null).some((r) => r.key === 'activeWeeks'));
  const b3 = rungStandards('builder', 3, null);
  assert.equal(b3.length, 1);
  assert.equal(b3[0].need, 6, 'Builder III asks for six weeks within Builder');
  assert.equal(rungStandards('legacy', 2, null), 'none', 'the engine has no Legacy II — nothing is invented for it');
});

test('no history → no dates (everyone starts on Foundation I, but not on a day that can be named)', () => {
  assert.equal(replayRungs(athlete({ weeks: 0 }), '2025-06-01').size, 0);
});

test('the clinching session is the last one logged ON the earned day — never an older one', () => {
  const sessions = [
    { id: 'a', date: '2025-01-06T08:00:00Z', durationSec: 3000, state: 'saved', activityType: 'strength', distance: null },
    { id: 'b', date: '2025-01-08T18:00:00Z', durationSec: 3000, state: 'saved', activityType: 'strength', distance: null },
    { id: 'c', date: '2025-01-08T07:00:00Z', durationSec: 3000, state: 'saved', activityType: 'strength', distance: null },
  ];
  assert.equal(clinchingSession(sessions, '2025-01-08')?.id, 'b');
  assert.equal(clinchingSession(sessions, '2025-01-07'), null, 'no session that day — the calendar did it');
});
