import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Exercise Detail offers alternatives from the relationship graph, and drops any whose target isn't in
 * the catalog (it couldn't be opened). These guard that the drop is a safety net, not load-bearing — if
 * the graph and the catalog drift apart, "Alternatives" would quietly thin out with nothing failing.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DOMAIN = join(HERE, '..', '..');
const load = (p) => JSON.parse(readFileSync(join(DOMAIN, p), 'utf8'));

const exercises = load('exercise-relationships/source/exercises.json');
const relationships = load('exercise-relationships/exercise_relationships.json');
const coaching = load('exercise-coaching/content/coaching_content.json');

const catalogIds = new Set(exercises.map((e) => e.id));

test('every relationship points at exercises that exist in the catalog', () => {
  const danglingSource = relationships.filter((r) => !catalogIds.has(r.sourceExerciseId));
  const danglingTarget = relationships.filter((r) => !catalogIds.has(r.targetExerciseId));
  assert.deepEqual(danglingSource.slice(0, 5).map((r) => r.sourceExerciseId), []);
  assert.deepEqual(
    danglingTarget.slice(0, 5).map((r) => r.targetExerciseId),
    [],
    'a dangling target would be silently dropped from the Alternatives list',
  );
});

test('most of the catalog can offer at least one alternative', () => {
  const withAlts = new Set(relationships.map((r) => r.sourceExerciseId));
  const covered = exercises.filter((e) => withAlts.has(e.id)).length;
  const pct = Math.round((covered / exercises.length) * 100);
  assert.ok(pct >= 60, `only ${pct}% of exercises have any relationship — Alternatives would be mostly empty`);
});

test('coaching records key off real catalog ids', () => {
  const dangling = coaching.filter((c) => !catalogIds.has(c.exerciseId));
  assert.deepEqual(dangling.slice(0, 5).map((c) => c.exerciseId), [], 'coaching content must resolve to an exercise');
});

/**
 * Publishing is gated on coaching being UNIQUE to its exercise. 449 of 556 records share their body
 * with another exercise, because generation templates by movement pattern — which is how Barbell
 * Step-Up got squat coaching at confidence 100. These guard the gate, not the count.
 */
/**
 * Publication policy is COVERAGE: generic, repeated coaching is accepted so every exercise carries
 * something. The single hard exclusion is `block` severity — Olympic lifts, advanced gymnastics and
 * strongman implements, where the generator's own output is bland enough to be dangerous (atlas-stone-lift
 * scores 18 and reads "move under control through the full range"). Those need a specialist.
 */
test('no expert-review movement is ever published', () => {
  const leaked = coaching.filter(
    (c) => c.contentStatus === 'Published' && (c.reviewFlags ?? []).some((f) => f && f.severity === 'block'),
  );
  assert.deepEqual(
    leaked.map((c) => c.exerciseId),
    [],
    'an Olympic lift / gymnastics skill / strongman implement reached the UI with generated coaching',
  );
});

test('published coaching carries a human attestation', () => {
  const published = coaching.filter((c) => c.contentStatus === 'Published');
  assert.ok(published.length > 500, 'expected broad coverage');
  for (const c of published) {
    assert.ok(c.approvedBy, `${c.exerciseId} published with no approver — Publish is a human-only transition`);
    assert.ok(c.approvedAt, `${c.exerciseId} published with no approval timestamp`);
  }
});

test('every published record actually has coaching in it', () => {
  for (const c of coaching.filter((x) => x.contentStatus === 'Published')) {
    assert.ok(c.whyItMatters, `${c.exerciseId} published with no "why"`);
    assert.ok(c.executionSteps.length >= 3, `${c.exerciseId} published with ${c.executionSteps.length} execution steps`);
    assert.ok(c.coachingTips.length >= 3, `${c.exerciseId} published with ${c.coachingTips.length} cues`);
    assert.ok(c.commonMistakes.length >= 3, `${c.exerciseId} published with ${c.commonMistakes.length} mistakes`);
  }
});
