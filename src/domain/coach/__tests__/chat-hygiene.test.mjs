/**
 * chat-hygiene.test.mjs — the Holt chat's names and headers say what the code does (AI audit 2026-11-16, C-I7).
 *
 * Run (from the repo root):  node --test --experimental-strip-types src/domain/coach/__tests__/chat-hygiene.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const sheet = readFileSync(path.join(here, '../../../components/forge/CoachChatSheet.tsx'), 'utf8');

test('the coach-author helper no longer shadows the imported askHolt', () => {
  assert.doesNotMatch(sheet, /const askHolt = /);
  assert.equal((sheet.match(/askHolt\(/g) ?? []).length, 1, 'one call — the coach-ask stream');
  assert.match(sheet, /const holtWrites = async \(kind: 'day' \| 'program'/);
  assert.equal((sheet.match(/await holtWrites\(/g) ?? []).length, 2, 'both builds still ask him to write');
});

test('the headers no longer say no model is involved, or that interpret is the only model call', () => {
  assert.doesNotMatch(sheet, /NO MODEL IS INVOLVED/);
  const live = readFileSync(path.join(here, '../../../data/coach-interpret-live.ts'), 'utf8');
  assert.doesNotMatch(live, /THE ONE PLACE THE APP TALKS TO A MODEL/);
  assert.match(live, /every model call goes through an Edge Function that meters it/);
});
