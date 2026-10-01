import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAFE_BOTTOM,
  SAFE_TOP,
  STORY_H,
  STORY_STYLES,
  STORY_W,
  compactInt,
  composeStory,
  defaultStyle,
  fitLines,
  storyInputFrom,
  storyMessage,
} from '../story-card.ts';
import { measureText } from '../text-measure.ts';
import { encodePolyline } from '../../run/route-privacy.ts';

/**
 * The share picture is drawn twice — canvas on the web, react-native-svg on a phone — from this one list.
 * These hold what a visual check would otherwise only catch after somebody posted it: text inside the
 * frame and clear of Instagram's own bars, nothing invented, the route only when it was asked for.
 */

const LOOP = [
  { lat: 40.7, lon: -111.9 },
  { lat: 40.705, lon: -111.895 },
  { lat: 40.71, lon: -111.9 },
  { lat: 40.705, lon: -111.905 },
  { lat: 40.701, lon: -111.901 },
];

const liftCompletion = (over = {}) => ({
  workoutName: 'Pull Day B',
  activityType: 'strength',
  chapterName: 'The Rebuild',
  savedAt: '2026-10-01T19:40:00.000Z',
  volume: 14820,
  sets: 18,
  durationSec: 3124,
  exercises: [
    { name: 'Barbell Row', topSet: '225 lb × 8', isPR: false, cardio: null },
    { name: 'Deadlift', topSet: '485 lb × 1', isPR: true, cardio: null },
    { name: 'Weighted Pull-up', topSet: '45 lb × 6', isPR: false, cardio: null },
    { name: 'Face Pull', topSet: '50 lb × 15', isPR: false, cardio: null },
  ],
  prs: [{ exercise: 'Deadlift', weight: 485, reps: 1 }],
  ...over,
});

const runCompletion = (over = {}) => ({
  workoutName: 'Evening Run',
  activityType: 'running',
  chapterName: 'The Rebuild',
  savedAt: '2026-10-02T01:30:00.000Z',
  volume: 0,
  sets: 1,
  durationSec: 2538,
  exercises: [{ name: 'Run', topSet: null, isPR: false, cardio: { distanceMi: 5.21, floors: null, paceSecPerMi: 487, durationSec: 2538 } }],
  prs: [],
  ...over,
});

const extra = (over = {}) => ({ startedAt: '2026-10-02T00:42:00.000Z', route: encodePolyline(LOOP), climbM: 56, ...over });
const PHOTO = { w: 1200, h: 1600 };

const texts = (d) => d.ops.filter((o) => o.kind === 'text');
const lineWidth = (op) => op.runs.reduce((n, r) => n + measureText(r.text, r.size, r.face, r.letterSpacing ?? 0), 0);
const extent = (op) => {
  const w = lineWidth(op);
  const left = op.anchor === 'start' ? op.x : op.anchor === 'middle' ? op.x - w / 2 : op.x - w;
  return { left, right: left + w };
};
const allText = (d) => texts(d).flatMap((o) => o.runs.map((r) => r.text)).join(' | ');

function assertWellFormed(d, label) {
  assert.equal(d.width, STORY_W, label);
  assert.equal(d.height, STORY_H, label);
  for (const op of texts(d)) {
    const { left, right } = extent(op);
    const big = Math.max(...op.runs.map((r) => r.size));
    assert.ok(left >= 40 && right <= STORY_W - 40, `${label}: "${op.runs.map((r) => r.text).join('')}" runs off the side (${left.toFixed(0)}–${right.toFixed(0)})`);
    // The top of the tallest glyph and the baseline both have to sit inside the bands Instagram leaves clear.
    assert.ok(op.y - big * 0.75 >= SAFE_TOP, `${label}: "${op.runs[0].text}" sits under the top bar (y ${op.y})`);
    assert.ok(op.y <= SAFE_BOTTOM, `${label}: "${op.runs[0].text}" sits under the reply bar (y ${op.y})`);
  }
}

const every = (kind) => STORY_STYLES[kind].map((s) => s.id);

test('every lifting style stays inside the frame and clear of the story bars', () => {
  const input = storyInputFrom(liftCompletion(), extra({ route: null, climbM: null }), 'imperial');
  for (const style of every('lift')) {
    for (const photo of [PHOTO, null]) assertWellFormed(composeStory(style, input, photo, { showRoute: false }), `${style}/${photo ? 'photo' : 'none'}`);
  }
});

test('every run style stays inside the frame, with the route on and off', () => {
  const input = storyInputFrom(runCompletion(), extra(), 'imperial');
  for (const style of every('run')) {
    for (const showRoute of [true, false]) assertWellFormed(composeStory(style, input, PHOTO, { showRoute }), `${style}/route:${showRoute}`);
  }
});

test('long names shrink or wrap — they never run off the picture', () => {
  const longName = 'Single-Arm Landmine Rotational Press With Pause Behind The Hip';
  const input = storyInputFrom(
    liftCompletion({
      workoutName: 'Posterior Chain Accessory Day With Extra Grip Work And Mobility Finisher',
      chapterName: 'The Very Long Chapter Name That Somebody Typed On Purpose',
      exercises: [{ name: longName, topSet: '135 lb × 8', isPR: true, cardio: null }],
      prs: [{ exercise: longName, weight: 135, reps: 8 }],
    }),
    extra({ route: null }),
    'imperial',
  );
  for (const style of every('lift')) assertWellFormed(composeStory(style, input, PHOTO, { showRoute: false }), `long/${style}`);
});

test('the title wraps to two lines at most', () => {
  const f = fitLines('One two three four five six seven eight nine ten eleven twelve thirteen fourteen', 900, 120, 'serif', 80, 2);
  assert.ok(f.lines.length <= 2);
  assert.ok(f.lines.every((l) => measureText(l, f.size, 'serif') <= 900));
});

test('a session with no record has no PR on any lifting style', () => {
  const input = storyInputFrom(
    liftCompletion({ exercises: liftCompletion().exercises.map((e) => ({ ...e, isPR: false })), prs: [] }),
    extra({ route: null }),
    'imperial',
  );
  for (const style of every('lift')) {
    const t = allText(composeStory(style, input, PHOTO, { showRoute: false }));
    assert.ok(!/\bPR\b/.test(t), `${style} shows a PR that was not set: ${t}`);
    assert.ok(!/personal record/i.test(t), style);
  }
  // The plate commemorates the work instead.
  assert.match(allText(composeStory('engraved', input, null, { showRoute: false })), /14,820/);
});

test('the PR shown is the session’s own heaviest record, in the athlete’s units', () => {
  const c = liftCompletion({ prs: [{ exercise: 'Barbell Row', weight: 225, reps: 8 }, { exercise: 'Deadlift', weight: 485, reps: 1 }] });
  const lb = allText(composeStory('engraved', storyInputFrom(c, extra(), 'imperial'), null, { showRoute: false }));
  assert.match(lb, /Deadlift/);
  assert.match(lb, /485/);
  const kg = allText(composeStory('photo-stats', storyInputFrom(c, extra(), 'metric'), PHOTO, { showRoute: false }));
  assert.match(kg, /Deadlift 220 kg × 1/); // 485 lb
  assert.ok(!/\blb\b/.test(kg), `metric picture still says lb: ${kg}`);
});

test('the ledger lists top sets with records first, unit-free and converted', () => {
  const t = texts(composeStory('ledger', storyInputFrom(liftCompletion(), extra(), 'metric'), null, { showRoute: false })).map((o) => o.runs.map((r) => r.text).join(''));
  const first = t.indexOf('TOP SETS');
  assert.ok(first > -1);
  const rows = t.slice(first + 1);
  const deadlift = rows.findIndex((s) => s === 'Deadlift');
  const row = rows.findIndex((s) => s === 'Barbell Row');
  assert.ok(deadlift > -1 && row > -1 && deadlift < row, 'the record leads the list');
  assert.ok(rows.includes('220 × 1'), `converted value missing: ${rows.join(' / ')}`);
});

test('photo styles say they need a photo until they have one; the cards never do', () => {
  const lift = storyInputFrom(liftCompletion(), extra(), 'imperial');
  const run = storyInputFrom(runCompletion(), extra(), 'imperial');
  assert.equal(composeStory('photo-stats', lift, null, { showRoute: false }).needsPhoto, true);
  assert.equal(composeStory('photo-stats', lift, PHOTO, { showRoute: false }).needsPhoto, false);
  assert.equal(composeStory('photo-route', run, null, { showRoute: false }).needsPhoto, true);
  for (const s of ['engraved', 'ledger']) assert.equal(composeStory(s, lift, null, { showRoute: false }).needsPhoto, false);
  for (const s of ['route-card', 'sticker']) assert.equal(composeStory(s, run, null, { showRoute: false }).needsPhoto, false);
  assert.equal(composeStory('engraved', lift, null, { showRoute: false }).ops.some((o) => o.kind === 'photo'), false);
  assert.equal(composeStory('engraved', lift, PHOTO, { showRoute: false }).ops.some((o) => o.kind === 'photo'), true);
});

test('D-RS-3: no route is drawn unless the athlete turned it on for this share', () => {
  const run = storyInputFrom(runCompletion(), extra(), 'imperial');
  for (const style of every('run')) {
    const off = composeStory(style, run, PHOTO, { showRoute: false });
    assert.equal(off.ops.some((o) => o.kind === 'path' && o.strokeWidth >= 10), false, `${style} drew a route while it was off`);
    const on = composeStory(style, run, PHOTO, { showRoute: true });
    assert.equal(on.ops.some((o) => o.kind === 'circle'), true, `${style} drew no route while it was on`);
  }
});

test('with the route off, the route card leads with the distance and does not repeat it', () => {
  const t = allText(composeStory('route-card', storyInputFrom(runCompletion(), extra(), 'imperial'), null, { showRoute: false }));
  assert.equal((t.match(/5\.21/g) ?? []).length, 1);
  assert.match(t, /8:07/);
  assert.match(t, /42:18/);
});

test('the climb is shown only when it was recorded, and no elevation curve is ever drawn', () => {
  const withClimb = allText(composeStory('route-card', storyInputFrom(runCompletion(), extra({ climbM: 56 }), 'imperial'), null, { showRoute: true }));
  assert.match(withClimb, /\+184 ft/);
  const none = allText(composeStory('route-card', storyInputFrom(runCompletion(), extra({ climbM: null }), 'imperial'), null, { showRoute: true }));
  assert.ok(!/ELEVATION/.test(none));
});

test('the sticker has no ground — the PNG keeps its alpha', () => {
  const d = composeStory('sticker', storyInputFrom(runCompletion(), extra(), 'imperial'), PHOTO, { showRoute: true });
  assert.equal(d.transparent, true);
  assert.equal(d.ops.some((o) => (o.kind === 'rect' || o.kind === 'vgrad') && o.w >= STORY_W && o.h >= STORY_H), false);
  assert.equal(d.ops.some((o) => o.kind === 'photo'), false);
});

test('every picture carries the address under the badge', () => {
  const lift = storyInputFrom(liftCompletion(), extra(), 'imperial');
  const run = storyInputFrom(runCompletion(), extra(), 'imperial');
  for (const s of every('lift')) assert.match(allText(composeStory(s, lift, PHOTO, { showRoute: false })), /forgelegacy\.app/);
  for (const s of every('run')) assert.match(allText(composeStory(s, run, PHOTO, { showRoute: true })), /forgelegacy\.app/);
});

test('a pure run uses the run styles; a lifting day with a cool-down walk stays a lifting day', () => {
  assert.equal(storyInputFrom(runCompletion(), extra(), 'imperial').kind, 'run');
  const mixed = liftCompletion({ exercises: [...liftCompletion().exercises, { name: 'Walk', topSet: null, isPR: false, cardio: { distanceMi: 0.5, floors: null, paceSecPerMi: 1200, durationSec: 600 } }] });
  assert.equal(storyInputFrom(mixed, extra(), 'imperial').kind, 'lift');
});

test('an unnamed session gets a plain name, never "Freestyle Workout"', () => {
  assert.equal(storyInputFrom(runCompletion({ workoutName: 'Freestyle Workout' }), extra(), 'imperial').title, 'Run');
  assert.equal(storyInputFrom(liftCompletion({ workoutName: '  ' }), extra(), 'imperial').title, 'Workout');
});

test('a route that will not decode draws no line rather than a broken one', () => {
  const run = storyInputFrom(runCompletion(), extra({ route: '???' }), 'imperial');
  const d = composeStory('route-card', run, null, { showRoute: true });
  assert.equal(d.ops.some((o) => o.kind === 'circle'), false);
});

test('defaults: the photo style with a photo, the card without', () => {
  assert.equal(defaultStyle('lift', true), 'photo-stats');
  assert.equal(defaultStyle('lift', false), 'ledger');
  assert.equal(defaultStyle('run', true), 'photo-route');
  assert.equal(defaultStyle('run', false), 'route-card');
});

test('numbers read the way a person writes them', () => {
  assert.equal(compactInt(9450), '9,450');
  assert.equal(compactInt(14820), '14.8K');
  assert.equal(compactInt(20000), '20K');
  assert.equal(compactInt(123456), '123K');
});

test('the message beside the picture names the session and carries the link', () => {
  assert.equal(storyMessage(storyInputFrom(runCompletion(), extra(), 'imperial')), 'Evening Run: 5.21 mi. https://forgelegacy.app');
  assert.match(storyMessage(storyInputFrom(liftCompletion(), extra(), 'imperial')), /^Pull Day B: new Deadlift record, 485 lb\. https:\/\/forgelegacy\.app$/);
});
