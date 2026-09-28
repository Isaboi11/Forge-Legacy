import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWeekStory, lbCompare, makePick, miCompare, parseStoryFacts, shoutOut, weekNumber } from '../week-story.ts';

// PO 2026-09-28: the squad summary tells the story of the week (mockup C2coURw351Dggbq4eTSKYE) — and
// "make sure that coach holt has a variety and it's not the same every time … He has a personality so use it."

const member = (name, over = {}) => ({
  id: name.toLowerCase().replace(/\s/g, '-'),
  name,
  workouts: 3,
  days: [1, 3, 5],
  lb: 5000,
  mi: 0,
  new_to_squad: false,
  first_ever: false,
  gap_days: 2,
  best_week: false,
  prs: [],
  honors: [],
  goal: 40,
  ...over,
});
const text = (segs) => segs.map((s) => s.t).join('');

const WEEK = '2026-09-21T00:00:00Z';
const RECAP = { weekStart: WEEK, workouts: 23, participation: { active: 7, total: 9 }, prCount: 4, honorCount: 1, goal: { title: '1,000 squat reps', kind: 'volume_total', target: 1000 } };
const FACTS = {
  prev_workouts: 18,
  lb: 41280,
  mi: 0,
  goal_before: 400,
  members: [
    member('Marcus Reed', { prs: [{ exercise: 'Bench Press', value: '230 lb' }], goal: 48 }),
    member('Ana Torres', { prs: [{ exercise: 'Deadlift', value: '245 lb' }], goal: 60 }),
    member('Jay Morales', { gap_days: 16, goal: 40 }),
    member('Kate Olsen', { workouts: 5, days: [1, 2, 3, 5, 6], best_week: true, honors: ['Iron Week'], goal: 90 }),
    member('Dev Kumar', { workouts: 2, new_to_squad: true, goal: 30 }),
  ],
  together: [{ a: 'Jay Morales', b: 'Marcus Reed', day: 2 }],
};

/** Every line the story can put on screen, flattened — what the voice rules are checked against. */
const lines = (s) => [
  `${s.headline.lead}, ${s.headline.em}`,
  ...s.body.split(/(?<=[.!])\s+/),
  s.together.compare ?? '',
  ...s.shoutOuts.map((x) => text(x.line)),
  ...s.moments,
  s.close.title,
  s.close.body,
].filter(Boolean);

/** Many weeks × many squads × every kind of week. */
function* everyStory() {
  const variants = [
    FACTS,
    { ...FACTS, goal_before: 900 },
    { ...FACTS, goal_before: 600 },
    { ...FACTS, lb: 0, mi: 60 },
    { ...FACTS, members: [member('Kate Olsen', { first_ever: true, gap_days: null })] },
    { ...FACTS, members: FACTS.members.map((m) => ({ ...m, prs: [], honors: [], best_week: false, gap_days: 2, new_to_squad: false })) },
  ];
  const recaps = [RECAP, { ...RECAP, participation: { active: 9, total: 9 } }, { ...RECAP, participation: { active: 1, total: 6 } }, { ...RECAP, participation: { active: 2, total: 9 } }, { ...RECAP, goal: null, prCount: 0 }];
  for (let w = 0; w < 12; w++) {
    const weekStart = new Date(Date.parse(WEEK) + w * 7 * 86400000).toISOString();
    for (const squad of ['Iron Pack', 'Dawn Patrol', 'Mocha 1']) {
      for (const r of recaps) for (const f of variants) yield buildWeekStory({ ...r, weekStart }, r.goal ? f : { ...f, goal_before: null }, squad);
    }
  }
}

/* ── Holt's voice (Holt-Voice-Amendment-001) ─────────────────────────────── */

const CHEESE = /\b(crush(ing|ed)? it|beast( mode)?|let'?s go{3,}|no days off|champ|buddy|king|queen|killing it|slay(ing)?|rock ?star|superstar|legend|great question|you got this bro|grind never stops|amazing|awesome)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;

test('⭐ every phrasing Holt can use stays in his voice — never cheesy, no emoji, one "!" at most (HV-D2/D3)', () => {
  let checked = 0;
  for (const s of everyStory()) {
    for (const l of lines(s)) {
      assert.doesNotMatch(l, CHEESE, `cheesy: "${l}"`);
      assert.doesNotMatch(l, EMOJI, `emoji: "${l}"`);
      assert.ok((l.match(/!/g) ?? []).length <= 1, `more than one "!": "${l}"`);
      checked++;
    }
  }
  assert.ok(checked > 5000, `only ${checked} lines checked`);
});

test('⭐ he never counts the misses — a comeback is welcomed, not measured (HV-D5)', () => {
  for (const s of everyStory()) {
    for (const l of lines(s)) {
      assert.doesNotMatch(l, /\b(weeks? (off|away)|missed|behind|skipped|absent|finally)\b/i, `counts a miss: "${l}"`);
    }
  }
});

test('"!" only lands on a real win: a new best, an honor, a finished goal (HV-D3)', () => {
  for (const s of everyStory()) {
    for (const x of s.shoutOuts) if (text(x.line).includes('!')) assert.ok(['best', 'honor'].includes(x.chip), `${x.chip}: ${text(x.line)}`);
    if (s.headline.em.includes('!')) assert.ok(s.goal && s.goal.after >= s.goal.target);
  }
});

/* ── variety ─────────────────────────────────────────────────────────────── */

test('⭐ the same summary always reads the same — every member sees the same words, every time', () => {
  assert.deepEqual(buildWeekStory(RECAP, FACTS, 'Iron Pack'), buildWeekStory(RECAP, FACTS, 'Iron Pack'));
});

test('⭐ next week never repeats this week\'s phrasing for the same moment', () => {
  const next = { ...RECAP, weekStart: '2026-09-28T00:00:00Z' };
  assert.equal(weekNumber(next.weekStart), weekNumber(RECAP.weekStart) + 1);
  for (const squad of ['Iron Pack', 'Dawn Patrol', 'Mocha 1', 'x']) {
    const a = buildWeekStory(RECAP, FACTS, squad);
    const b = buildWeekStory(next, FACTS, squad);
    assert.notEqual(a.headline.lead, b.headline.lead, squad);
    assert.notEqual(a.headline.em, b.headline.em, squad);
    assert.notEqual(text(a.shoutOuts[0].line), text(b.shoutOuts[0].line), squad);
    assert.notEqual(a.close.body, b.close.body, squad);
  }
});

test('over a season, Holt uses several different openings', () => {
  const openings = new Set();
  for (let w = 0; w < 8; w++) openings.add(buildWeekStory({ ...RECAP, weekStart: new Date(Date.parse(WEEK) + w * 7 * 86400000).toISOString() }, FACTS, 'Iron Pack').headline.lead);
  assert.ok(openings.size >= 4, [...openings].join(' | '));
});

test('⭐ two people with the same kind of moment in one week get different lines', () => {
  const twins = { ...FACTS, members: [member('Ana Torres', { prs: [{ exercise: 'Deadlift', value: '245 lb' }] }), member('Marcus Reed', { prs: [{ exercise: 'Bench Press', value: '230 lb' }] })] };
  for (const squad of ['Iron Pack', 'Dawn Patrol', 'Mocha 1']) {
    const [a, b] = buildWeekStory(RECAP, twins, squad).shoutOuts;
    assert.notEqual(text(a.line).replace('Deadlift', 'X').replace('245 lb', 'Y'), text(b.line).replace('Bench Press', 'X').replace('230 lb', 'Y'), squad);
  }
});

/* ── what the story says ─────────────────────────────────────────────────── */

test('⭐ everyone who trained gets a shout-out, A to Z — never ordered by size', () => {
  const s = buildWeekStory(RECAP, FACTS, 'Iron Pack');
  assert.deepEqual(s.shoutOuts.map((x) => x.name), ['Ana Torres', 'Dev Kumar', 'Jay Morales', 'Kate Olsen', 'Marcus Reed']);
});

test('⭐ Holt names the squad goal by its own title, never a theme', () => {
  for (const s of everyStory()) assert.doesNotMatch(JSON.stringify(s), /Squatober/);
  const s = buildWeekStory(RECAP, FACTS, 'Iron Pack');
  assert.match(s.body, /1,000 squat reps/);
  assert.match(s.body, /40%.*67%/);
});

test('each person gets ONE moment, by what matters most for them', () => {
  const by = Object.fromEntries(buildWeekStory(RECAP, FACTS, 'Iron Pack').shoutOuts.map((x) => [x.name, x]));
  assert.equal(by['Jay Morales'].chip, 'comeback');
  assert.equal(by['Jay Morales'].chipLabel, 'Welcome back');
  assert.equal(by['Dev Kumar'].chip, 'welcome');
  assert.equal(by['Ana Torres'].chip, 'best');
  assert.match(text(by['Ana Torres'].line), /Deadlift/);
  assert.match(text(by['Ana Torres'].line), /245 lb/);
  assert.equal(by['Kate Olsen'].chip, 'streak');
  assert.equal(by['Marcus Reed'].chip, 'best');
});

test('a quiet week still gets a real line, not nothing', () => {
  const s = shoutOut(member('Sam Lee', { workouts: 1, days: [4] }), makePick('Iron Pack', 1));
  assert.equal(s.chip, 'showed');
  assert.match(text(s.line), /workout|Showed up/i);
  assert.deepEqual(s.week, [false, false, false, true, false, false, false]);
});

test('the goal bar is last week plus everyone\'s piece', () => {
  const g = buildWeekStory(RECAP, FACTS, 'Iron Pack').goal;
  assert.equal(g.before, 400);
  assert.equal(g.after, 668);
  assert.equal(g.pieces.length, 5);
  assert.equal(g.pctBefore, 40);
});

test('the close points at what is left; a finished goal is celebrated', () => {
  assert.match(buildWeekStory(RECAP, FACTS, 'Iron Pack').close.title, /^332 lb to go\.$/);
  assert.match(buildWeekStory(RECAP, { ...FACTS, goal_before: 900 }, 'Iron Pack').close.title, /1,000 squat reps.*!/);
  assert.match(buildWeekStory(RECAP, { ...FACTS, goal_before: 600 }, 'Iron Pack').close.title, /^132 lb to go\. (Next week finishes it\.|One more week like this and it's done\.)$/);
});

test('⛔ a slower week is never scolded — "up on last week" only when it went up', () => {
  assert.equal(buildWeekStory(RECAP, FACTS, 'x').facts.find((f) => f.up).text, '↑ 5 on last week');
  assert.equal(buildWeekStory(RECAP, { ...FACTS, prev_workouts: 30 }, 'x').facts.some((f) => f.up), false);
});

test('the together number becomes a picture, and never overclaims', () => {
  assert.match(lbCompare(41280), /^More than an empty semi truck\. /);
  assert.equal(lbCompare(900), null);
  assert.match(miCompare(60), /(2|Two) marathons/);
  const runners = buildWeekStory({ ...RECAP, goal: null }, { ...FACTS, lb: 0, mi: 30, goal_before: null }, 'x');
  assert.equal(runners.together.unit, 'miles covered');
  assert.match(runners.together.compare, /marathon|26\.2/i);
});

test('everyone showing up is said as such; one person is named, not "one of you"', () => {
  assert.match(buildWeekStory({ ...RECAP, participation: { active: 5, total: 5 } }, FACTS, 'x').headline.lead, /all five|Every single one/i);
  const solo = buildWeekStory({ ...RECAP, participation: { active: 1, total: 6 } }, { ...FACTS, members: [member('Kate Olsen')] }, 'x');
  assert.match(solo.headline.lead, /^Kate /);
});

test('trained-together moments name both people and the day', () => {
  const [m] = buildWeekStory(RECAP, FACTS, 'Iron Pack').moments;
  assert.match(m, /Jay/);
  assert.match(m, /Marcus/);
  assert.match(m, /Tuesday/);
});

test('no goal → no bar, and a fresh-start close', () => {
  const s = buildWeekStory({ ...RECAP, goal: null }, { ...FACTS, goal_before: null }, 'x');
  assert.equal(s.goal, null);
  assert.ok(s.close.title.length > 0);
});

test('a malformed snapshot reads as no story (the plain summary shows instead)', () => {
  assert.equal(parseStoryFacts(null), null);
  assert.equal(parseStoryFacts({ members: 'x' }), null);
  const p = parseStoryFacts({ lb: '1200', members: [{ id: 'a', name: 'A', workouts: 0 }, { id: 'b', name: 'B', workouts: 2, days: [1, 9] }] });
  assert.equal(p.members.length, 1, 'a member with no workouts is dropped');
  assert.deepEqual(p.members[0].days, [1]);
  assert.equal(p.lb, 1200);
});
