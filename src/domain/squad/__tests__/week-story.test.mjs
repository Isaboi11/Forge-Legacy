import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWeekStory, lbCompare, miCompare, parseStoryFacts, shoutOut } from '../week-story.ts';

// PO 2026-09-28: the squad summary should tell the story of the week — shout people out, make everyone
// feel they contributed, show the team working together. Approved mockup C2coURw351Dggbq4eTSKYE.

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

const RECAP = { workouts: 23, participation: { active: 7, total: 9 }, prCount: 4, honorCount: 1, goal: { title: '1,000 squat reps', kind: 'volume_total', target: 1000 } };
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

test('⭐ everyone who trained gets a shout-out, A to Z — never ordered by size', () => {
  const s = buildWeekStory(RECAP, FACTS);
  assert.deepEqual(s.shoutOuts.map((x) => x.name), ['Ana Torres', 'Dev Kumar', 'Jay Morales', 'Kate Olsen', 'Marcus Reed']);
});

test('⭐ nobody who did not train is named anywhere', () => {
  const s = buildWeekStory(RECAP, FACTS);
  const all = JSON.stringify(s);
  assert.equal(all.includes('missed'), false);
  assert.match(s.headline.lead, /^Seven of you showed up/);
});

test('⭐ Holt names the squad goal by its own title, never a theme', () => {
  const s = buildWeekStory(RECAP, FACTS);
  assert.equal(s.headline.em, 'and the squad goal moved.');
  assert.match(s.body, /1,000 squat reps went from 40% to 67% in one week\./);
  assert.doesNotMatch(JSON.stringify(s), /Squatober/);
});

test('each person gets ONE moment, by what matters most for them', () => {
  const by = Object.fromEntries(buildWeekStory(RECAP, FACTS).shoutOuts.map((x) => [x.name, x]));
  assert.equal(by['Jay Morales'].chip, 'comeback');
  assert.match(text(by['Jay Morales'].line), /Back after two weeks off/);
  assert.equal(by['Dev Kumar'].chip, 'welcome');
  assert.match(text(by['Dev Kumar'].line), /Welcome, Dev\./);
  assert.equal(by['Ana Torres'].chip, 'best');
  assert.equal(text(by['Ana Torres'].line), 'Deadlift: 245 lb, a new best.');
  assert.equal(by['Kate Olsen'].chip, 'streak');
});

test('a quiet week still gets a real line, not nothing', () => {
  const s = shoutOut(member('Sam Lee', { workouts: 1, days: [4] }));
  assert.equal(s.chip, 'showed');
  assert.equal(text(s.line), 'One workout toward the squad this week.');
  assert.deepEqual(s.week, [false, false, false, true, false, false, false]);
});

test('the goal bar is last week plus everyone\'s piece', () => {
  const g = buildWeekStory(RECAP, FACTS).goal;
  assert.equal(g.before, 400);
  assert.equal(g.after, 668);
  assert.equal(g.pieces.length, 5);
  assert.equal(g.pctBefore, 40);
});

test('the close points at what is left; a finished goal is celebrated', () => {
  assert.equal(buildWeekStory(RECAP, FACTS).close.title, '332 lb to go.');
  const done = buildWeekStory(RECAP, { ...FACTS, goal_before: 900 });
  assert.equal(done.close.title, '1,000 squat reps: done. Together.');
  const near = buildWeekStory(RECAP, { ...FACTS, goal_before: 600 });
  assert.match(near.close.title, /Next week finishes it\./);
});

test('⛔ a slower week is never scolded — "up on last week" only when it went up', () => {
  const up = buildWeekStory(RECAP, FACTS).facts.find((f) => f.up);
  assert.equal(up.text, '↑ 5 on last week');
  assert.equal(buildWeekStory(RECAP, { ...FACTS, prev_workouts: 30 }).facts.some((f) => f.up), false);
});

test('the together number becomes a picture, and never overclaims', () => {
  assert.equal(lbCompare(41280), 'More than an empty semi truck. Nobody lifts that alone.');
  assert.equal(lbCompare(900), null);
  assert.equal(miCompare(60), "That's 2 marathons. Nobody runs that alone.");
  const runners = buildWeekStory({ ...RECAP, goal: null }, { ...FACTS, lb: 0, mi: 30, goal_before: null });
  assert.deepEqual(runners.together, { value: '30', unit: 'miles covered', compare: 'A full marathon, together.' });
});

test('everyone showing up is said as such; one person is not "one of you"', () => {
  assert.match(buildWeekStory({ ...RECAP, participation: { active: 5, total: 5 } }, FACTS).headline.lead, /^All five of you/);
  const solo = buildWeekStory({ ...RECAP, participation: { active: 1, total: 6 } }, { ...FACTS, members: [member('Kate Olsen')] });
  assert.equal(solo.headline.lead, 'Kate kept the squad moving');
});

test('trained-together moments come from the snapshot', () => {
  assert.deepEqual(buildWeekStory(RECAP, FACTS).moments, ['Jay and Marcus trained together on Tuesday.']);
});

test('no goal → no bar, and a fresh-start close', () => {
  const s = buildWeekStory({ ...RECAP, goal: null }, { ...FACTS, goal_before: null });
  assert.equal(s.goal, null);
  assert.equal(s.close.title, 'New week. Fresh start.');
});

test('a malformed snapshot reads as no story (the plain summary shows instead)', () => {
  assert.equal(parseStoryFacts(null), null);
  assert.equal(parseStoryFacts({ members: 'x' }), null);
  const p = parseStoryFacts({ lb: '1200', members: [{ id: 'a', name: 'A', workouts: 0 }, { id: 'b', name: 'B', workouts: 2, days: [1, 9] }] });
  assert.equal(p.members.length, 1, 'a member with no workouts is dropped');
  assert.deepEqual(p.members[0].days, [1]);
  assert.equal(p.lb, 1200);
});
