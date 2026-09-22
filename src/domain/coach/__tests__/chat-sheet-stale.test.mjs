/**
 * chat-sheet-stale.test.mjs — the three chat-sheet defects the 2026-09-21 stress test found, held in place.
 *
 *   1. Every earlier set of answer chips stayed tappable forever and silently re-ran `advance`.
 *   2. Every card's Start/Save acted on `built` — the LAST build — so an older card started a newer one.
 *   3. A new request carried the previous request's answers (a marathon goal leaking into "train today").
 *
 * The sheet is a 4,000-line component with no render harness, so these read its source, the way the
 * schedule-wiring and superset-open tests do. Each assertion names the mechanism, not a line number.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/chat-sheet-stale.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const sheet = readFileSync(path.join(here, '../../../components/forge/CoachChatSheet.tsx'), 'utf8');

const fn = (name) => {
  const start = sheet.indexOf(`function ${name}(`);
  assert.ok(start > 0, `${name} not found`);
  return sheet.slice(start, sheet.indexOf('\nfunction ', start + 10));
};

test('⚠ an answered question cannot be re-tapped, in every control shape', () => {
  const answers = fn('Answers');
  assert.match(answers, /const settled = answer != null;/);
  const presses = answers.match(/onPress=\{\(\) => [^\n]*onChip\(c\)\)?\}/g) ?? [];
  assert.ok(presses.length >= 5, 'every shape draws a pressable');
  for (const p of presses) assert.match(p, /settled \? undefined : onChip\(c\)/, `ungated: ${p}`);
  assert.equal((answers.match(/disabled=\{settled\}/g) ?? []).length, presses.length);
});

test('⚠ only the newest card has buttons; older ones say so instead of acting on another build', () => {
  assert.match(sheet, /const liveCard: Turn \| null = built/);
  assert.equal((sheet.match(/retired=\{handoff\.liveCard !== turn\}/g) ?? []).length, 2, 'program AND day cards');
  const actions = fn('ArtifactActions');
  assert.match(actions, /if \(retired\) \{\s*return <Text/);
});

test('⚠ a new request starts from the athlete, not from the last request', () => {
  assert.match(sheet, /const athleteFacts = \(c: ChatState\): ChatState =>/);
  // Both doors — the tapped opener and the typed one — and the shelf.
  assert.equal((sheet.match(/advance\(\{ \.\.\.athleteFacts\(constraints\), \.\.\.opener\.patch \}, opener\.mode\)/g) ?? []).length, 2);
  assert.match(sheet, /advance\(athleteFacts\(constraints\), 'pick'\)/);
  assert.doesNotMatch(sheet, /advance\(\{ \.\.\.constraints, \.\.\.opener\.patch \}/);
});
