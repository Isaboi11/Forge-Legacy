/**
 * Launch QA 11-08, H30 — "Featured Legacy Moment" never appeared, and the timeline never said "Sealed…" or
 * "Achieved…": nothing ever wrote CHAPTER_SEALED or GOAL_ACHIEVED. Plus: a sealed chapter had no end_date.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('sealing writes its end date and the CHAPTER_SEALED moment', () => {
  const src = read('../../data/chapter-detail-live.ts');
  assert.match(src, /end_date: endDate,/);
  assert.match(src, /recordTimelineEvent\(\{ type: 'CHAPTER_SEALED'/);
});

test('a goal writes GOAL_ACHIEVED once, on the crossing, from both paths', () => {
  const src = read('../../data/goals-live.ts');
  assert.match(src, /if \(newlyAchieved\) await recordTimelineEvent\(\{ type: 'GOAL_ACHIEVED'/);
  assert.match(src, /if \(nowAchieved\) await recordTimelineEvent\(\{ type: 'GOAL_ACHIEVED'/);
});
