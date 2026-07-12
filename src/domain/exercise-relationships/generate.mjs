/**
 * generate.mjs — deterministic CLI that (re)builds exercise_relationships.json
 * from the canonical catalog in ./source/.
 *
 * Usage:  node src/domain/exercise-relationships/generate.mjs
 *
 * Output is stable (sorted, fixed key order) so re-running produces a byte-identical
 * file and clean diffs. Every edge is written as editorialStatus "Auto-Generated".
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SOURCE_DIR, loadSources, buildIndex, generateRelationships, projectToArrays, RELATIONSHIP_TYPES,
} from './engine.mjs';

const OUT = join(SOURCE_DIR, '..', 'exercise_relationships.json');

const index = buildIndex(loadSources());
const edges = generateRelationships(index);

// Stable global order: by source id, then rank.
edges.sort((a, b) => (a.sourceExerciseId < b.sourceExerciseId ? -1 : a.sourceExerciseId > b.sourceExerciseId ? 1 : a.rank - b.rank));

writeFileSync(OUT, JSON.stringify(edges, null, 2) + '\n', 'utf8');

// ── Console summary ──────────────────────────────────────────────────────────
const byType = Object.fromEntries(RELATIONSHIP_TYPES.map((t) => [t, 0]));
for (const e of edges) byType[e.type]++;
const perSource = new Map();
for (const e of edges) perSource.set(e.sourceExerciseId, (perSource.get(e.sourceExerciseId) ?? 0) + 1);
const withRels = perSource.size;
const total = index.ids.length;
const avg = edges.length / withRels;

console.log(`Wrote ${edges.length} relationships → ${OUT}`);
console.log(`Exercises in catalog: ${total}`);
console.log(`Exercises with ≥1 relationship: ${withRels}  (zero: ${total - withRels})`);
console.log(`Average relationships per connected exercise: ${avg.toFixed(2)}`);
console.log('By type:', byType);
