/**
 * Launch QA B14 / UX-006 — Holt's START IT NOW (program card, race card, plan preview's "Start this plan" — all
 * `handoff.onStart` → `startNow`) skipped "This ends your current program" when the active-program read was slow
 * (>4 s) or failed, and ended the running program for good. It now fails CLOSED: only a read that answered "nothing
 * is running" starts unasked; a running program is asked by name; an unknown is asked without one. The data half is
 * held by `src/data/__tests__/active-program-check.test.mjs`; this holds the sheet's wiring.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../../components/forge/CoachChatSheet.tsx', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const startNow = src.slice(src.indexOf('const startNow = () => {'), src.indexOf('const liveCard'));
const reallyStart = src.slice(src.indexOf('const reallyStart = async () => {'), src.indexOf('return (\n    <View style={styles.wrap}>'));

test('START IT NOW reads with the fail-closed check, never the swallowing race', () => {
  assert.ok(startNow.includes('const check = await checkActiveProgram(ACTIVE_LOOKUP_TIMEOUT_MS);'));
  assert.doesNotMatch(startNow, /fetchActiveProgram\(\)\.catch\(\(\) => null\)/, 'a failure is not "no program"');
  assert.doesNotMatch(startNow, /resolve\(null\), ACTIVE_LOOKUP_TIMEOUT_MS/, 'a timeout is not "no program"');
});

test('unknown asks without a name; running asks by name; only a known-empty read starts', () => {
  const unknown = startNow.indexOf('if (!check.known) {\n        setConfirmEnd({ name: null });\n        return;\n      }');
  const running = startNow.indexOf('if (check.program) {\n        setConfirmEnd({ name: check.program.name });\n        return;\n      }');
  const start = startNow.indexOf('await reallyStart();', startNow.indexOf('checkActiveProgram('));
  assert.ok(unknown > 0, 'an unknown asks');
  assert.ok(running > unknown, 'a running program asks, by name');
  assert.ok(start > running, 'starting comes only after both');
});

test('the program is ended only through reallyStart, reached only from those two places', () => {
  assert.equal(src.match(/reallyStart\(\)/g)?.length, 2, 'startNow (known-empty) and the confirm sheet');
  assert.match(src, /onConfirm=\{\(\) => void reallyStart\(\)\}/);
  for (const call of ['startProgram(', 'startWeekTemplate(']) {
    assert.equal(src.split(call).length - 1, 1, `${call} once`);
    assert.ok(reallyStart.includes(call), `${call} only inside reallyStart`);
  }
});

test('the question is asked even when the check could not answer', () => {
  assert.match(src, /useState<\{ name: string \| null \} \| null>\(null\)/);
  assert.ok(src.includes("confirmEnd && confirmEnd.name == null ? 'This ends any program you’re running' : 'This ends your current program'"));
  assert.ok(src.includes('Couldn’t check your current program just now. If one is running, it will end'));
  assert.ok(src.includes("confirmLabel=\"Start it anyway\""));
});
