/*
 * generate.mjs — emit ProgramDefinition JSON for the PO-approved LOCKED programs only.
 *
 * Applies the PO's review-gate decisions:
 *  - Only LOCKED + verified programs (I-3day, II-4day). I-4day is DRAFT → HELD. II-3day
 *    is the mislabeled Research file → EXCLUDED.
 *  - theme: I-3day → beginner; II-4day → strength.
 *  - structure: I-3day → full_body (cleanly all full-body); II-4day → OMITTED (per-workout
 *    split only, because Workout B is an upper/accessory day).
 *  - exercise mapping: 17 auto-matched + 10 PO-confirmed recommendations (all validated to
 *    exist in exercises.json — a dangling key aborts generation rather than being written).
 *  - Warm-ups preserved as freeform (non-catalog).
 *
 * Reuses the Phase-1 muscle bridge for per-workout split. Non-destructive.
 * Run:  node src/domain/training/ingest/generate.mjs   (after extract + match)
 * Output: src/domain/training/programs/*.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { splitFromMuscles } from '../../home-artwork/bridges.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const SRC = join(HERE, '..', '..', 'exercise-relationships', 'source');
const PROGRAMS_DIR = join(HERE, '..', 'programs');

// ── PO decisions: which locked programs to generate + confirmed theme/structure ──
const DECISIONS = {
  'strength-foundation-i-3day': { theme: 'beginner', structure: 'full_body' },
  'strength-foundation-ii-4day': { theme: 'strength', structure: undefined }, // omit (per-workout split)
};

// ── Confirmed exercise map (17 matched + 10 PO-confirmed recommendations) ──
const catalog = JSON.parse(readFileSync(join(SRC, 'exercises.json'), 'utf8'));
const catalogIds = new Set(catalog.map((e) => e.id));
const primaryByEx = new Map();
for (const r of JSON.parse(readFileSync(join(SRC, 'exercise_muscles.json'), 'utf8'))) {
  if (r.role !== 'Primary') continue;
  (primaryByEx.get(r.exerciseId) || primaryByEx.set(r.exerciseId, []).get(r.exerciseId)).push(r.muscleId);
}
const matched = JSON.parse(readFileSync(join(OUT, 'exercise-map.json'), 'utf8'));
const unmatched = JSON.parse(readFileSync(join(OUT, 'unmatched-exercises.json'), 'utf8'));
const confirmedKey = new Map();
for (const [n, v] of Object.entries(matched)) confirmedKey.set(n, v.catalogKey);
for (const u of unmatched) confirmedKey.set(u.name, u.recommended);

// Guard: every confirmed key must exist (PO check C). A dangling key aborts.
for (const [name, key] of confirmedKey) {
  if (!key || !catalogIds.has(key)) throw new Error(`Dangling catalogKey for "${name}" → ${key} — aborting (never write a dangling key)`);
}

function keyFor(name) {
  const k = confirmedKey.get(name);
  if (!k) throw new Error(`No confirmed catalogKey for "${name}" — aborting`);
  return k;
}

function prescription(ex) {
  const catalogKey = keyFor(ex.name);
  const out = {
    catalogKey,
    displayName: ex.name,
    sets: ex.sets,
    reps: ex.reps,
    unit: ex.unit || 'reps',
  };
  if (ex.repsMax != null) out.repsMax = ex.repsMax;
  if (ex.per) out.per = ex.per;
  if (ex.restSec != null) out.restSec = ex.restSec;
  if (ex.intensity) out.intensity = true;
  if (ex.substitution) {
    out.substitution = {
      catalogKey: confirmedKey.get(ex.substitution.name) || undefined,
      name: ex.substitution.name,
      sets: ex.substitution.sets,
      reps: ex.substitution.reps,
      unit: ex.substitution.unit || 'reps',
    };
  }
  return out;
}

function workoutSplit(mainPrescriptions) {
  const muscles = [];
  for (const p of mainPrescriptions) for (const m of primaryByEx.get(p.catalogKey) || []) muscles.push(m);
  return splitFromMuscles(muscles, null); // structure null: these programs have no upper/lower labels
}

function blockRange(label) {
  const m = label.match(/(\d+)\s*[–\-]\s*(\d+)/);
  return m ? { weekStart: +m[1], weekEnd: +m[2] } : { weekStart: null, weekEnd: null };
}

mkdirSync(PROGRAMS_DIR, { recursive: true });
const generated = [];

for (const [slug, decision] of Object.entries(DECISIONS)) {
  const p = JSON.parse(readFileSync(join(OUT, `${slug}.extracted.json`), 'utf8'));
  if (!p.verified) throw new Error(`${slug} is not verified — refusing to generate`);
  if (!/locked/i.test(p.meta.status || '')) throw new Error(`${slug} status is "${p.meta.status}", not LOCKED — refusing to generate`);

  const blocks = p.blocks.map((b) => {
    const range = blockRange(b.label);
    return {
      label: b.label,
      weekStart: range.weekStart,
      weekEnd: range.weekEnd,
      workouts: b.workouts.map((w) => {
        const main = w.main.map(prescription);
        return {
          code: w.code,
          name: w.name,
          modality: 'strength',
          split: workoutSplit(main),
          warmup: w.warmup || [],
          main,
        };
      }),
    };
  });

  const def = {
    id: slug,
    name: p.meta.title,
    family: p.meta.family,
    difficulty: slug.includes('-ii-') ? 'Intermediate' : 'Beginner',
    durationWeeks: p.meta.durationWeeks,
    frequencyPerWeek: p.meta.frequencyPerWeek,
    environment: p.meta.environment || undefined,
    description: p.meta.description || undefined,
    goals: p.meta.goals || [],
    successorName: p.meta.successor || null,
    theme: decision.theme,
    ...(decision.structure ? { structure: decision.structure } : {}),
    blocks,
    status: p.meta.status,
    source: 'forge',
    sourceFile: p.sourceFile,
  };

  writeFileSync(join(PROGRAMS_DIR, `${slug}.json`), JSON.stringify(def, null, 2) + '\n', 'utf8');
  const mainCount = blocks.reduce((n, b) => n + b.workouts.reduce((k, w) => k + w.main.length, 0), 0);
  const splits = [...new Set(blocks[0].workouts.map((w) => w.split))];
  generated.push({ slug, name: def.name, theme: def.theme, structure: def.structure ?? '(omitted)', blocks: blocks.length, workoutsPerBlock: blocks[0].workouts.length, mainPrescriptions: mainCount, block1Splits: splits });
}

writeFileSync(join(OUT, 'generated-summary.json'), JSON.stringify(generated, null, 2), 'utf8');
console.log('GENERATED (locked, PO-approved) → src/domain/training/programs/:');
console.log(JSON.stringify(generated, null, 2));
console.log('\nHELD: strength-foundation-i-4day (DRAFT).  EXCLUDED: strength-foundation-ii-3day (mislabeled research file).');
