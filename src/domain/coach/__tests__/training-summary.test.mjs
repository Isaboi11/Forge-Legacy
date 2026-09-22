/**
 * training-summary.test.mjs — Holt's view of the athlete's own training, and which questions get it.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/training-summary.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { isTrainingQuestion, summarizeTraining } from '../training-summary.ts';
import { buildAskContext } from '../ask-context.ts';

const TODAY = '2026-09-22T18:00:00Z';
const daysAgo = (d) => new Date(Date.parse(TODAY) - d * 86_400_000).toISOString();
const sets = (weight, reps, n = 3) => Array.from({ length: n }, () => ({ weight, reps }));

/**
 * A realistic eight weeks: upper/lower four days a week, bench climbing, squat flat, deadlift slipping,
 * pull-ups (bodyweight) improving, plus one-off accessories that must not crowd out the main lifts.
 */
function eightWeeks() {
  const out = [];
  for (let week = 7; week >= 0; week -= 1) {
    const base = week * 7 + 1;
    const p = 7 - week; // 0 … 7, progression through the block
    out.push({
      startedAt: daysAgo(base + 3),
      lifts: [
        { id: 'barbell_bench_press', name: 'Barbell Bench Press', sets: [...sets(185 + p * 5, 5), { weight: 135, reps: 10 }] },
        { id: 'pull_up', name: 'Pull-Up', sets: sets(0, 6 + Math.floor(p / 2)) },
      ],
    });
    out.push({
      startedAt: daysAgo(base + 2),
      lifts: [
        { id: 'barbell_back_squat', name: 'Barbell Back Squat', sets: sets(275, 5) },
        { id: 'conventional_deadlift', name: 'Conventional Deadlift', sets: sets(365 - p * 5, 3) },
      ],
    });
    out.push({
      startedAt: daysAgo(base + 1),
      lifts: [
        { id: 'barbell_bench_press', name: 'Barbell Bench Press', sets: sets(155 + p * 5, 8) },
        { id: 'overhead_press', name: 'Overhead Press', sets: sets(95 + p * 2.5, 6) },
      ],
    });
    out.push({
      startedAt: daysAgo(base),
      lifts: [
        { id: 'barbell_back_squat', name: 'Barbell Back Squat', sets: sets(245, 8) },
        { id: `accessory_${week}`, name: `Accessory ${week}`, sets: sets(30, 12) },
      ],
    });
  }
  return out;
}

test('empty history → null, so nothing is attached', () => {
  assert.equal(summarizeTraining([], { units: 'imperial', today: TODAY }), null);
  // History that exists but is older than the window is still nothing to say about "lately".
  const old = [{ startedAt: daysAgo(120), lifts: [{ id: 'x', name: 'Bench', sets: sets(200, 5) }] }];
  assert.equal(summarizeTraining(old, { units: 'imperial', today: TODAY }), null);
  // A session with no logged sets says nothing either.
  const hollow = [{ startedAt: daysAgo(2), lifts: [{ id: 'x', name: 'Bench', sets: [{ weight: null, reps: null }] }] }];
  assert.match(summarizeTraining(hollow, { units: 'imperial', today: TODAY }), /^Last 8 wks: /);
});

test('one lift, one session: best set and a single estimate, no invented trend', () => {
  const s = summarizeTraining(
    [{ startedAt: daysAgo(3), lifts: [{ id: 'bench', name: 'Barbell Bench Press', sets: [{ weight: 225, reps: 5 }, { weight: 205, reps: 8 }] }] }],
    { units: 'imperial', today: TODAY },
  );
  assert.match(s, /Weights in lb\./);
  assert.match(s, /Barbell Bench Press — best 225×5, e1RM 263, 3d ago\./);
  assert.ok(!/up|down|flat/.test(s), 'one session is not a trend');
  assert.match(s, /1 session\/wk/, 'one session counted over a minimum one-week span');
});

test('eight realistic weeks: top 5 by frequency, trends with numbers, ≤ 400 characters', () => {
  const s = summarizeTraining(eightWeeks(), { units: 'imperial', today: TODAY });
  assert.ok(s.length <= 400, `${s.length} chars`);
  assert.match(s, /^Last 8 wks: 4 sessions\/wk\. Weights in lb\./);
  // Bench and squat are trained twice a week, so they lead.
  assert.ok(s.indexOf('Barbell Bench Press') < s.indexOf('Conventional Deadlift'));
  assert.match(s, /Barbell Bench Press — best 220×5, e1RM \d+→\d+ \(up \d+%\), 2d ago\./);
  assert.match(s, /Barbell Back Squat — best 275×5, e1RM 321→321 \(flat\)/);
  // No one-off accessory outranks a lift trained every week.
  assert.ok(!s.includes('Accessory'), s);
});

test('a slipping lift reads "down" and a bodyweight lift is described in reps', () => {
  const s = summarizeTraining(eightWeeks(), { units: 'imperial', today: TODAY, maxChars: 1000, maxLifts: 8 });
  assert.match(s, /Conventional Deadlift — best 365×3, e1RM \d+→\d+ \(down \d+%\)/);
  assert.match(s, /Pull-Up — best 9 reps, top set \d→9 reps \(up \d+%\)/);
});

test('kg athlete: every weight converted once, the half plate kept on a real set', () => {
  const s = summarizeTraining(
    [
      { startedAt: daysAgo(20), lifts: [{ id: 'bench', name: 'Bench Press', sets: [{ weight: 220.462, reps: 5 }] }] },
      { startedAt: daysAgo(2), lifts: [{ id: 'bench', name: 'Bench Press', sets: [{ weight: 225.975, reps: 5 }] }] },
    ],
    { units: 'metric', today: TODAY },
  );
  assert.match(s, /Weights in kg\./);
  // 225.975 lb = 102.5 kg — a 1.25 kg plate a side, kept exactly.
  assert.match(s, /Bench Press — best 102\.5×5, e1RM 117→120 \(up 3%\), 2d ago\./);
  assert.ok(!/\b(220|225)\b/.test(s), 'no pound figure leaks through');
});

test('the character ceiling drops whole lifts, never cuts one mid-line', () => {
  const s = summarizeTraining(eightWeeks(), { units: 'imperial', today: TODAY, maxChars: 160 });
  assert.ok(s.length <= 160);
  assert.ok(s.endsWith('.'), s);
});

test('a newer athlete is not averaged over a month they had not started', () => {
  const s = summarizeTraining(
    [3, 5, 8, 10].map((d) => ({ startedAt: daysAgo(d), lifts: [{ id: 'sq', name: 'Squat', sets: sets(200, 5) }] })),
    { units: 'imperial', today: TODAY },
  );
  // 4 sessions over an 11-day span → 2.5 a week, not 1.
  assert.match(s, /^Last 8 wks: 2\.5 sessions\/wk\./);
});

// ─────────────────────────────────────────────────────────────────────────────
// isTrainingQuestion
// ─────────────────────────────────────────────────────────────────────────────

test('isTrainingQuestion: questions about the athlete’s own training', () => {
  for (const q of [
    'Am I getting stronger?',
    'am i progressing on bench',
    "I'm stuck on my squat, what should I do?",
    'How much should I bench next week?',
    'how heavy should I go on deadlifts today',
    'What weight should I use for overhead press?',
    'What did I do last week?',
    'what did I lift on Monday',
    "What's my max on squat?",
    'Can you estimate my 1RM?',
    'how is my bench going',
    'How am I doing?',
    'Should I add weight to my rows?',
    'my bench has stalled for a month',
    'How consistent have I been?',
    'how often have I trained legs this month',
    'How did my last session compare?',
  ]) {
    assert.equal(isTrainingQuestion(q), true, q);
  }
});

test('isTrainingQuestion: ordinary questions pay nothing', () => {
  for (const q of [
    'hi',
    '',
    'How do I do a Romanian deadlift?',
    'Why are RDLs in my plan?',
    'What is a one rep max?',
    "What's a good warm-up for squats?",
    'Can you build me a 4 day program?',
    'Is creatine safe?',
    'How many days a week should I train?',
    'What should I do this week?',
    'What muscles does the bench press work?',
    'bench press form cues',
  ]) {
    assert.equal(isTrainingQuestion(q), false, q);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ask-context: the summary rides only on a training question; notes always
// ─────────────────────────────────────────────────────────────────────────────

const SOURCES = { catalog: [], coachingFor: () => null };
const TRAINING = 'Last 8 wks: 4 sessions/wk. Weights in lb. Barbell Bench Press — best 220×5.';

test('buildAskContext attaches training ONLY to a training question', () => {
  const yes = buildAskContext({ question: 'Am I getting stronger?', training: TRAINING }, SOURCES);
  assert.equal(yes.training, TRAINING);
  const no = buildAskContext({ question: 'Is creatine safe?', training: TRAINING }, SOURCES);
  assert.equal(no.training, undefined, 'an ordinary question pays nothing, whatever the caller passed');
});

test('buildAskContext carries the notes, trimmed and capped at 20', () => {
  const notes = Array.from({ length: 25 }, (_, i) => ` note ${i} `);
  const ctx = buildAskContext({ question: 'hi', notes: [...notes, '', null] }, SOURCES);
  assert.equal(ctx.notes.length, 20);
  assert.equal(ctx.notes[0], 'note 0');
  assert.equal(buildAskContext({ question: 'hi' }, SOURCES).notes, undefined);
});
