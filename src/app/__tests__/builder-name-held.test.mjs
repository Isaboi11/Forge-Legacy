// PO 2026-10-08 (iPhone): building a program, on the day screen with the sets and reps, "I click on the title
// … it lets me type one letter then the keyboard is gone, and then it does it over and over." The Program
// name field on Setup — same field, same scroller — kept its keyboard, so the difference was everything else
// a letter re-drew: the day's title and every exercise card. The name is now held by its own field while it
// is typed (`HeldText`) and handed to the draft when the field lets go, so a letter re-draws only the field.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(import.meta.dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8').split('\r').join('');

test('the day name and the template name are held by their field, not written to the draft per letter', () => {
  const pb = read('app/program-builder.tsx');
  const day = pb.slice(pb.indexOf('function DayBuilder('), pb.indexOf('function ExerciseCard('));
  assert.match(day, /<HeldText value=\{day\.name\} onCommit=\{onName\} handle=\{nameField\}>/);
  assert.match(day, /value=\{f\.text\}\s+onChange=\{f\.onChange\}\s+onBlur=\{f\.onBlur\}/);
  assert.doesNotMatch(day, /onChange=\{onName\}/, 'typing straight into the draft re-draws the whole day');

  const wb = read('app/workout-builder.tsx');
  assert.match(wb, /<HeldText value=\{draft\.name\}/);
  assert.doesNotMatch(wb, /onChangeText=\{\(v\) => mutate\(\(d\) => \(\{ \.\.\.d, name: v \}\)\)\}/);
});

test('leaving or opening anything on the day hands the held name over first', () => {
  const pb = read('app/program-builder.tsx');
  const day = pb.slice(pb.indexOf('function DayBuilder('), pb.indexOf('function ExerciseCard('));
  for (const h of ['onBack', 'onNext', 'onUseTemplate']) {
    assert.doesNotMatch(day, new RegExp(`onPress=\\{${h}\\}`), `${h} must go through withName`);
  }
  assert.doesNotMatch(day, /onBack=\{onBack\}/);
  assert.match(day, /withName\(\(\) => onAdd\(sec\.key\)\)/);
  assert.match(day, /withName\(\(\) => onAddCardio\(sec\.key\)\)/);
});

test('both builders mutate functionally, so a handed-over name and the next change compose', () => {
  for (const rel of ['app/program-builder.tsx', 'app/workout-builder.tsx']) {
    const src = read(rel);
    const body = src.slice(src.indexOf('const mutate = '), src.indexOf('};', src.indexOf('const mutate = ')));
    assert.match(body, /setDraft\(\(d\) =>/, `${rel}: mutate must be setDraft((d) => …)`);
  }
});

test('the template builder saves and checks for changes with the name as typed', () => {
  const wb = read('app/workout-builder.tsx');
  assert.match(wb, /const name = typedName\(\)\.trim\(\)/);
  assert.match(wb, /workoutDraftIsDirty\(\{ \.\.\.draft, name: typedName\(\) \}\)/);
});

test('HeldText: nothing held commits nothing, and InputField chains a caller onBlur', () => {
  const held = read('components/HeldText.tsx');
  assert.match(held, /if \(held == null\) return;\s+setHeld\(null\);\s+if \(held !== value\) onCommit\(held\);/);
  const field = read('components/forge/composites/InputField/InputField.tsx');
  assert.match(field, /setFocus\(false\)\s+onBlur\?\.\(e\)/);
});
