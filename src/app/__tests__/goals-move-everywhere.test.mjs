/**
 * Launch QA 11-08 — H28 (lift / distance / count / PR goals moved only while the Goals screen was open, and a chapter
 * sealed elsewhere recorded a met goal as "In progress") and H29 (Home read goals, the chapter line and Your Circle
 * once at mount, so a goal set from the Mission tile still said "Set a chapter goal" on the way back).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('H28 — Legacy syncs every auto goal on focus, and the seal syncs before it freezes', () => {
  assert.match(read('../(tabs)/legacy.tsx'), /useBodyGoalSync\('all'\)/);
  const detail = read('../chapter/[id].tsx');
  assert.match(detail, /await syncActiveChapterGoals\('all'\)\.catch\(\(\) => null\);\n\s+await sealChapter\(data\.id\);/);
});

test('H29 — Home re-reads goals, the chapter line and Your Circle on return', () => {
  const home = read('../(tabs)/index.tsx');
  assert.match(home, /refetchChapter\(\); \/\/ a chapter just started or sealed elsewhere/);
  assert.match(home, /refetchCircle\(\);/);
  assert.match(home, /const firstGoalsFocus = useRef\(true\);[\s\S]{0,300}refetchGoals\(\);/);
});
