/**
 * program-photo-wiring.test.mjs — the photo importer is actually reachable, and the guard is actually in the path.
 *
 * ══ WHY THIS IS A SOURCE GUARD ══
 *
 * The same shape as `program-gear-gap.test.mjs`: `programGymCoverage` was correct, tested, and called
 * in exactly one place that was not the screen that needed it. Nothing was broken — a function simply
 * was not called — and `tsc`, lint and every domain test passed.
 *
 * This feature has two of those seams, and both fail silently:
 *
 *   1. `readProgramPhoto` exists, is typed, and is never called → the button is not there, or is there
 *      and does nothing. `photo-transcript.test.mjs` stays green throughout.
 *   2. The Edge Function stops importing `sanitizeTranscript` → the tab-only boundary is gone and model
 *      prose reaches the athlete. **Every test in this repo still passes**, because the guard is a pure
 *      module that is still perfectly correct on its own. That is the one worth catching.
 *
 * ⚠ EACH TEST READS ONE NAMED FILE rather than grepping the repo, deliberately — a source guard that
 * searches for a string it must also contain will match itself. `svg-gradient-stops.test.mjs` did
 * exactly that and failed on every run from the day it was committed.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const BUILDER = read('../program-builder.tsx');
const FUNCTION = read('../../../supabase/functions/program-photo-read/index.ts');
const CLIENT = read('../../data/program-photo-live.ts');

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 1. THE BUTTON EXISTS AND IS WIRED
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('the builder imports the photo reader', () => {
  assert.match(BUILDER, /import \{ readProgramPhoto \} from '@\/data\/program-photo-live'/);
  assert.match(BUILDER, /import \{ pickImageFromLibrary \} from '@\/lib\/useMediaPicker'/);
});

test('the builder actually calls it — an import alone renders no button', () => {
  assert.match(BUILDER, /await readProgramPhoto\(uri\)/);
  assert.match(BUILDER, /await pickImageFromLibrary\(\)/);
});

test('a control invokes the handler', () => {
  // The gear-gap defect in reverse: a handler defined and never bound to anything that can be pressed.
  assert.match(BUILDER, /onPress=\{\(\) => void onPickPhoto\(\)\}/);
});

test('⚠ the transcript is fed to the SAME parser a paste goes through', () => {
  // This is the line that keeps the feature inside the locked import principle (§4.3, "No AI
  // interpretation"). If the photo path ever grows its own parse, this fails and it should.
  assert.match(BUILDER, /setPasteText\(r\.tsv\);\s*\n\s*runParse\(r\.tsv\);/);
});

test('every failure kind the client can return is handled by the builder', () => {
  // A `default` that swallows a new kind is how "we couldn't read that" gets shown for an outage.
  for (const kind of ['not_a_program', 'unreadable', 'too_large', 'out_of_credits']) {
    assert.ok(BUILDER.includes(`case '${kind}':`), `builder does not handle '${kind}'`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 2. ⚠ THE BOUNDARY IS IN THE PATH
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('⚠ the Edge Function imports the shared guard, not a copy of it', () => {
  // Relative and extensioned: Deno resolves no `@/` alias, and a second copy of the rule would drift
  // from the one `photo-transcript.test.mjs` proves. Same reasoning as `medical-routing.ts`.
  assert.match(
    FUNCTION,
    /import \{ sanitizeTranscript \} from '\.\.\/\.\.\/\.\.\/src\/domain\/program\/photo-transcript\.ts'/,
  );
});

test('⚠ the Edge Function runs the guard on the model output and refuses when it fails', () => {
  assert.match(FUNCTION, /const clean = sanitizeTranscript\(text\)/);
  assert.match(FUNCTION, /if \(!clean\.ok\)/);
  // The success path must return the SANITISED text. Returning `text` here would leave the guard
  // running, passing, and doing nothing — the most plausible way this breaks.
  assert.match(FUNCTION, /ok: true, tsv: clean\.tsv/);
  assert.ok(!/tsv: text\b/.test(FUNCTION), 'the raw model text is being returned somewhere');
});

test('the model is never asked to interpret — the prompt forbids inventing a value', () => {
  assert.match(FUNCTION, /Never invent a value/);
  assert.match(FUNCTION, /Never correct an exercise name/);
  assert.match(FUNCTION, /Never describe the image/);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 3. THE METER IS IN THE PATH, AND BEFORE THE MODEL
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('⚠ the credit is reserved BEFORE the model call, not after', () => {
  const spend = FUNCTION.indexOf('coach_ai_spend_credits');
  const call = FUNCTION.indexOf('api.anthropic.com');
  assert.ok(spend > 0, 'the function does not meter at all');
  assert.ok(call > 0, 'the function does not call the model');
  assert.ok(spend < call, 'the meter runs after the model — an athlete would be billed then refused');
});

test('usage is recorded with all four token counts', () => {
  // Collapsing these loses the cache signal, which is the single biggest cost lever in the product.
  for (const field of [
    'p_input_tokens',
    'p_output_tokens',
    'p_cache_read_input_tokens',
    'p_cache_creation_input_tokens',
  ]) {
    assert.ok(FUNCTION.includes(field), `usage recording is missing ${field}`);
  }
});

test('⚠ the meter action matches the one migration 0174 registers', () => {
  // `coach_ai_spend_credits` RAISES 22023 on an unknown action, so a typo here is a feature that is
  // dead on arrival in production and perfectly green in every test.
  assert.match(FUNCTION, /const ACTION = 'photo_import'/);
  const migration = read('../../../supabase/migrations/0174_coach_ai_photo_import.sql');
  assert.match(migration, /'photo_import'/);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// 4. NO KEY IN THE BUNDLE
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('⚠ nothing client-side holds an API key or talks to Anthropic directly', () => {
  // Expo inlines `EXPO_PUBLIC_*` into the bundle. A key committed to a repo is a key that is gone.
  for (const [name, source] of [['program-photo-live.ts', CLIENT], ['program-builder.tsx', BUILDER]]) {
    assert.ok(!source.includes('ANTHROPIC_API_KEY'), `${name} references the API key`);
    assert.ok(!source.includes('api.anthropic.com'), `${name} calls Anthropic directly`);
  }
  assert.match(CLIENT, /supabase\.functions\.invoke\('program-photo-read'/);
});
