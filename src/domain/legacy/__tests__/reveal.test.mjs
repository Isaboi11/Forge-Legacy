import test from 'node:test';
import assert from 'node:assert/strict';
import { activityDayLabel, recentLegacyEvents, RECENT_LEGACY_MAX, isUnnamedChapterI, legacyReveal, PINNED_MIN_ITEMS, TIMELINE_MIN_EVENTS } from '../reveal.ts';

test('the activity day label follows the local calendar, not a 24-hour window', () => {
  const now = new Date(2026, 8, 29, 7, 0);
  assert.equal(activityDayLabel(new Date(2026, 8, 29, 6, 0).toISOString(), now), 'Today');
  assert.equal(activityDayLabel(new Date(2026, 8, 28, 23, 0).toISOString(), now), 'Yesterday');
  assert.equal(activityDayLabel(new Date(2026, 8, 12, 12, 0).toISOString(), now), 'Sep 12');
});

const facts = (over = {}) => ({
  activeChapterName: 'Chapter I — Stronger Father',
  sealedChapterCount: 0,
  savedWorkoutCount: 0,
  timelineEventCount: 0,
  photoCount: 0,
  transformationCount: 0,
  trophiesEntered: 0,
  accomplishmentCount: 0,
  honorCount: 0,
  pinCount: 0,
  hasQuote: false,
  ...over,
});

const MATURE_SECTIONS = ['pinned', 'timeline', 'transformationTile', 'photosTile', 'trophyTile', 'accomplishments', 'honors', 'inscription', 'quote'];

// ── the skip reading ──────────────────────────────────────────────────────────

test('the onboarding default name reads as unnamed; anything else does not', () => {
  assert.equal(isUnnamedChapterI('Chapter I — Building Your Foundation'), true);
  assert.equal(isUnnamedChapterI('Chapter I — Stronger Father'), false);
  assert.equal(isUnnamedChapterI('Chapter II — Building Your Foundation'), false);
  assert.equal(isUnnamedChapterI(null), false);
});

// ── State 1 · named chapter, nothing else ─────────────────────────────────────

test('State 1: a named chapter is the hero, one start module, and nothing mature renders', () => {
  const r = legacyReveal(facts());
  assert.equal(r.chapter, 'hero');
  assert.equal(r.startBuilding, true);
  assert.equal(r.addRow, null, 'the compact row never doubles the start module');
  assert.equal(r.intro, false);
  for (const k of MATURE_SECTIONS) assert.equal(r[k], false, k);
});

// ── State 2 · skipped ─────────────────────────────────────────────────────────

test('State 2: a skipped chapter gets the intro, a start-by-rename CTA and the compact row', () => {
  const r = legacyReveal(facts({ activeChapterName: 'Chapter I — Building Your Foundation' }));
  assert.equal(r.chapter, 'start-first');
  assert.equal(r.chapterStartsByRename, true);
  assert.equal(r.intro, true);
  assert.equal(r.startBuilding, false);
  assert.deepEqual(r.addRow, { photo: true, accomplishment: true, quote: true });
  for (const k of MATURE_SECTIONS) assert.equal(r[k], false, k);
});

test('no open chapter and none ever sealed also reads as start-first, but creates rather than renames', () => {
  const r = legacyReveal(facts({ activeChapterName: null }));
  assert.equal(r.chapter, 'start-first');
  assert.equal(r.chapterStartsByRename, false);
});

test('a sealed history with no open chapter asks for the NEXT chapter, not the first', () => {
  const r = legacyReveal(facts({ activeChapterName: null, sealedChapterCount: 1 }));
  assert.equal(r.chapter, 'start-next');
  assert.equal(r.intro, false);
});

// ── State 3 · first workout ───────────────────────────────────────────────────

test('State 3: the first workout retires the start module for recent activity and the compact row', () => {
  const r = legacyReveal(facts({ savedWorkoutCount: 1 }));
  assert.equal(r.chapter, 'hero');
  assert.equal(r.startBuilding, false);
  assert.equal(r.recentLegacy, 'workouts', 'the first workout is shown until something meaningful exists');
  assert.deepEqual(r.addRow, { photo: true, accomplishment: true, quote: true });
  assert.equal(r.timeline, false, 'one workout is not a timeline');
  assert.equal(r.pinned, false);
});

test('a skipper who trains keeps the start CTA but loses the brand-new intro', () => {
  const r = legacyReveal(facts({ activeChapterName: 'Chapter I — Building Your Foundation', savedWorkoutCount: 1 }));
  assert.equal(r.chapter, 'start-first');
  assert.equal(r.intro, false);
  assert.equal(r.recentLegacy, 'workouts');
});

// ── State 4 · content reveals its own section ─────────────────────────────────

test('each collection appears only once it holds something, and its invitation retires on its own', () => {
  const r = legacyReveal(facts({ savedWorkoutCount: 2, photoCount: 1 }));
  assert.equal(r.photosTile, true);
  assert.equal(r.transformationTile, false);
  assert.equal(r.trophyTile, false);
  assert.deepEqual(r.addRow, { photo: true, accomplishment: true, quote: true }, 'a chapter photo is not a progress photo');
  assert.equal(legacyReveal(facts({ transformationCount: 1 })).addRow.photo, false, 'a Transformation entry retires the progress-photo invite');

  const acc = legacyReveal(facts({ accomplishmentCount: 1 }));
  assert.equal(acc.accomplishments, true);
  assert.equal(acc.startBuilding, false, 'an entry means the athlete has started');

  assert.equal(legacyReveal(facts({ honorCount: 1 })).honors, true);
  assert.equal(legacyReveal(facts({ trophiesEntered: 1 })).trophyTile, true);
  assert.equal(legacyReveal(facts({ transformationCount: 1 })).transformationTile, true);
  assert.equal(legacyReveal(facts({ hasQuote: true })).quote, true);
});

test('the compact row disappears once all three are kept', () => {
  const r = legacyReveal(facts({ transformationCount: 3, accomplishmentCount: 1, hasQuote: true }));
  assert.equal(r.addRow, null);
});

test('Pinned Legacy waits until pinning is a real choice, or something is already pinned', () => {
  assert.equal(legacyReveal(facts({ accomplishmentCount: PINNED_MIN_ITEMS - 1 })).pinned, false);
  assert.equal(legacyReveal(facts({ accomplishmentCount: 1, honorCount: 1 })).pinned, true);
  assert.equal(legacyReveal(facts({ pinCount: 1 })).pinned, true);
});

test('the timeline is promoted at the threshold, counting workouts and stored events together', () => {
  assert.equal(legacyReveal(facts({ savedWorkoutCount: TIMELINE_MIN_EVENTS - 1 })).timeline, false);
  assert.equal(legacyReveal(facts({ savedWorkoutCount: 2, timelineEventCount: 1 })).timeline, true);
});

test('an established athlete sees every section they have content for', () => {
  const r = legacyReveal(
    facts({
      sealedChapterCount: 1,
      savedWorkoutCount: 40,
      timelineEventCount: 12,
      photoCount: 9,
      transformationCount: 3,
      trophiesEntered: 2,
      accomplishmentCount: 4,
      honorCount: 6,
      pinCount: 3,
      hasQuote: true,
    }),
  );
  for (const k of MATURE_SECTIONS) assert.equal(r[k], true, k);
  assert.equal(r.addRow, null);
  assert.equal(r.startBuilding, false);
  assert.equal(r.intro, false);
});

// ── Recent Legacy: what mattered, not what was done ───────────────────────────

test('State 1–3 pages end in whitespace: no inscription until there are collections', () => {
  assert.equal(legacyReveal(facts()).inscription, false);
  assert.equal(legacyReveal(facts({ savedWorkoutCount: 1 })).inscription, false);
  assert.equal(legacyReveal(facts({ accomplishmentCount: 1 })).inscription, true);
  assert.equal(legacyReveal(facts({ activeChapterName: null, sealedChapterCount: 1 })).inscription, true);
});

test('Recent Legacy shows meaningful events once any exist, and workouts only before that', () => {
  assert.equal(legacyReveal(facts()).recentLegacy, null);
  assert.equal(legacyReveal(facts({ savedWorkoutCount: 12 })).recentLegacy, 'workouts');
  assert.equal(legacyReveal(facts({ savedWorkoutCount: 12, timelineEventCount: 1 })).recentLegacy, 'events');
});

test('recent events drop chapter openings, sort newest first, and cap', () => {
  const ev = [
    { kind: 'chapter-open', at: '2026-09-30T00:00:00Z' },
    { kind: 'honor', at: '2026-09-20T00:00:00Z' },
    { kind: 'pr', at: '2026-09-28T12:00:00Z' },
    { kind: 'photo', at: '2026-09-10T00:00:00Z' },
    { kind: 'accomplishment', at: '2026-09-25T00:00:00Z' },
  ];
  const out = recentLegacyEvents(ev);
  assert.equal(out.length, RECENT_LEGACY_MAX);
  assert.deepEqual(out.map((e) => e.kind), ['pr', 'accomplishment', 'honor']);
  assert.deepEqual(recentLegacyEvents([{ kind: 'chapter-open', at: '2026-09-01T00:00:00Z' }]), []);
});
