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
  for (const p of presses) assert.match(p, /(settled|locked) \? undefined : onChip\(c\)/, `ungated: ${p}`);
  assert.equal((answers.match(/disabled=\{(settled|locked)\}/g) ?? []).length, presses.length);
  // holtai-08: the ONE exception is an Undo chip, which the sheet checks is still the newest change.
  assert.match(answers, /const locked = settled && c\.typedEdit !== 'undo';/);
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
  // The tapped opener names the request first (so "Replace it" can carry it on — QA R2-F8); the typed one inline.
  assert.match(sheet, /const request: ChatState = \{ \.\.\.athleteFacts\(constraints\), \.\.\.opener\.patch \};/);
  assert.match(sheet, /advance\(request, opener\.mode\)/);
  assert.equal((sheet.match(/advance\(\{ \.\.\.athleteFacts\(constraints\), \.\.\.opener\.patch(, \.\.\.\(gear \?\? \{\}\))? \}, opener\.mode\)/g) ?? []).length, 1);
  assert.match(sheet, /advance\(athleteFacts\(constraints\), 'pick'\)/);
  assert.doesNotMatch(sheet, /advance\(\{ \.\.\.constraints, \.\.\.opener\.patch \}/);
});

test('⚠ a race the athlete asked for is built, and the concern is said once with the suggestion as a tap', () => {
  assert.match(sheet, /\.\.\.\(isEnduranceGoal\(c\.goal\) \? \{ buildAnyway: true \} : \{\}\)/);
  assert.match(sheet, /const concern = res\.assembly\.concern;/);
  assert.match(sheet, /label: `Build the \$\{RACE_SPEC\[alt\]\.label\} instead`, patch: \{ goal: alt \}/);
});

test('⚠ QA R2-F8 — a request interrupted by the active-program question is kept for "Replace it"', () => {
  // Each build path that can stop at `guardActiveProgram` puts the request in state FIRST, because the
  // "Replace it" chip continues from `constraints` — a typed build used to come back as "What's the goal?".
  const guarded = [...sheet.matchAll(/const request: ChatState = [^\n]+\n([\s\S]{0,600}?)guardActiveProgram\(\)/g)];
  assert.equal(guarded.length, 3, 'typed sentence, tapped opener, shelf-to-build');
  for (const m of guarded) assert.match(m[1], /setConstraints\(request\);/);
  assert.match(sheet, /if \(chip\.label === 'Replace it'\) \{\s*say\(\{ kind: 'me', text: chip\.label \}\);\s*void advance\(constraints, mode \?\? 'program'\);/);
});

test('⚠ QA F14 — a race concern is said BEFORE the card with the Start button, never after it', () => {
  const at = sheet.indexOf('const concern = res.assembly.concern;');
  assert.ok(at > 0);
  const said = sheet.slice(at, sheet.indexOf('const asm = res.assembly;', at));
  const concernAt = said.indexOf('text: concern.message');
  const cardAt = said.indexOf("{ kind: 'program', card: programCard }");
  assert.ok(concernAt > 0 && cardAt > concernAt, 'the concern line precedes the program card in the same say()');
});
