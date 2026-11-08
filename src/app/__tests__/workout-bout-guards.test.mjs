/**
 * Launch QA 11-08 — the ways a walk or run in progress could be thrown away (B3, B4, B7, H24, H27).
 * Source assertions: the bout lives in a tracker hook on a screen no test here renders.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const logger = read('../workout.tsx');
const card = read('../../components/workout/CardioBlockCard.tsx');

test('B4 — the ⋮ row reads a bout under way as work, never "Discard · Nothing logged yet"', () => {
  assert.match(logger, /title=\{hasLoggedWork\(session\) \? 'End workout' : 'Discard workout'\}/);
  assert.match(logger, /setOptionsOpen\(false\);\n\s+if \(blockedByBout\(\)\) return;\n\s+await clearSession\(\);/);
});

test('B7 — ending never saves an empty workout, and never drops a bout still open', () => {
  const body = logger.slice(logger.indexOf('const confirmEnd = () => {'), logger.indexOf('void finishToSeal();', logger.indexOf('const confirmEnd = () => {')));
  assert.match(body, /if \(blockedByBout\(\)\) return;/);
  assert.match(body, /session\.exercises\.find\(\(e\) => e\.boutOpen\)/);
  assert.match(body, /if \(!hasLoggedSet\(session\)\)/);
});

test('H27 — a reopened session re-locks the bout it left running (a treadmill clock never reported itself)', () => {
  assert.equal((logger.match(/setLiveBoutIdx\(openBoutIndex\(resumable\)\)/g) ?? []).length, 2, 'both resume answers');
  assert.match(logger, /s\.exercises\.findIndex\(\(e\) => e\.boutOpen === true\)/);
});

test('B3 — Cancel after End keeps the walk: held for "Log walk", and the exits lock again', () => {
  assert.match(card, /fromBout: logged \? null : bout != null \? 'gps' : timer\.elapsedSec > 0 \? 'clock' : null/);
  assert.match(card, /if \(draft\.fromBout === 'gps'\) setEnded\(draft\);\n\s+if \(draft\.fromBout\) onLiveChange\?\.\(true\);/);
  assert.match(card, /\) : ended \? \(/, 'the held walk replaces Start (which wipes the track)');
  assert.match(card, /setDraft\(ended\);\n\s+setEnded\(null\);/);
});

test('H24 — Outdoor/Treadmill can only be chosen before the bout begins', () => {
  assert.match(card, /OUTDOOR_CAPABLE\[activity\] && !\(tracking \|\| timer\.running \|\| timer\.elapsedSec > 0 \|\| ended \|\| draft\)/);
});
