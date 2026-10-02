import test from 'node:test';
import assert from 'node:assert/strict';
import { POST_H, POST_W, composePostPicture, composeStory, storyInputFrom } from '../story-card.ts';
import { measureText } from '../text-measure.ts';
import { encodePolyline } from '../../run/route-privacy.ts';

/**
 * The stats-on-the-photo picture for a FEED post (PO 2026-10-02). The feed crops every post photo to 4:5
 * (`LedgerPost`'s media band), so a story-sized picture would lose its badge and its numbers there — this
 * is the same two photo styles laid out for 1080×1350. These hold that nothing is cut, nothing collides
 * with the badge, and the route still appears only when the post carries it (D-RS-3).
 */

const LOOP = [
  { lat: 40.7, lon: -111.9 },
  { lat: 40.705, lon: -111.895 },
  { lat: 40.71, lon: -111.9 },
  { lat: 40.705, lon: -111.905 },
];

const lift = (over = {}) => ({
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
  ],
  prs: [{ exercise: 'Deadlift', weight: 485, reps: 1 }],
  ...over,
});
const run = () => ({
  workoutName: 'Evening Run',
  activityType: 'running',
  chapterName: null,
  savedAt: '2026-10-02T01:30:00.000Z',
  volume: 0,
  sets: 1,
  durationSec: 2538,
  exercises: [{ name: 'Run', topSet: null, isPR: false, cardio: { distanceMi: 5.21, floors: null, paceSecPerMi: 487, durationSec: 2538 } }],
  prs: [],
});
const extra = { startedAt: '2026-10-02T00:42:00.000Z', route: encodePolyline(LOOP), climbM: 56 };

const texts = (d) => d.ops.filter((o) => o.kind === 'text');
const width = (op) => op.runs.reduce((n, r) => n + measureText(r.text, r.size, r.face, r.letterSpacing ?? 0), 0);
const top = (op) => op.y - Math.max(...op.runs.map((r) => r.size)) * 0.75;

function assertFits(d, label) {
  assert.equal(d.width, POST_W, label);
  assert.equal(d.height, POST_H, label);
  for (const op of texts(d)) {
    const w = width(op);
    const left = op.anchor === 'start' ? op.x : op.anchor === 'middle' ? op.x - w / 2 : op.x - w;
    assert.ok(left >= 40 && left + w <= POST_W - 40, `${label}: "${op.runs[0].text}" runs off the side`);
    assert.ok(top(op) >= 40 && op.y <= POST_H - 40, `${label}: "${op.runs[0].text}" is cut at y ${op.y}`);
  }
  // The badge's lines sit at the top; nothing from the bottom block may climb into them.
  const brand = texts(d).filter((o) => /FORGE LEGACY|forgelegacy\.app/.test(o.runs[0].text));
  const brandFoot = Math.max(...brand.map((o) => o.y));
  for (const op of texts(d)) if (!brand.includes(op)) assert.ok(top(op) > brandFoot + 20, `${label}: "${op.runs[0].text}" runs into the badge`);
}

test('a lifting day: Photo Stats at 4:5, the whole photo frame, every word inside it — long title and a PR too', () => {
  const photo = { w: 3024, h: 4032 };
  for (const c of [lift(), lift({ workoutName: 'Heavy Lower Body and Posterior Chain Strength Day Two' }), lift({ prs: [] })]) {
    const d = composePostPicture(storyInputFrom(c, { ...extra, route: null }, 'imperial'), photo, { showRoute: false });
    assert.equal(d.style, 'photo-stats');
    assertFits(d, c.workoutName);
    const ph = d.ops.find((o) => o.kind === 'photo');
    assert.deepEqual(ph.frame, { x: 0, y: 0, w: POST_W, h: POST_H });
  }
  const all = texts(composePostPicture(storyInputFrom(lift(), extra, 'imperial'), photo, { showRoute: false })).map((o) => o.runs.map((r) => r.text).join('')).join(' | ');
  assert.match(all, /Pull Day B/);
  assert.match(all, /Deadlift 485 lb × 1/);
  assert.match(all, /14\.8K/);
});

test('a run: Photo Route at 4:5, and the route only when this post carries it', () => {
  const input = storyInputFrom(run(), extra, 'imperial');
  const off = composePostPicture(input, { w: 1600, h: 1200 }, { showRoute: false });
  const on = composePostPicture(input, { w: 1600, h: 1200 }, { showRoute: true });
  assert.equal(off.style, 'photo-route');
  assertFits(off, 'route off');
  assertFits(on, 'route on');
  assert.equal(off.ops.some((o) => o.kind === 'path'), false);
  assert.ok(on.ops.some((o) => o.kind === 'path'));
  for (const p of on.ops.filter((o) => o.kind === 'circle')) assert.ok(p.cy < POST_H * 0.3, 'the route sits in the top band, clear of the numbers');
});

test('the story-sized pictures are unchanged by the post frame', () => {
  const input = storyInputFrom(lift(), extra, 'imperial');
  const story = composeStory('photo-stats', input, { w: 1200, h: 1600 }, { showRoute: false });
  assert.equal(story.width, 1080);
  assert.equal(story.height, 1920);
});

test('no photo, no picture: the post picture says it needs one rather than posting a bare card', () => {
  const d = composePostPicture(storyInputFrom(lift(), extra, 'imperial'), null, { showRoute: false });
  assert.equal(d.needsPhoto, true);
});
