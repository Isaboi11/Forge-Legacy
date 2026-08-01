import test from 'node:test';
import assert from 'node:assert/strict';
import { countHonorsByChapter, honorsInChapter } from '../chapter-tallies.ts';

const h = (chapter_id) => ({ chapter_id });

test('counts honors per chapter', () => {
  const by = countHonorsByChapter([h('ch-1'), h('ch-2'), h('ch-1'), h('ch-1')]);
  assert.equal(honorsInChapter(by, 'ch-1'), 3);
  assert.equal(honorsInChapter(by, 'ch-2'), 1);
});

test('a chapter with no honors is 0, not undefined', () => {
  const by = countHonorsByChapter([h('ch-1')]);
  assert.equal(honorsInChapter(by, 'ch-9'), 0);
  assert.equal(honorsInChapter(new Map(), 'ch-1'), 0);
});

test('chapter-less honors count toward NO chapter', () => {
  // 0012 splits the unique indexes on `chapter_id is null` — those are the one-time honors, earned
  // once across a whole legacy. Folding them into a chapter would inflate it and would re-count the
  // same honor for every chapter thereafter.
  const by = countHonorsByChapter([h(null), h('ch-1'), h(null), h(undefined), h('')]);
  assert.equal(honorsInChapter(by, 'ch-1'), 1);
  assert.equal(by.size, 1, 'null/undefined/empty chapter ids must not create entries');
});

test('empty input yields an empty map, not a throw', () => {
  assert.equal(countHonorsByChapter([]).size, 0);
});

test('THE REGRESSION: a chapter with honors never reports 0', () => {
  // The bug this file exists for. `chapters.honor_count` was written once as a literal 0 and never
  // incremented, so a chapter holding eleven honors sealed while telling the athlete it held none.
  // Any future refactor that reintroduces a stored count has to fail here.
  const rows = Array.from({ length: 11 }, () => h('ch-sealed'));
  const by = countHonorsByChapter(rows);
  assert.equal(honorsInChapter(by, 'ch-sealed'), 11);
  assert.notEqual(honorsInChapter(by, 'ch-sealed'), 0);
});
