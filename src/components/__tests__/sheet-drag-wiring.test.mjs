/**
 * sheet-drag-wiring.test.mjs — every grabber the app draws has the gesture it depicts.
 *
 * PO (2026-08-28): *"The line at the top in the middle is an indicator that you can drag that page down
 * and gone. But the only way to get out right now is with the x. This is happening everywhere in the
 * app."* Three days after `useSheetDrag` shipped on the composite. Two things were true: Holt's session
 * sheet rolls its own overlay and was never wired, and the composite's grab area was a 22px strip above
 * the title — present, and unfindable.
 *
 * A source guard, because a gesture is invisible to tsc and `node --test` cannot drag. Each assertion is
 * the line that makes a handle real.
 *
 * Run:  node --test src/components/__tests__/sheet-drag-wiring.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const COMPOSITE = read('../forge/composites/BottomSheet/BottomSheet.tsx');
const HOLT = read('../forge/SessionCoachSheet.tsx');
const WORKOUT = read('../../app/workout.tsx');

test('the composite pans from the handle AND the title, as one target', () => {
  const s = strip(COMPOSITE);
  assert.match(s, /useSheetDrag\(\{ onClose, dismissible \}\)/);
  assert.match(s, /<View style=\{styles\.grabArea\} hitSlop=\{[^}]+\}\} \{\.\.\.drag\.panHandlers\}>/, 'the grab area lost the pan or its slop');
  // Both the handle and the title live INSIDE the grab area — the title is what a thumb lands on.
  const area = s.slice(s.indexOf('styles.grabArea'), s.indexOf('{scroll ? ('));
  assert.match(area, /styles\.handle\b/, 'the handle is no longer inside the grab area');
  assert.match(area, /styles\.title/, 'the title is no longer inside the grab area');
});

test("⚠ Holt's session sheet drags too — the same hook, on the grabber and the header", () => {
  const s = strip(HOLT);
  assert.match(s, /const drag = useSheetDrag\(\{ onClose \}\);/, 'SessionCoachSheet does not use the shared drag');
  assert.match(s, /<Animated\.View onLayout=\{drag\.onLayout\} style=\{\[styles\.sheet, drag\.style\]\}>/, 'the sheet does not translate with the drag');
  assert.match(s, /<View \{\.\.\.drag\.panHandlers\}>\s*<View style=\{styles\.grabWrap\}>/, 'the pan is not on the grabber + header wrapper');
  // The body is a ScrollView and must stay OUT of the pan, or the sheet dismisses when the athlete scrolls.
  const panned = s.slice(s.indexOf('{...drag.panHandlers}'), s.indexOf('<ScrollView style={styles.thread}'));
  assert.ok(panned.length > 0 && !panned.includes('ScrollView'), 'the pan wrapper must close before the scrolling body');
});

test('the ⋮ menu keeps to the session; Holt keeps the plan — no row is in both', () => {
  // Between the menu's title and the "Trained with" row, none of Holt's five plan actions may appear.
  const s = strip(WORKOUT);
  const start = s.indexOf('<Text style={styles.pickerTitle}>Workout Options</Text>');
  const end = s.indexOf('title="Trained with"', start);
  assert.ok(start > 0 && end > start, 'the Workout Options sheet moved');
  const menu = s.slice(start, end);
  for (const dup of ['title="Add an exercise"', 'title="Swap this exercise"', 'title="Skip this exercise"', 'Superset with next exercise', 'Break the superset']) {
    assert.ok(!menu.includes(dup), `the ⋮ menu repeats Holt: ${dup}`);
  }
  // …and Holt still carries them, so nothing was lost.
  const holt = strip(HOLT);
  for (const row of ['label="Add a movement"', 'label="Move past this"', 'label="Something else…"', 'label="Stop pairing these"', 'label="Short on time"']) {
    assert.ok(holt.includes(row), `Holt's sheet lost ${row}`);
  }
});
