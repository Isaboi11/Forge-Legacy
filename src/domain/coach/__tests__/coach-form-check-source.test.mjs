import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildCoachFormCheckDeploy, DEPLOY_COPY } from '../../../../scripts/build-coach-form-check-deploy.mjs';

/*
 * SOURCE TESTS for supabase/functions/coach-form-check/index.ts — it runs in Deno against a live API and a
 * live meter, neither of which `node --test` can reach. So these read the source and pin the properties
 * that make it safe, cheap and legal: the medical guard runs BEFORE a credit is reserved and before the
 * model is called, the output is capped at CA-D5's 900, the system block is a single cached constant with
 * nothing interpolated, the frames go in the user turn in order, usage is recorded with all four counts,
 * and the code guard — not the prompt — is the last thing between the model and the screen.
 *
 * Same shape as `coach-ask-source.test.mjs`.
 */
const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('supabase/functions/coach-form-check/index.ts');
const LIVE = read('src/data/form-check-live.ts');
const DOMAIN = read('src/domain/coach/form-check.ts');

const at = (needle) => {
  const i = SRC.indexOf(needle);
  assert.ok(i >= 0, `expected to find: ${needle}`);
  return i;
};

const system = () => SRC.slice(SRC.indexOf('const SYSTEM = `'), SRC.indexOf('`;', SRC.indexOf('const SYSTEM = `')));

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ⛔ The order that makes it legal and cheap
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('guard → frames → credit → model, in that order', () => {
  const guard = at('const guarded = guardRoute(');
  const frames = at('const frames = capFrames(body.frames)');
  const spend = at("rpc('coach_ai_spend_credits', { p_action: FORM_ACTION })");
  const model = at("fetch('https://api.anthropic.com/v1/messages'");
  assert.ok(guard < frames, 'a note about pain must not even be size-checked first');
  assert.ok(frames < spend, 'unusable frames must not cost a credit');
  assert.ok(spend < model, 'the credit is reserved before the model call');
});

test('a guarded request returns a route and spends nothing', () => {
  assert.match(SRC, /if \(guarded\) return json\(\{ route: guarded \}\);/);
  // Nothing between the guard and its return: no RPC, no fetch, no logging of the note.
  const between = SRC.slice(at('const guarded = guardRoute('), at('if (guarded) return json({ route: guarded });'));
  assert.ok(!/rpc\(|fetch\(/.test(between), 'nothing may happen between classifying and stopping');
  assert.match(SRC, /import \{ medicalRoute, mentionsDiscomfort \} from '\.\.\/\.\.\/\.\.\/src\/domain\/coach\/medical-routing\.ts';/);
});

test('the lift AND the note are both classified, as one piece of text', () => {
  assert.match(SRC, /const said = `\$\{lift\}\\n\$\{note\}`;/);
  assert.match(SRC, /guardRoute\(said\)/);
  // The note reaches the model only in the user turn, and only after the guard.
  assert.ok(at('guardRoute(') < at('The athlete says:'));
});

test('crisis, urgent and care keep their own routes — medical_stop is the catch-all', () => {
  assert.match(SRC, /if \(r === 'crisis' \|\| r === 'urgent' \|\| r === 'care'\) return r;/);
  assert.match(SRC, /return 'medical_stop';/);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Cost
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('the output is capped at CA-D5’s 900, from the shared module', () => {
  assert.match(SRC, /max_tokens: FORM_OUTPUT_CAP,/);
  assert.ok(!/max_tokens: \d/.test(SRC), 'the cap is never a literal in the function');
  assert.match(DOMAIN, /export const FORM_OUTPUT_CAP = 900;/);
});

test('no thinking, low effort — as coach-interpret and program-photo-read', () => {
  assert.match(SRC, /thinking: \{ type: 'disabled' \},/);
  assert.match(SRC, /output_config: \{ effort: 'low' \},/);
  assert.match(SRC, /const MODEL = 'claude-sonnet-5';/);
});

test('the system block is ONE cached constant with nothing interpolated into it', () => {
  assert.match(SRC, /system: \[\{ type: 'text', text: SYSTEM, cache_control: \{ type: 'ephemeral' \} \}\]/);
  const s = system();
  assert.ok(!s.includes('${'), 'SYSTEM must not interpolate anything — it is the cache key');
  // Sonnet 5 caches a 1024+ token prefix; ~4 characters a token, with margin.
  assert.ok(s.length > 5000, `SYSTEM is ${s.length} chars — too short to cache`);
  // Nothing per-request is anywhere near it.
  for (const leak of ['lift', 'note', 'Frame ']) {
    assert.ok(!s.includes(`${leak}:`), `${leak} belongs in the user turn, not the cached block`);
  }
});

test('the frames go in the user turn, in order, each labelled with its position', () => {
  assert.match(SRC, /text: `Frame \$\{i \+ 1\} of \$\{frames\.length\}:`/);
  assert.match(SRC, /type: 'image', source: \{ type: 'base64', media_type: MEDIA_TYPE, data \}/);
  assert.match(SRC, /messages: \[\{ role: 'user', content \}\]/);
  assert.ok(SRC.includes('They are in time order.'), 'the model is told the order is information');
});

test('usage is recorded with all four token counts, on success and on failure', () => {
  for (const p of [
    'p_input_tokens: usage.input_tokens',
    'p_output_tokens: usage.output_tokens',
    'p_cache_read_input_tokens: usage.cache_read_input_tokens',
    'p_cache_creation_input_tokens: usage.cache_creation_input_tokens',
  ]) {
    assert.ok(SRC.includes(p), p);
  }
  assert.equal(SRC.match(/coach_ai_record_usage/g).length, 2, 'the failed attempt is recorded too');
  assert.match(SRC, /p_uncharged: true,/);
  assert.match(SRC, /p_uncharged: false,/);
});

test('the meter’s weight lives in SQL, never in the function', () => {
  assert.match(SRC, /p_action: FORM_ACTION/);
  assert.match(DOMAIN, /export const FORM_ACTION = 'form_check';/);
  // MA3-D16: no credit number anywhere in either file.
  assert.ok(!/credits?\s*[:=]\s*\d/i.test(SRC), 'a credit count must never be a constant in src/');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ⛔ The prompt's legal rules, and the code that does not trust them
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('the prompt carries every rule the PO’s instruction binds this feature to', () => {
  const s = system();
  for (const rule of [
    'Never diagnose anything',
    'Never mention pain',
    'Never refer them anywhere',
    'Never say a lift is safe',
    'Never comment on their body',
    'Never give a number for a load or a max',
    'Never guess at what you cannot see',
    'At most TWO things to fix, the biggest first',
    '# When the frames do not show the lift',
    'Reply with a single JSON object and nothing else',
  ]) assert.ok(s.includes(rule), `missing from SYSTEM: ${rule}`);
  // …and the technique list it IS allowed to talk about.
  for (const topic of ['Bar path', 'Brace and torso', 'Depth and range', 'Joint timing', 'Tempo and control']) {
    assert.ok(s.includes(topic), `missing topic: ${topic}`);
  }
  // Holt's voice, so a form check sounds like the same coach as the chat (HV-D7).
  assert.ok(s.includes('The coach you hired'));
  assert.ok(s.includes('Banned: emoji'));
});

test('the LAST thing before the answer is the code guard, not the prompt', () => {
  const guard = at('const read = parseFormRead(text, lift);');
  const answer = at('return json({ ok: true, read, remaining: reserved.remaining });');
  assert.ok(guard < answer);
  // Nothing between them but the refusal.
  const between = SRC.slice(guard, answer).trim();
  assert.match(between, /^const read = parseFormRead\(text, lift\);\n\s*if \(!read\) return json\(\{ ok: false, reason: 'unreadable'/);
  // The model's own text never reaches the response by any other route.
  assert.equal(SRC.match(/\btext\b/g).filter(Boolean).length > 0, true);
  assert.ok(!/read: text|read: payload/.test(SRC), 'the raw model text is never the answer');
  assert.match(SRC, /import \{[\s\S]*?parseFormRead,[\s\S]*?\} from '\.\.\/\.\.\/\.\.\/src\/domain\/coach\/form-check\.ts';/);
});

test('the lift echoed back comes from the REQUEST, not from the model', () => {
  assert.match(SRC, /parseFormRead\(text, lift\)/);
  assert.match(DOMAIN, /export function sanitizeFormRead\(raw: unknown, lift\?: string\)/);
});

test('a model refusal reads as an unreadable clip, not as an app failure', () => {
  assert.match(SRC, /if \(payload\?\.stop_reason === 'refusal'\)[\s\S]{0,120}reason: 'unreadable'/);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The app half
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('the app holds no key and calls only the Edge Function', () => {
  // The word "Anthropic" appears in a comment explaining why the key is NOT here, so this looks for the
  // things that would actually be a leak: the secret's name, the auth header, and the upstream URL.
  assert.ok(!/ANTHROPIC_API_KEY|x-api-key|api\.anthropic\.com/i.test(LIVE), 'no key, no direct model call from the app');
  assert.match(LIVE, /functions\.invoke\('coach-form-check'/);
});

test('the native module is OPTIONAL, so an older binary hides the feature rather than crashing', () => {
  assert.match(LIVE, /requireOptionalNativeModule<NativeThumbnails>\('ExpoVideoThumbnails'\)/);
  assert.ok(!/from 'expo-video-thumbnails'/.test(LIVE), 'importing the package would throw on an old build');
  assert.match(LIVE, /export function formCheckAvailable\(\): boolean \{\n\s*return thumbnails != null;/);
});

test('the app reuses the ONE camera-or-library path and never touches ImagePicker itself', () => {
  assert.ok(!/from 'expo-image-picker'/.test(LIVE.replace(/import type[^;]+;/g, '')), 'types only');
  assert.match(LIVE, /export async function pickFormVideo\(pick: MediaPick\)/);
  assert.match(LIVE, /videoMaxDuration: FORM_CLIP_SECONDS/);
});

test('a non-2xx from the function is never reported as "offline"', () => {
  assert.match(LIVE, /ctx instanceof Response/);
  assert.match(LIVE, /return \{ kind: 'unavailable' \};/);
  assert.match(LIVE, /return \{ kind: 'offline' \};/);
});

test('the app re-runs the guard on whatever came back', () => {
  assert.match(LIVE, /return formResultFrom\(body, cleanLift\);/);
  assert.match(DOMAIN, /const read = sanitizeFormRead\(d\.read, lift\);/);
});

test('every cap the app applies comes from the shared module, not from a literal', () => {
  for (const name of ['FORM_CLIP_SECONDS', 'FORM_FRAME_MAX_EDGE', 'FORM_FRAME_COMPRESS', 'FORM_LIFT_CHARS', 'FORM_NOTE_CHARS']) {
    assert.ok(LIVE.includes(name), `${name} should be imported, not re-stated`);
  }
  assert.match(LIVE, /capFrames\(out\) \?\? \[\]/, 'a short set is refused before the round trip');
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// The paste copy
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('the dashboard paste copy is current, and carries both guards', () => {
  const committed = read(DEPLOY_COPY);
  assert.equal(committed, buildCoachFormCheckDeploy(), 'run `node scripts/build-coach-form-check-deploy.mjs`');
  assert.ok(!committed.includes("from '../../../src/"), 'the paste copy cannot import from src/');
  // Both guards really are in the paste, not only in the repo.
  assert.ok(committed.includes('export function medicalRoute'));
  assert.ok(committed.includes('export function sanitizeFormRead'));
  assert.ok(committed.includes('Never comment on their body'), 'the prompt survives the comment strip');
  // Comments are stripped (see compact-deploy.mjs) so the dashboard editor does not truncate the paste.
  assert.ok(committed.length < 40_000, `paste is ${committed.length} chars — the editor cuts off near 40 KB`);
});

test('the domain module has no imports, which is what lets it be inlined at all', () => {
  assert.ok(!/^import /m.test(DOMAIN), 'an import here breaks the paste-copy generator and `node --test`');
});

test("⛔ the guard uses the BROAD discomfort list, before the credit", () => {
  // The narrow route lets "my knee hurts, swap it" through for the chat; a video of a body must not be
  // read against it (PO 2026-09-22). Live that day: it reached the model and spent credits.
  assert.match(SRC, /mentionsDiscomfort\(said\)/);
  const guardAt = SRC.indexOf("mentionsDiscomfort(said)");
  const creditAt = SRC.indexOf(".rpc('coach_ai_spend_credits'");
  assert.ok(guardAt > 0 && creditAt > guardAt, "the guard must run before the credit is reserved");
});
