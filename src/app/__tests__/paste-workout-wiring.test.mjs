import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * PO 2026-09-27: "Should we have a spot when you start a workout to paste the day that you want on the Home
 * Screen after clicking start workout?" — "Yes". Home → Start a Workout → Paste a workout → the import screen's
 * `today` mode → Start workout. Source-level, because the screens are route files.
 */
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const HOME = read('../(tabs)/index.tsx');
const IMPORT = read('../program-import.tsx');
const BUILDER = read('../workout-builder.tsx');

test('Home offers "Import a workout", behind the imports cap, opening the today mode', () => {
  assert.match(HOME, /title="Import a workout"/);
  assert.match(HOME, /if \(!guardImport\('imports'\)\) return;\s*router\.push\(\{ pathname: '\/program-import', params: \{ for: 'today', m: 'paste' \} \}\);/);
});

test('today mode STARTS the workout as a one-off, from the rows the builder would save', () => {
  /* …unless the paste held a week and the athlete chose "Make it a program" (PO 2026-10-06). */
  assert.match(IMPORT, /const isToday = forWhat === 'today' && !asProgram;/);
  assert.match(IMPORT, /const rows = toTemplateExercises\(w\.draft\);/);
  assert.match(IMPORT, /await writeWorkoutLaunch\(\{ exercises: rows, workoutName: name \}\);\s*[\s\S]{0,120}router\.replace\('\/workout'\);/);
  assert.match(IMPORT, /\{isToday \? 'Start workout' :/);
});

test('a week pasted as one workout is offered as a program — every day it read, past the programs cap', () => {
  assert.match(IMPORT, /const offer = isTemplate && preview && whole \? moreThanOneWorkout\(whole\) : null;/);
  assert.match(IMPORT, /if \(!whole \|\| !guard\('programs'\)\) return;\s*setAsProgram\(true\);\s*setScopeNote\(null\);\s*setPreview\(whole\);/);
  assert.match(IMPORT, /const fit = fitToScope\(weeks, scope\);\s*setWhole\(weeks\);/);
});

test('a template is saved ONLY when the box is ticked, and only past the templates cap', () => {
  assert.match(IMPORT, /const \[saveToo, setSaveToo\] = useState\(false\);/);
  assert.match(IMPORT, /if \(saveToo\) \{\s*if \(!guard\('templates'\)\) return;\s*try \{\s*await saveTemplate\(name, rows\);/);
});

test('one conversion, shared: the builder and the paste import both use workout-template-rows', () => {
  assert.match(BUILDER, /import \{ prescriptionOfRow, toTemplateExercises \} from '@\/lib\/workout-template-rows';/);
  assert.doesNotMatch(BUILDER, /function toTemplateExercises\(/);
});

test('G2 (MA8-D6) — a pasted DAY spends the one free import once it exists, at every day door', () => {
  // Today: the workout started from the paste.
  assert.match(IMPORT, /router\.replace\('\/workout'\);\s*\/\*[\s\S]{0,260}\*\/\s*void markFreeImportUsed\(\)\.catch\(\(\) => \{\}\);/);
  // Template (Create New, New Template, Holt's photo read): the builder is told the draft came from a paste…
  assert.match(IMPORT, /router\.replace\(\{ pathname: '\/workout-builder', params: \{ o: 'imported' \} \}\);/);
  assert.match(BUILDER, /const \[fromImport, setFromImport\] = useState\(params\.o === 'imported'\);/);
  // …as is its own paste sheet, and a create spends it — never an edit, never a back-out.
  assert.match(BUILDER, /main: \[\.\.\.d\.main, \.\.\.items\],\s*\}\)\);\s*setFromImport\(true\);/);
  assert.match(BUILDER, /if \(fromImport && \(forLater \|\| !draft\.editId\)\) void markFreeImportUsed\(\)\.catch\(\(\) => \{\}\);/);
  assert.equal(BUILDER.match(/spendImport\(\);/g)?.length, 3, 'start now, plan for later, and a template save');
});
