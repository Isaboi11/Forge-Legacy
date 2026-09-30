/**
 * album-progress.test.mjs — a chapter's progress photos appear in its album (PO 2026-09-30).
 *
 * The case is the PO's own account, as the diagnostic read it: Chapter I ran Aug 3 – Aug 14, held ONE
 * progress set of five poses taken Aug 10, and no album photos — so it had no album and the photos
 * looked lost. Chapter II held ten album photos and three progress sets.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chapterWeeks,
  eventForDay,
  headlinePr,
  mergeAlbum,
  prEventLabel,
  progressCover,
  progressDay,
  progressItemCount,
  progressItems,
} from '../album-progress.ts';

const POSES = [
  { key: 'rf', label: 'Front Relaxed' },
  { key: 'rs', label: 'Side Relaxed' },
  { key: 'rb', label: 'Back Relaxed' },
  { key: 'ff', label: 'Front Flexed' },
  { key: 'su', label: 'Side Arms Up' },
  { key: 'bf', label: 'Back Flexed' },
];

const CH1 = { startDate: '2026-08-03', endDate: '2026-08-14', sealed: true };

const aug10 = {
  id: 'e1',
  chapterId: 'ch1',
  label: 'August 10, 2026',
  caption: 'Day one of taking this seriously.',
  // Keyed out of pose order on purpose — the album must follow the authored order, not the JSON's.
  photos: { bf: 'u/bf.jpg', rf: 'u/rf.jpg', rs: 'u/rs.jpg', rb: 'u/rb.jpg', ff: 'u/ff.jpg' },
  videoUrl: null,
  createdAt: '2026-08-10T15:00:00Z',
};

test('Chapter I: five progress photos become five album photos, in pose order', () => {
  const items = progressItems([aug10], 'ch1', POSES, CH1, [], new Map());
  assert.equal(items.length, 5);
  assert.deepEqual(
    items.map((i) => i.pose),
    ['Front Relaxed', 'Side Relaxed', 'Back Relaxed', 'Front Flexed', 'Back Flexed'],
  );
  assert.ok(items.every((i) => i.takenOn === '2026-08-10' && i.source === 'progress' && !i.isVideo));
  assert.ok(items.every((i) => i.caption === 'Day one of taking this seriously.'));
  assert.equal(new Set(items.map((i) => i.id)).size, 5);
  assert.equal(progressItemCount(aug10, POSES), 5);
  assert.equal(progressCover(aug10, POSES), 'u/rf.jpg');
});

test('another chapter\'s sets, and sets tied to no chapter, stay out', () => {
  const other = { ...aug10, id: 'e2', chapterId: 'ch2' };
  const loose = { ...aug10, id: 'e3', chapterId: null };
  assert.equal(progressItems([other, loose], 'ch1', POSES, CH1, [], new Map()).length, 0);
});

test('a posing clip is one more item, marked as a video', () => {
  const withClip = { ...aug10, videoUrl: 'u/clip.mp4' };
  const items = progressItems([withClip], 'ch1', POSES, CH1, [], new Map());
  assert.equal(items.length, 6);
  assert.deepEqual([items[5].isVideo, items[5].pose, items[5].url], [true, 'Posing clip', 'u/clip.mp4']);
  assert.equal(progressItemCount(withClip, POSES), 6);
});

test('the day is the capture date, else the LOCAL day the row was written — never "Today" read as now', () => {
  assert.equal(progressDay({ label: 'Aug 10, 2026', createdAt: '2026-09-01T00:00:00Z' }), '2026-08-10');
  const d = new Date(2026, 7, 10, 21, 30); // 9:30pm local
  assert.equal(progressDay({ label: 'Today', createdAt: d.toISOString() }), '2026-08-10');
});

test('events: chapter boundaries first, then the day\'s heaviest PR, else nothing', () => {
  const prs = [
    { exercise: 'barbell-back-squat', loadValue: 315, achievedOn: '2026-08-10' },
    { exercise: 'barbell-bench-press', loadValue: 227.5, achievedOn: '2026-08-10' },
    { exercise: 'pull-up', loadValue: null, achievedOn: '2026-08-11' },
  ];
  assert.equal(eventForDay('2026-08-03', CH1, prs), 'Chapter opened');
  assert.equal(eventForDay('2026-08-14', CH1, prs), 'Chapter sealed');
  assert.equal(eventForDay('2026-08-14', { ...CH1, sealed: false }, prs), null);
  assert.equal(eventForDay('2026-08-10', CH1, prs), 'PR · Barbell Back Squat 315');
  assert.equal(eventForDay('2026-08-11', CH1, prs), null);
  assert.equal(eventForDay('2026-08-12', CH1, prs), null);
  // The same words chapter_album() writes: a half-plate kept, no trailing ".0".
  assert.equal(prEventLabel('barbell-bench-press', 227.5), 'PR · Barbell Bench Press 227.5');
  assert.equal(prEventLabel('Back Squat', 405), 'PR · Back Squat 405');
});

test('a day the album already covers takes the album\'s word — including "nothing happened"', () => {
  const prs = [{ exercise: 'barbell-back-squat', loadValue: 315, achievedOn: '2026-08-10' }];
  const quiet = progressItems([aug10], 'ch1', POSES, CH1, prs, new Map([['2026-08-10', null]]));
  assert.ok(quiet.every((i) => i.event === null));
  const told = progressItems([aug10], 'ch1', POSES, CH1, [], new Map([['2026-08-10', 'PR · Deadlift 405']]));
  assert.ok(told.every((i) => i.event === 'PR · Deadlift 405'));
  const alone = progressItems([aug10], 'ch1', POSES, CH1, prs, new Map());
  assert.ok(alone.every((i) => i.event === 'PR · Barbell Back Squat 315'));
});

test('merge: newest day first, album photos ahead of progress photos on a shared day', () => {
  const album = [
    { id: 'a2', takenOn: '2026-09-18' },
    { id: 'a1', takenOn: '2026-08-26' },
  ];
  const progress = [
    { id: 'p3', takenOn: '2026-09-08' },
    { id: 'p2', takenOn: '2026-08-26' },
    { id: 'p1', takenOn: '2026-08-17' },
  ];
  assert.deepEqual(
    mergeAlbum(album, progress).map((p) => p.id),
    ['a2', 'p3', 'a1', 'p2', 'p1'],
  );
  assert.deepEqual(mergeAlbum([], []), []);
});

test('weeks and the headline lift follow the rules photo_albums() uses', () => {
  assert.equal(chapterWeeks('2026-08-03', '2026-08-14', '2026-09-30'), 2); // 11 days
  assert.equal(chapterWeeks('2026-08-14', null, '2026-09-30'), 7); // 47 days, still open
  assert.equal(chapterWeeks('2026-08-03', '2026-08-03', '2026-09-30'), 1); // never zero

  const prs = [
    { exercise: 'squat', loadValue: 405, achievedOn: '2026-08-20' }, // after the chapter
    { exercise: 'bench', loadValue: 225, achievedOn: '2026-08-05' },
    { exercise: 'deadlift', loadValue: 365, achievedOn: '2026-08-12' },
    { exercise: 'row', loadValue: null, achievedOn: '2026-08-06' },
  ];
  assert.equal(headlinePr(prs, CH1, '2026-09-30')?.exercise, 'deadlift');
  assert.equal(headlinePr(prs, { startDate: '2026-08-14', endDate: null, sealed: false }, '2026-09-30')?.exercise, 'squat');
  assert.equal(headlinePr([], CH1, '2026-09-30'), null);
});

test('a chapter under a week old is counted in days, not "1 week" (QA 09-26 legacy-24)', async () => {
  const { chapterSpan } = await import('../album-progress.ts');
  assert.deepEqual(chapterSpan('2026-09-30', null, '2026-09-30', 1), { value: 1, unit: 'day' });
  assert.deepEqual(chapterSpan('2026-09-27', null, '2026-09-30', 1), { value: 4, unit: 'day' });
  assert.deepEqual(chapterSpan('2026-08-03', '2026-08-14', '2026-09-30', 2), { value: 2, unit: 'week' });
});
