import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  HOME_EQUIPMENT,
  STARTER_FOCUSES,
  STARTER_LEVELS,
  defaultAudiences,
  filterStarters,
  starterMeta,
  starterSummary,
  suggestedStarters,
} from '../core.ts';
import { HIDDEN_EXERCISE_IDS } from '../../../exercise-picker/catalog-core.ts';
import { activityFromKey, deriveName } from '../../conditioning.ts';

/**
 * THE GUARD THAT STOPS A TYPO REACHING AN ATHLETE AS A LIFT WITH NO DETAIL PAGE.
 *
 * Starter templates are the only content in the app that names catalogue exercises by hand. Everything
 * else picks them — the Exercise Picker, the builders, the program importer all hand back an id that
 * came out of the catalogue in the first place, so they cannot name one that does not exist. These 81
 * definitions can, and a bad key survives tsc, lint and every other test in the repo: it is a string,
 * and it is a perfectly good string.
 *
 * It fails at exactly one moment — an athlete taps something Forge offered them.
 *
 * ── WHY THIS READS THE JSON RATHER THAN IMPORTING `../index.ts` ──────────────────────────────────
 *
 * `index.ts` imports `definitions.json`, and `node --test` rejects a plain JSON import (it wants
 * `with { type: 'json' }`, which is not what Metro is given anywhere else here). So the definitions are
 * read from disk and the PURE rules come from `core.ts` — which is why that split exists. The file read
 * below is the same artefact `index.ts` imports, so nothing is checked in duplicate.
 */

const HERE = path.dirname(fs.realpathSync(new URL(import.meta.url)));
const DEFS = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'definitions.json'), 'utf8'));

const SOURCE = path.join(process.cwd(), 'src/domain/exercise-relationships/source');
const CATALOG = JSON.parse(fs.readFileSync(path.join(SOURCE, 'exercises.json'), 'utf8'));
const BY_ID = new Map(CATALOG.map((e) => [e.id, e]));
const EQUIP_IDS = new Set(JSON.parse(fs.readFileSync(path.join(SOURCE, 'equipment.json'), 'utf8')).map((e) => e.id));

const isCardio = (e) => e.kind === 'cardio' || String(e.catalogKey ?? '').startsWith('cardio:');
const strengthRows = DEFS.flatMap((t) => t.exercises.filter((e) => !isCardio(e)).map((e) => [t, e]));
const cardioRows = DEFS.flatMap((t) => t.exercises.filter(isCardio).map((e) => [t, e]));

// ── the catalogue contract ──────────────────────────────────────────────────

test('every catalogKey resolves in the real exercise catalogue', () => {
  const missing = strengthRows.filter(([, e]) => !BY_ID.has(e.catalogKey)).map(([t, e]) => `${t.id} → ${e.catalogKey}`);
  assert.deepEqual(missing, [], `these keys are not in exercises.json: ${missing.join(', ')}`);
});

test('no starter names an exercise the picker hides', () => {
  // Offering a lift the athlete then cannot find, substitute or favourite would be a dead end the
  // moment they tried to change it.
  const hidden = strengthRows.filter(([, e]) => HIDDEN_EXERCISE_IDS.has(e.catalogKey)).map(([t, e]) => `${t.id} → ${e.catalogKey}`);
  assert.deepEqual(hidden, [], `hidden exercises cannot be prescribed: ${hidden.join(', ')}`);
});

test('the displayed name matches the catalogue name', () => {
  // The name is snapshotted into the athlete's row on adopt, so a drifted label becomes permanent on
  // their template rather than being corrected by the next read.
  const wrong = [];
  for (const [, e] of strengthRows) {
    const real = BY_ID.get(e.catalogKey);
    if (real && real.name !== e.name) wrong.push(`${e.catalogKey}: "${e.name}" vs "${real.name}"`);
  }
  assert.deepEqual(wrong, [], `names have drifted from the catalogue: ${wrong.join(', ')}`);
});

// ── the prescription contract ───────────────────────────────────────────────

test('sets and reps are positive whole numbers', () => {
  for (const t of DEFS) {
    for (const e of t.exercises) {
      assert.ok(Number.isInteger(e.sets) && e.sets > 0, `${t.id} → ${e.catalogKey} has sets=${e.sets}`);
      assert.ok(Number.isInteger(e.targetReps) && e.targetReps > 0, `${t.id} → ${e.catalogKey} has reps=${e.targetReps}`);
    }
  }
});

test('NO STRENGTH ROW IS A DISGUISED TIMED HOLD', () => {
  /* THE TRAP THIS EXISTS FOR. `schemeText` renders a cooldown row with reps >= 30 as SECONDS — "2 × 30s"
     — so a 45-second plank looks authorable as `targetReps: 45`. That convention lives ONLY on the
     preview surfaces (the starter preview, W-27, program share). `workout.tsx` renders `{targetReps} Reps`
     flat, so the athlete who actually starts the session is asked for forty-five planks.

     A template cannot express a hold. `TemplateExercise` has `targetReps` and, for cardio blocks only,
     `targetMi`/`targetDurationSec`. The session model does have `targetSec` — carrying it through
     `TemplateExercise` is what would have to change before a hold could ship here. */
  const holds = strengthRows
    .filter(([, e]) => e.targetReps >= 30)
    .map(([t, e]) => `${t.id} → ${e.catalogKey} (${e.targetReps})`);
  assert.deepEqual(holds, [], `these read as seconds on the preview and as REPS in the logger: ${holds.join(', ')}`);
});

test('every row carries a real section, and every template has main work', () => {
  for (const t of DEFS) {
    for (const e of t.exercises) {
      assert.ok(['warmup', 'main', 'cooldown'].includes(e.section), `${t.id} → ${e.catalogKey} section=${e.section}`);
    }
    assert.ok(t.exercises.some((e) => e.section === 'main'), `${t.id} has no main work`);
  }
});

test('no template prescribes the same exercise twice', () => {
  for (const t of DEFS) {
    const keys = t.exercises.map((e) => e.catalogKey);
    assert.equal(new Set(keys).size, keys.length, `${t.id} repeats an exercise`);
  }
});

test('every session is a session — between 5 and 8 movements', () => {
  // The 75 authored in the grid are 6–8. `leg-day` and `full-body-express` are the design's own and
  // ship at 5, which is why the floor is 5 rather than 6.
  for (const t of DEFS) {
    assert.ok(t.exercises.length >= 5 && t.exercises.length <= 8, `${t.id} has ${t.exercises.length} movements`);
  }
});

// ── cardio finishers ────────────────────────────────────────────────────────

test('a cardio row is one the logger can actually rebuild', () => {
  for (const [t, e] of cardioRows) {
    const at = `${t.id} → ${e.catalogKey}`;
    assert.equal(e.kind, 'cardio', `${at} has a cardio key without kind:'cardio'`);
    const act = activityFromKey(e.catalogKey);
    /* `workout.tsx` rebuilds the block with `if (e.kind === 'cardio' && act)`. An unparseable key falls
       through to the strength branch and becomes sets-of-a-run — the exact trap HIDDEN_EXERCISE_IDS
       was written to close. */
    assert.ok(act, `${at} does not parse to a cardio activity`);
    assert.ok(['outdoor', 'indoor'].includes(e.modality), `${at} modality=${e.modality}`);
    assert.equal(e.name, deriveName(act, e.modality), `${at} name is not what deriveName produces`);
    /* `cardioExercise` reads targetMi and NOT targetDurationSec, so a duration target would be stored
       here, carried into the athlete's row on adopt, and silently dropped on the way into the session. */
    assert.ok(typeof e.targetMi === 'number' && e.targetMi > 0, `${at} needs a positive targetMi`);
    assert.equal(e.targetDurationSec ?? null, null, `${at} sets a duration the logger will drop`);
    assert.equal(e.section, 'cooldown', `${at} must be a cool-down block`);
    assert.equal(t.exercises.indexOf(e), t.exercises.length - 1, `${at} must be the last row`);
  }
});

test('at most one cardio block per template', () => {
  for (const t of DEFS) {
    const n = t.exercises.filter(isCardio).length;
    assert.ok(n <= 1, `${t.id} has ${n} cardio blocks`);
  }
});

// ── the grid ────────────────────────────────────────────────────────────────

test('every field is in range', () => {
  const focuses = new Set(STARTER_FOCUSES.map((f) => f.key));
  for (const t of DEFS) {
    assert.ok(STARTER_LEVELS.includes(t.level), `${t.id} level=${t.level}`);
    assert.ok(focuses.has(t.focus), `${t.id} focus=${t.focus}`);
    assert.ok(['gym', 'home'].includes(t.venue), `${t.id} venue=${t.venue}`);
    assert.ok(['men', 'women', 'all'].includes(t.audience), `${t.id} audience=${t.audience}`);
  }
});

test('a home template needs nothing an athlete has to leave the house for', () => {
  /* The one rule a reader cannot check by eye, and the one that makes `venue` mean anything. Note this
     is NARROWER than equipment.json's "Home Gym" environment, which includes the barbell — see
     HOME_EQUIPMENT's comment in core.ts. */
  const illegal = [];
  for (const t of DEFS.filter((d) => d.venue === 'home')) {
    for (const e of t.exercises) {
      if (isCardio(e)) {
        // A machine erg is not a home option however the row is tagged.
        if (e.catalogKey === 'cardio:row' || (e.catalogKey === 'cardio:bike' && e.modality === 'indoor'))
          illegal.push(`${t.id} → ${e.catalogKey} (${e.modality})`);
        continue;
      }
      const rec = BY_ID.get(e.catalogKey);
      if (rec && !HOME_EQUIPMENT.has(rec.equipmentId)) illegal.push(`${t.id} → ${e.catalogKey} needs ${rec.equipmentId}`);
    }
  }
  assert.deepEqual(illegal, [], `home templates cannot need gym equipment: ${illegal.join(', ')}`);
});

test('HOME_EQUIPMENT names real equipment ids', () => {
  // Guards against a typo quietly making the home rule stricter than intended.
  for (const id of HOME_EQUIPMENT) assert.ok(EQUIP_IDS.has(id), `${id} is not an equipment id`);
});

test('the grid is complete — no missing venue/level cell', () => {
  /* 7 focuses × 2 venues × 3 levels for women, the same minus glutes for men. A gap here is a filter
     combination that returns an empty screen. */
  const want = [
    ['men', ['push', 'pull', 'legs', 'arms', 'chest-triceps', 'back-biceps']],
    ['women', ['push', 'pull', 'legs', 'arms', 'chest-triceps', 'back-biceps', 'glutes']],
  ];
  const missing = [];
  for (const [audience, focuses] of want) {
    for (const focus of focuses) {
      for (const venue of ['gym', 'home']) {
        for (const level of STARTER_LEVELS) {
          if (!DEFS.some((t) => t.audience === audience && t.focus === focus && t.venue === venue && t.level === level))
            missing.push(`${audience}/${focus}/${venue}/${level}`);
        }
      }
    }
  }
  assert.deepEqual(missing, [], `empty cells: ${missing.join(', ')}`);
});

test('ids are unique and stable-looking', () => {
  const ids = DEFS.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length, 'two starters share an id — they would collide on adopt');
  for (const id of ids) {
    // The id becomes `source_definition_id`, is written into athlete rows, and is what the partial
    // unique index dedupes on. It must never be prettified after the fact.
    assert.match(id, /^[a-z0-9-]+$/, `${id} is not a stable slug`);
  }
});

test('the six original ids still exist — they are live source_definition_ids', () => {
  /* Athletes have adopted these. Renumbering one orphans their copy's provenance and lets the shelf
     offer them a template they already took. Renaming is fine and three of them were renamed; the id
     is the part that cannot move. */
  for (const id of ['push-day', 'pull-day', 'leg-day', 'full-body-express', 'upper-body', 'lower-body']) {
    assert.ok(DEFS.some((t) => t.id === id), `${id} has gone missing`);
  }
});

test('every template has a name and a blurb, and no two share either', () => {
  const names = new Map();
  const blurbs = new Map();
  for (const t of DEFS) {
    assert.ok(t.name.trim().length > 0 && t.name.length <= 60, `${t.id} name is unusable`);
    assert.ok(t.blurb.trim().length > 0, `${t.id} has no blurb — the shelf card would be blank`);
    // Two identically-named templates are indistinguishable once adopted, since the name is all the
    // athlete's own list shows.
    assert.ok(!names.has(t.name), `${t.id} and ${names.get(t.name)} share the name "${t.name}"`);
    names.set(t.name, t.id);
    const b = t.blurb.trim().toLowerCase();
    assert.ok(!blurbs.has(b), `${t.id} and ${blurbs.get(b)} share a blurb`);
    blurbs.set(b, t.id);
  }
});

// ── the selection rules ─────────────────────────────────────────────────────

test('an unspecified sex is never coerced to male', () => {
  // The profile model's standing rule. Here it means seeing the whole library rather than half of it.
  assert.deepEqual([...defaultAudiences('male')], ['men', 'all']);
  assert.deepEqual([...defaultAudiences('female')], ['women', 'all']);
  assert.deepEqual([...defaultAudiences('unspecified')], ['men', 'women', 'all']);
  assert.deepEqual([...defaultAudiences(null)], ['men', 'women', 'all']);
});

test('filterStarters narrows on each axis and on adoption', () => {
  const home = filterStarters(DEFS, { venue: 'home' });
  assert.ok(home.length > 0 && home.every((t) => t.venue === 'home'));
  const womensGlutes = filterStarters(DEFS, { audiences: ['women'], focus: 'glutes' });
  assert.equal(womensGlutes.length, 6, 'women’s glutes should be 2 venues × 3 levels');
  const excluded = filterStarters(DEFS, { focus: 'glutes', exclude: new Set([womensGlutes[0].id]) });
  assert.equal(excluded.length, 5);
});

test('the shelf sample is one per focus, and never offers what you already took', () => {
  const picked = suggestedStarters(DEFS, 'female', new Set(), 4);
  assert.equal(picked.length, 4);
  assert.equal(new Set(picked.map((t) => t.focus)).size, 4, 'the sample repeated a focus');
  assert.ok(picked.every((t) => t.audience === 'women' || t.audience === 'all'));

  const first = picked[0];
  const after = suggestedStarters(DEFS, 'female', new Set([first.id]), 4);
  assert.ok(!after.some((t) => t.id === first.id), 'an adopted starter was offered again');
});

test('the shelf sample is stable between visits', () => {
  // No shuffling: a shelf that rearranges itself makes the athlete re-read it every time.
  const a = suggestedStarters(DEFS, 'male', new Set(), 4).map((t) => t.id);
  const b = suggestedStarters(DEFS, 'male', new Set(), 4).map((t) => t.id);
  assert.deepEqual(a, b);
});

test('summary and meta read the way the adopted card does', () => {
  assert.equal(starterSummary({ exercises: [{ sets: 1 }] }), '1 lift · 1 set');
  assert.equal(starterSummary({ exercises: [{ sets: 3 }, { sets: 4 }] }), '2 lifts · 7 sets');
  assert.equal(starterMeta({ venue: 'home', level: 'Advanced' }), 'Home · Advanced');
  assert.equal(starterMeta({ venue: 'gym', level: 'Beginner' }), 'Gym · Beginner');
});
