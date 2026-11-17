import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { formResultFrom } from '../../domain/coach/form-check-view.ts';

/*
 * EVERY NON-CHAT AI SURFACE SHOWS THE SAME FAILED STATE (AI Road to 10 Sprint 1 — PL-3 / UX-1, audit P-G1 / P-G3).
 *
 * The behaviour of each data module is proven in `src/data/__tests__/ai-calls-live.test.mjs`; form check's module
 * reaches native video code the harness cannot load, so it — and every screen — is pinned by source here:
 *   · no AI data module calls `supabase.functions.invoke` itself — every one goes through `invokeAi` (the §3 clock,
 *     the failure body read once, `no_consent` to the sheet) and reports with `reportAiCall`;
 *   · every surface that draws a failure adds "Not charged." when the server refunded (`withNotCharged(…, r.refunded)`);
 *   · every screen that can close mid-call hands the call a signal that aborts on close.
 */

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');

const MODULES = {
  'src/data/coach-author-live.ts': 'coach-author',
  'src/data/coach-interpret-live.ts': 'coach-interpret',
  'src/data/coach-kitchen-live.ts': 'coach-kitchen',
  'src/data/form-check-live.ts': 'coach-form-check',
  'src/data/meal-photo-live.ts': 'meal-photo-read',
  'src/data/program-photo-live.ts': 'program-photo-read',
  'src/data/recipe-photo-live.ts': 'recipe-photo-read',
  'src/data/recipe-link-live.ts': 'recipe-link-read',
  'src/data/workout-card-read-live.ts': 'workout-card-read',
  'src/data/workout-tidy-live.ts': 'workout-tidy',
  'src/data/crm-live.ts': 'bug-plain',
};

test('every non-chat AI data module calls its function through invokeAi, and reports its failures', () => {
  for (const [file, fn] of Object.entries(MODULES)) {
    const src = read(file);
    assert.match(src, new RegExp(`invokeAi\\(\\s*'${fn}'`), `${file} → invokeAi('${fn}')`);
    assert.doesNotMatch(src, new RegExp(`functions\\.invoke\\('${fn}'`), `${file} must not bypass the clock`);
    assert.match(src, /reportAiCall\(/, `${file} reports failures`);
    assert.match(src, /signal\?: AbortSignal/, `${file} takes the screen's signal`);
  }
});

test('the wrapper passes the contract timeout AND the signal to functions-js, and races both', () => {
  const src = read('src/lib/ai-invoke.ts');
  assert.match(src, /const wall = Math\.min\(opts\.timeoutMs \?\? AI_APP_TIMEOUT_MS\[fn\], AI_APP_TIMEOUT_MS\[fn\]\);/);
  assert.match(src, /supabase\.functions\.invoke\(fn, \{ body: body as Record<string, unknown>, timeout: wall, signal: ctl\.signal \}\)/);
  assert.match(src, /return await Promise\.race\(\[work, stopped\]\);/);
  // `no_consent`: reported, the sheet, one more try.
  assert.match(src, /if \(!serverSaysNoConsent\(first\)\) return first;\n\s*\/\*[^*]*\*\/\n\s*reportAiFailure\(aiFailureOf\(first\)\);\n\s*if \(opts\.signal\?\.aborted \|\| !\(await reaskConsent\('ai_sharing'\)\)\) return first;\n\s*return callOnce\(fn, body, opts\);/);
});

test('every module that consents turns the server’s no_consent into NO_AI_CONSENT — the screen’s own consent state', () => {
  for (const [file] of Object.entries(MODULES)) {
    if (/recipe-link|crm-live/.test(file)) continue; // no model, or an admin tool: no athlete consent asked
    const src = read(file);
    assert.match(src, /serverSaysNoConsent\(/, file);
    assert.match(src, /NO_AI_CONSENT/, file);
  }
});

/** Each surface, and the failure lines in it that must carry "Not charged." when refunded. */
const SURFACES = [
  ['src/app/meal-photo.tsx', [/withNotCharged\(mealPhotoError\(r\), r\.refunded\)/]],
  ['src/app/my-recipes.tsx', [/withNotCharged\(recipePhotoError\(r\), r\.refunded\)/]],
  ['src/app/program-import.tsx', [/withNotCharged\(photoError\(r, i \+ 1, photos\.length\), r\.refunded\)/]],
  [
    'src/components/forge/ImportSpreadsheetSheet.tsx',
    [/const refunded = r\.kind !== 'ok' && r\.kind !== 'unparsed' && r\.kind !== 'no_consent' && !!r\.refunded;/, /const failed = \(line: string\) => setImportError\(withNotCharged\(line, refunded\)\);/],
  ],
  ['src/app/workout-write.tsx', [/'Couldn’t reach AI just now\. Try again in a moment, or fix the lines below by hand\.',\n\s*r\.refunded,\n\s*\)\);/, /'Couldn’t read that photo\. Try a closer, straighter shot — or type it in\.',\n\s*r\.refunded,\n\s*\)\);/]],
  ['src/app/meal-plan.tsx', [/failure = withNotCharged\(kitchenError\(r\), r\.refunded\)/]],
  ['src/app/form-check.tsx', [/withNotCharged\('That broke on my end\. Try again in a moment\.', res\.refunded\)/, /<Text style=\{s\.foot\}>\{NOT_CHARGED\}<\/Text>/]],
  [
    'src/components/forge/CoachChatSheet.tsx',
    [
      /holt\.fellBack = withNotCharged\(authorFallbackLine\(a\), a\.refunded\)/,
      /'The connection dropped before I heard back\.',\n\s*r\.refunded,\n\s*\),/,
      /text: withNotCharged\(kitchenError\(r\), r\.refunded\) \}, \{ kind: 'chips'/,
      /if \(r\.kind !== 'ok'\) return void say\(\{ kind: 'holt', text: withNotCharged\(kitchenError\(r\), r\.refunded\) \}\);/,
      /if \(r\.kind !== 'ok'\) return void say\(\{ kind: 'holt', text: withNotCharged\(attachErrorLine\(kind, r\.kind\), r\.refunded\) \}\);/,
    ],
  ],
];

test('refunded → "Not charged." on every non-chat AI surface', () => {
  for (const [file, lines] of SURFACES) {
    const src = read(file);
    for (const line of lines) assert.match(src, line, `${file}: ${line}`);
  }
  // The chat's two photo doors (a recipe, a program / workout) both say it.
  assert.equal((read('src/components/forge/CoachChatSheet.tsx').match(/withNotCharged\(attachErrorLine\(kind, r\.kind\), r\.refunded\)/g) ?? []).length, 2);
});

test('form check promises "Not charged." only when it is true — the old `charged: false` or the new `refunded: true`', () => {
  assert.deepEqual(formResultFrom({ ok: false, reason: 'unreadable', charged: false }), { kind: 'unreadable', charged: false });
  assert.deepEqual(formResultFrom({ ok: false, reason: 'unreadable', refunded: true }), { kind: 'unreadable', charged: false });
  assert.deepEqual(formResultFrom({ ok: false, reason: 'unreadable' }), { kind: 'unreadable', charged: true }, 'a function that does not say did charge');
  // `unavailable` no longer says "Nothing was charged." on its own: after the app's 90 s the server may have spent it.
  assert.doesNotMatch(read('src/app/form-check.tsx'), /Nothing was charged/);
});

/** Every screen that can close mid-call, and the call it hands its close signal to. */
const CLOSERS = [
  ['src/app/meal-photo.tsx', /readMealPhoto\(asset\.uri, closeSignal\(\)\)/],
  ['src/app/my-recipes.tsx', /readRecipePhoto\(uri, closeSignal\(\)\)/],
  ['src/app/my-recipes.tsx', /readRecipeLink\(pasteText, closeSignal\(\)\)/],
  ['src/app/program-import.tsx', /readImportPhoto\(uri, \(n\) => resolveExerciseName\(n\)\?\.key, closeSignal\(\)\)/],
  ['src/app/workout-write.tsx', /tidyWrittenWorkout\(card, resolveKey, closeSignal\(\)\)/],
  ['src/app/workout-write.tsx', /readWorkoutCard\(picked\[0\], closeSignal\(\)\)/],
  ['src/app/meal-plan.tsx', /askKitchenLive\(\{[^}]*\}, signal\)/],
  ['src/app/form-check.tsx', /pose: got\.pose\?\.facts \}, closeSignal\(\)\)/],
  ['src/components/forge/CoachChatSheet.tsx', /readRecipePhoto\(uri, closeSignal\(\)\)/],
  ['src/components/forge/CoachChatSheet.tsx', /readImportPhoto\(uri, \(n\) => resolveExerciseName\(n\)\?\.key, closeSignal\(\)\)/],
  ['src/components/forge/CoachChatSheet.tsx', /await loadNotes\(\), closeSignal\(\)\)/],
  ['src/components/forge/CoachChatSheet.tsx', /beside,\n\s*\}, closeSignal\(\)\);/],
  ['src/components/forge/CoachChatSheet.tsx', /minor: rules\.minor,\n\s*\}, closeSignal\(\)\);/],
  ['src/components/forge/ImportSpreadsheetSheet.tsx', /readImportPhoto\(uri, \(n\) => resolveExerciseName\(n\)\?\.key, ctl\.signal\)/],
];

test('every screen that can close mid-call aborts the call on close', () => {
  for (const [file, line] of CLOSERS) assert.match(read(file), line, `${file}: ${line}`);
  for (const file of new Set(CLOSERS.map(([f]) => f))) {
    if (file.endsWith('ImportSpreadsheetSheet.tsx')) continue;
    assert.match(read(file), /const closeSignal = useCloseSignal\(\);/, file);
  }
  // The sheet stays mounted when it closes, so its close aborts the read itself.
  assert.match(read('src/components/forge/ImportSpreadsheetSheet.tsx'), /gen\.current \+= 1;\n\s*reader\.current\?\.abort\(\);/);
  // One controller per call, every live one aborted on unmount.
  assert.match(read('src/lib/useCloseSignal.ts'), /return \(\) => \{\n\s*for \(const c of calls\) c\.abort\(\);/);
});
