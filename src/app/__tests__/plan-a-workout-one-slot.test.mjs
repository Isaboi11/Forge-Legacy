// PO 2026-11-11: Brady "built Push Day A and B, Pull Day A and B, Leg Day A and B" and they were gone. He had built
// them through Home's "Build for later", on a screen titled "Build a Template" — but that door saves a ONE-OFF plan
// into a single slot (`planned_workouts`, primary key = athlete, 0136). Each "Save for later" silently replaced the
// last; training one consumed it. These pin the three things that make that door honest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8').split('\r').join('');
const wb = read('app/workout-builder.tsx');

test('Home\'s one-off door is titled for what it makes — not "Build a Template"', () => {
  assert.match(wb, /const title = forLater \? 'Plan a Workout' : draft\?\.editId \? 'Edit Template' : 'Build a Template';/);
  // Both AppBars (loading and loaded) read the one title — the loading one used to be hard-coded.
  assert.equal((wb.match(/<AppBar title=\{title\}/g) ?? []).length, 2);
  assert.doesNotMatch(wb, /<AppBar title="Build a Template"/);
});

test('"Save for later" asks before replacing the workout already waiting on Home', () => {
  const fn = wb.slice(wb.indexOf('const onSaveForLater = async'), wb.indexOf('const title = forLater'));
  assert.ok(fn.length > 0, 'onSaveForLater exists');
  assert.match(fn, /fetchPlannedWorkout\(\)/, 'reads the slot first');
  assert.match(fn, /if \(waiting\) setReplacing\(waiting\.name\);\s*else void save\(false\);/);
  // The footer link goes through the check, never straight to save(false).
  assert.match(wb, /onPress=\{\(\) => void onSaveForLater\(\)\}/);
  // The sheet offers keeping both FIRST, then replacing.
  const sheet = wb.slice(wb.indexOf('<BottomSheet open={replacing != null}'), wb.indexOf('<ConfirmSheet'));
  assert.ok(sheet.indexOf('Save to My Templates') > 0 && sheet.indexOf('Save to My Templates') < sheet.indexOf('Replace It'));
});

test('"Save to my templates" on the one-off door files a NEW template and checks the cap', () => {
  assert.match(wb, /if \(forLater && keep === 'template' && !guard\('templates'\)\) return;/);
  assert.match(wb, /if \(forLater && keep === 'plan'\) \{/);
  // Never an UPDATE of some template the draft once edited — a one-off becomes a new row.
  assert.match(wb, /saveTemplate\(name, toTemplateExercises\(draft\), forLater \? null : draft\.editId\)/);
});
