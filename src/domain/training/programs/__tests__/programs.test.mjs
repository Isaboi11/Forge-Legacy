/**
 * programs.test.mjs — validates the generated ProgramDefinition JSON against the
 * authoritative catalog + the schema enums. This is the conversion's acceptance gate:
 * no dangling catalogKeys, all enums in range, structure honestly omitted where the
 * program isn't single-structure, and no fabricated data.
 *
 * Run:  node --test src/domain/training/programs/__tests__/programs.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { MODALITIES, SPLITS, PROGRAM_THEMES, PROGRAM_FAMILIES, PROGRAM_STRUCTURES } from '../../schema.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROGRAMS = join(HERE, '..');
const CATALOG = join(HERE, '..', '..', '..', 'exercise-relationships', 'source', 'exercises.json');
const catalogIds = new Set(JSON.parse(readFileSync(CATALOG, 'utf8')).map((e) => e.id));

const load = (f) => JSON.parse(readFileSync(join(PROGRAMS, f), 'utf8'));
const i3 = load('strength-foundation-i-3day.json');
const ii4 = load('strength-foundation-ii-4day.json');
const all = [i3, ii4];
const UNITS = new Set(['reps', 'seconds', 'minutes', 'yards']);

test('exactly the two PO-approved LOCKED programs are generated', () => {
  assert.equal(i3.id, 'strength-foundation-i-3day');
  assert.equal(ii4.id, 'strength-foundation-ii-4day');
  for (const p of all) assert.match(p.status, /LOCKED/i);
});

test('program-level enums are in range', () => {
  for (const p of all) {
    assert.ok(PROGRAM_FAMILIES.includes(p.family), `family: ${p.family}`);
    assert.ok(PROGRAM_THEMES.includes(p.theme), `theme: ${p.theme}`);
    if (p.structure !== undefined) assert.ok(PROGRAM_STRUCTURES.includes(p.structure), `structure: ${p.structure}`);
    assert.ok(p.durationWeeks > 0 && p.frequencyPerWeek > 0);
    assert.ok(Array.isArray(p.goals) && p.goals.length > 0);
    assert.ok(p.sourceFile && p.source === 'forge');
  }
});

test('PO decisions are reflected: themes + 4-day structure omitted', () => {
  assert.equal(i3.theme, 'beginner');
  assert.equal(i3.structure, 'full_body');
  assert.equal(ii4.theme, 'strength');
  assert.equal(ii4.structure, undefined); // per-workout split only (Workout B is an upper day)
});

test('every block/workout is well-formed with in-range modality + split', () => {
  for (const p of all) {
    assert.ok(p.blocks.length > 0, `${p.id} has blocks`);
    for (const b of p.blocks) {
      assert.ok(b.weekStart > 0 && b.weekEnd >= b.weekStart, `${p.id} ${b.label} week range`);
      assert.ok(b.workouts.length > 0, `${p.id} ${b.label} has workouts`);
      for (const w of b.workouts) {
        assert.ok(MODALITIES.includes(w.modality), `${p.id} ${w.code} modality ${w.modality}`);
        assert.ok(SPLITS.includes(w.split), `${p.id} ${w.code} split ${w.split}`);
        assert.ok(w.main.length > 0, `${p.id} ${w.code} has main work`);
      }
    }
  }
});

test('every main-work catalogKey (and substitution) resolves to the real catalog — no dangling keys', () => {
  for (const p of all) {
    for (const b of p.blocks) {
      for (const w of b.workouts) {
        for (const ex of w.main) {
          assert.ok(catalogIds.has(ex.catalogKey), `${p.id} dangling catalogKey: ${ex.catalogKey} (${ex.displayName})`);
          assert.ok(ex.sets > 0 && ex.reps > 0, `${p.id} ${ex.displayName} sets/reps`);
          assert.ok(UNITS.has(ex.unit), `${p.id} ${ex.displayName} unit ${ex.unit}`);
          if (ex.substitution?.catalogKey) {
            assert.ok(catalogIds.has(ex.substitution.catalogKey), `${p.id} dangling substitution key: ${ex.substitution.catalogKey}`);
          }
        }
      }
    }
  }
});

test('4-day program surfaces the upper accessory day (honest per-workout split)', () => {
  const splits = new Set(ii4.blocks[0].workouts.map((w) => w.split));
  assert.ok(splits.has('upper'), 'expected an upper-focused workout in II-4day');
  assert.ok(splits.has('full_body'), 'expected full-body workouts in II-4day');
});

test('warm-ups are preserved as freeform prep (not catalog-linked)', () => {
  const w = i3.blocks[0].workouts[0];
  assert.ok(Array.isArray(w.warmup) && w.warmup.length > 0);
  for (const item of w.warmup) assert.ok(item.text && !('catalogKey' in item));
});
