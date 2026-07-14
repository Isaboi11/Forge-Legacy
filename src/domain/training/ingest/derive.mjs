/*
 * derive.mjs — derive the structured fields the .docx do NOT state
 * (difficulty / structure / per-workout modality + split / theme), each with an
 * explicit rule + confidence. Anything ambiguous is FLAGGED for PO — never guessed.
 *
 * REUSES the Phase-1 muscle bridge (`home-artwork/bridges.ts#splitFromMuscles`) so
 * split derivation here is the same logic the resolver uses.
 *
 * Run:  node src/domain/training/ingest/derive.mjs   (after extract + match)
 * Output: src/domain/training/ingest/out/derivation-report.json
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { splitFromMuscles } from '../../home-artwork/bridges.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const SRC = join(HERE, '..', '..', 'exercise-relationships', 'source');

const muscleRoles = JSON.parse(readFileSync(join(SRC, 'exercise_muscles.json'), 'utf8'));
const primaryByEx = new Map();
for (const r of muscleRoles) {
  if (r.role !== 'Primary') continue;
  (primaryByEx.get(r.exerciseId) || primaryByEx.set(r.exerciseId, []).get(r.exerciseId)).push(r.muscleId);
}
const exMap = JSON.parse(readFileSync(join(OUT, 'exercise-map.json'), 'utf8'));
const unmatched = JSON.parse(readFileSync(join(OUT, 'unmatched-exercises.json'), 'utf8'));
const recommendedKey = new Map(unmatched.map((u) => [u.name, u.recommended]));

/** name → catalogKey: confirmed match, else the recommended (provisional) pick. */
function keyFor(name) {
  if (exMap[name]) return { key: exMap[name].catalogKey, provisional: false };
  const rec = recommendedKey.get(name);
  return { key: rec || null, provisional: !!rec };
}

/** Derive split for one workout from its MAIN exercises' primary muscles (Phase-1 bridge). */
function deriveSplit(workout, structure) {
  const muscles = [];
  let provisional = false;
  let unresolved = 0;
  for (const ex of workout.main) {
    const { key, provisional: prov } = keyFor(ex.name);
    if (!key) { unresolved++; continue; }
    if (prov) provisional = true;
    for (const m of primaryByEx.get(key) || []) muscles.push(m);
  }
  const split = splitFromMuscles(muscles, structure);
  return { split, provisional, unresolved, muscleCount: muscles.length };
}

function difficultyOf(meta) {
  const t = (meta.title || '').toLowerCase();
  const desc = (meta.description || '').toLowerCase();
  if (/foundation i\b|foundation i\(|foundation i /.test(t) && !/foundation ii/.test(t)) {
    return { value: 'Beginner', rule: 'title "Foundation I" + description mentions beginner', confidence: /beginner/.test(desc) ? 0.9 : 0.75 };
  }
  if (/foundation ii/.test(t)) {
    return { value: 'Intermediate', rule: 'title "Foundation II" (builds on I; introduces barbell)', confidence: 0.8 };
  }
  return { value: null, rule: 'could not determine', confidence: 0, flag: 'NEEDS PO' };
}

function themeOf(meta) {
  const t = (meta.title || '').toLowerCase();
  const isII = /foundation ii/.test(t);
  return {
    recommended: isII ? 'strength' : 'beginner',
    rule: isII ? 'Foundation II = past the beginner on-ramp → strength' : 'Foundation I = beginner on-ramp',
    confidence: 0.5,
    flag: 'NEEDS PO CONFIRMATION — theme drives artwork; beginner vs strength',
    alternatives: ['beginner', 'strength'],
  };
}

const report = [];
for (const f of readdirSync(OUT).filter((x) => x.endsWith('.extracted.json'))) {
  const p = JSON.parse(readFileSync(join(OUT, f), 'utf8'));
  if (!p.verified) {
    report.push({ slug: p.slug, verified: false, reasons: p.reasons, note: 'NOT DERIVED — mislabeled/unverifiable source (review gate FLAG 1)' });
    continue;
  }
  const meta = p.meta;
  // Structure: derive each distinct workout's split from block 1, then infer program structure.
  const block1 = p.blocks[0];
  const workouts = (block1?.workouts || []).map((w) => {
    const s = deriveSplit(w, null);
    return { code: w.code, name: w.name, split: s.split, provisionalKeys: s.provisional, unresolvedExercises: s.unresolved };
  });
  const splits = workouts.map((w) => w.split);
  const allFullBody = splits.length > 0 && splits.every((s) => s === 'full_body');
  const structure = {
    value: allFullBody ? 'full_body' : null,
    rule: 'every workout resolves to full_body via the muscle bridge (squat+push+pull+carry/core each day)',
    confidence: allFullBody ? 0.9 : 0.4,
    perWorkoutSplits: splits,
    ...(allFullBody ? {} : { flag: 'NEEDS PO — not every workout resolved to full_body; check perWorkoutSplits' }),
  };
  report.push({
    slug: p.slug,
    verified: true,
    status: meta.status,
    ...(meta.status && !/locked/i.test(meta.status) ? { statusFlag: `Status "${meta.status}" (not LOCKED)` } : {}),
    explicit: {
      name: meta.title,
      family: meta.family,
      durationWeeks: meta.durationWeeks,
      frequencyPerWeek: meta.frequencyPerWeek,
      successor: meta.successor,
      environment: meta.environment,
    },
    derived: {
      difficulty: difficultyOf(meta),
      structure,
      modality: { value: 'strength', rule: 'all main work is resistance training', confidence: 0.95, perWorkout: workouts.map(() => 'strength') },
      split: { perWorkout: workouts, note: 'per-workout split via Phase-1 muscle bridge; provisionalKeys=true means a recommended (unconfirmed) exercise match contributed' },
      theme: themeOf(meta),
    },
  });
}

writeFileSync(join(OUT, 'derivation-report.json'), JSON.stringify(report, null, 2), 'utf8');

// Console summary
for (const r of report) {
  if (!r.verified) { console.log(`\n${r.slug}: ⛔ NOT DERIVED — ${r.reasons?.join('; ')}`); continue; }
  console.log(`\n${r.slug}  ${r.statusFlag ? '(' + r.statusFlag + ')' : ''}`);
  console.log(`  family=${r.explicit.family}  duration=${r.explicit.durationWeeks}w  freq=${r.explicit.frequencyPerWeek}/wk`);
  console.log(`  difficulty=${r.derived.difficulty.value} (${r.derived.difficulty.confidence})`);
  console.log(`  structure=${r.derived.structure.value} (${r.derived.structure.confidence})  perWorkoutSplits=[${r.derived.structure.perWorkoutSplits.join(', ')}]`);
  console.log(`  theme=⚑ recommend ${r.derived.theme.recommended} — ${r.derived.theme.flag}`);
}
