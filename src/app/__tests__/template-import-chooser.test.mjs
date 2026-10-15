import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/*
 * PO 2026-10-15: "in the templates, when i go to add a template, i should be able to paste text or paste a
 * picture (depending on subscription and functions) in there as well. Just the same as a program. But for a
 * templated day." Source-level, because the screen and the sheet are React route files.
 */
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const TEMPLATES = read('../templates.tsx');
const SHEET = read('../../components/forge/compositions/NewTemplateSheet.tsx');

test('every New on the Templates screen asks the templates cap, then opens the chooser — never the builder directly', () => {
  assert.match(TEMPLATES, /const newTemplate = \(\) => \{\s*if \(!guard\('templates'\)\) return;\s*setNewOpen\(true\);\s*\};/);
  assert.match(TEMPLATES, /<NewTemplateSheet open=\{newOpen\} onClose=\{\(\) => setNewOpen\(false\)\} \/>/);
  assert.doesNotMatch(TEMPLATES, /router\.push\('\/workout-builder'\)/);
  // The `+`, the empty state and the row under the list all go through it.
  assert.equal((TEMPLATES.match(/onPress=\{(newTemplate|onNew)\}/g) ?? []).length, 3);
});

test('the chooser: paste and picture open the template import behind the imports cap; build opens the builder', () => {
  assert.match(
    SHEET,
    /const openImport = \(m: 'paste' \| 'photo'\) => \{\s*onClose\(\);\s*if \(!guard\('imports'\)\) return;\s*router\.push\(\{ pathname: '\/program-import', params: \{ m, for: 'template' \} \}\);/,
  );
  assert.match(SHEET, /title="Paste a workout"[\s\S]{0,200}onPress=\{\(\) => openImport\('paste'\)\}/);
  assert.match(SHEET, /title="Upload a picture"[\s\S]{0,200}onPress=\{\(\) => openImport\('photo'\)\}/);
  assert.match(SHEET, /router\.push\('\/workout-builder'\);/);
  // The caller asked `templates` already — asking again would double-count `cap_attempt`.
  assert.doesNotMatch(SHEET, /guard\('templates'\)/);
});

test('the picture row is Premium AI only, hidden rather than locked, like Build a Program', () => {
  assert.match(SHEET, /const photoOn = PHOTO_IMPORT_LIVE && premiumAi;/);
  assert.match(SHEET, /\{photoOn \? \(\s*<StartOptionRow\s*title="Upload a picture"/);
});
