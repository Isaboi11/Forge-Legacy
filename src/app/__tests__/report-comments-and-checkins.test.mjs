/**
 * Launch QA 11-08, H9 — guideline 1.2: a squad post had Report, but its comments and check-in videos did not, and
 * nobody could take a check-in down (the author's delete policy existed since 0049; nothing offered it).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('anybody else\'s comment can be reported, never your own', () => {
  const src = read('../squad-post/[id].tsx');
  assert.match(src, /targetKind="comment"/);
  assert.match(src, /\{!isMine \? \(\n\s+<Pressable onPress=\{onReport\}/);
});

test('a check-in can be reported by others and deleted by its author, after the viewer Modal is gone', () => {
  const src = read('../squad/[id].tsx');
  assert.match(src, /targetKind="checkin"/);
  assert.match(src, /await callerModalGone\(\);\n\s+if \(c\.isSelf\) setDeletingCheckin\(c\);\n\s+else setReportCheckin\(c\);/);
  assert.match(src, /await deleteCheckin\(c\.id\);/);
  assert.match(read('../../data/squad-live.ts'), /from\('squad_checkins'\)\.delete\(\)\.eq\('id', checkinId\)\.eq\('user_id', user\.id\)/);
});
