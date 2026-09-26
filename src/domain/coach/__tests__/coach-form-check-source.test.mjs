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
const VIEW = read('src/domain/coach/form-check-view.ts');
const FRAMES = read('src/lib/video-frames.ts');
const SCREEN = read('src/app/form-check.tsx');

const at = (needle) => {
  const i = SRC.indexOf(needle);
  assert.ok(i >= 0, `expected to find: ${needle}`);
  return i;
};

const system = () => SRC.slice(SRC.indexOf('const SYSTEM = `'), SRC.indexOf('`;', SRC.indexOf('const SYSTEM = `')));

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// ⛔ The order that makes it legal and cheap
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('guard → frames → QUOTE → model → SPEND, in that order', () => {
  const guard = at('const guarded = guardRoute(');
  const frames = at('const frames = capFrames(body.frames)');
  const quote = at("rpc('coach_ai_quote', { p_action: FORM_ACTION })");
  const model = at("fetch('https://api.anthropic.com/v1/messages'");
  const parse = at('parseFormRead(text, lift, frames.length, sizes)');
  const spend = at("rpc('coach_ai_spend_credits', { p_action: FORM_ACTION })");
  assert.ok(guard < frames, 'a note about pain must not even be size-checked first');
  assert.ok(frames < quote, 'unusable frames must not even be quoted');
  assert.ok(quote < model, 'an athlete who could not pay is refused before the model call');
  assert.ok(model < parse && parse < spend, 'the credit is spent only after the guard has a read');
});

test('⭐ "Not charged." is true: only a readable read spends (design 06a, Plan §9.3)', () => {
  // The spend sits inside `if (read)` and nowhere else.
  assert.match(SRC, /if \(read\) \{\n\s*const \{ data \} = await supabase\.rpc\('coach_ai_spend_credits', \{ p_action: FORM_ACTION \}\)\.maybeSingle\(\);/);
  assert.equal(SRC.match(/rpc\('coach_ai_spend_credits'/g).length, 1, 'exactly one spend, the guarded one');
  assert.match(SRC, /if \(!read\) return json\(\{ ok: false, reason: 'unreadable', remaining: quote\.remaining, charged: false \}\);/);
  // A refused quote answers out_of_credits before anything is sent upstream.
  assert.match(SRC, /if \(!quote\?\.allowed\) \{\n\s*return json\(\{\n\s*ok: false,\n\s*reason: 'out_of_credits',/);
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
  assert.match(SRC, /text: frameLabel\(i, frames\.length, times\?\.\[i\], sizes\?\.\[i\]\)/);
  assert.match(SRC, /const sizes = capFrameSizes\(body\.sizes, frames\.length\);/);
  assert.match(SRC, /const times = capFrameTimes\(body\.times, frames\.length\);/);
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
  assert.equal(SRC.match(/coach_ai_record_usage/g).length, 2, 'the upstream failure is recorded too');
  assert.match(SRC, /p_uncharged: true,/);
  assert.match(SRC, /p_uncharged: !spent\?\.allowed,/, 'an unreadable read is recorded, uncharged');
});

test('the meter’s weight lives in SQL, never in the function', () => {
  assert.match(SRC, /p_action: FORM_ACTION/);
  assert.match(DOMAIN, /export const FORM_ACTION = 'form_check';/);
  // MA3-D16: no credit number anywhere in either file.
  // `p_credits: 0` is "nothing was charged", not a price; no NON-zero credit number may appear.
  assert.ok(!/credits?\s*[:=]\s*[1-9]/i.test(SRC), 'a credit count must never be a constant in src/');
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
    'Zero is a real answer',
    'never write a fix and then hedge it',
    'Never mention frame numbers',
    'a screen recording of a phone',
    'they are not this athlete',
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

test('⭐ EVERY ANGLE gets a read — the prompt never refuses or asks for a refilm over the angle (PO 2026-09-25)', () => {
  const s = system();
  for (const rule of [
    '# Any camera angle',
    'Never refuse a clip because of the angle',
    'never ask them to refilm from a different one',
    'From what I can see',
    'From the front or behind:',
    'What the angle hides, you simply leave out.',
    'the camera angle is never the reason',
    'never about which side to film from',
  ]) assert.ok(s.includes(rule), `missing from SYSTEM: ${rule}`);
  // The old refusal trigger must be gone.
  assert.ok(!/needs a side view|camera is behind them or straight on/.test(s), 'the angle refusal came back');
  assert.ok(!/film (it )?from the side/i.test(s), 'Holt must not prescribe the side view');
});

test('the app sends when each frame was taken, and the copy says any angle', () => {
  assert.match(LIVE, /times: req\.times\?\.slice\(0, capped\.length\)/);
  assert.match(LIVE, /from any angle/);
  assert.ok(!/film[^.\n]*from the side/i.test(SCREEN), 'the screen must not tell them to film from the side');
  assert.match(SCREEN, /formCheck\(\{ lift: chosen\.name, frames: got\.frames, times: got\.times, sizes: got\.sizes, note, focus, known, last \}\)/);
  assert.match(LIVE, /sizes: req\.sizes\?\.slice\(0, capped\.length\)/);
});

test('the prompt REQUIRES earned praise and a closing line of encouragement (PO 2026-09-25)', () => {
  const s = system();
  for (const rule of [
    'Always name at least one thing that is genuinely right',
    'Praise is specific and earned, never generic',
    'Never invent a strength the frames do not show',
    'End with one short line of encouragement',
    '"encourage": "<one short closing sentence',
    '"encourage": exactly one short sentence, always present. Every rule above applies to it too.',
    'Empty array only when the frames cannot be read',
  ]) assert.ok(s.includes(rule), `missing from SYSTEM: ${rule}`);
  // The voice rule on "!" still stands next to the new praise rule.
  assert.ok(s.includes('At most one exclamation mark, and only on something genuinely excellent.'));
});

test('the LAST thing between the model and the answer is the code guard, not the prompt', () => {
  const guard = at('const read = payload?.stop_reason === \'refusal\' ? null : parseFormRead(text, lift, frames.length, sizes);');
  const answer = at('return json({ ok: true, read, remaining: spent?.remaining ?? quote.remaining });');
  assert.ok(guard < answer);
  // Between them: the spend, the usage record, and the refusal — nothing that touches `text`.
  const between = SRC.slice(SRC.indexOf('\n', guard), answer);
  assert.ok(!/\btext\b/.test(between.replace(/\/\/.*$/gm, '')), 'the raw model text never reaches the answer');
  assert.ok(!/read: text|read: payload/.test(SRC), 'the raw model text is never the answer');
  assert.match(SRC, /import \{[\s\S]*?parseFormRead,[\s\S]*?\} from '\.\.\/\.\.\/\.\.\/src\/domain\/coach\/form-check\.ts';/);
});

test('the lift echoed back comes from the REQUEST, not from the model', () => {
  assert.match(SRC, /parseFormRead\(text, lift, frames\.length, sizes\)/);
  assert.match(DOMAIN, /export function sanitizeFormRead\(\n\s*raw: unknown,\n\s*lift\?: string,/);
});

test('a model refusal reads as an unreadable clip, not as an app failure — and is not charged', () => {
  assert.match(SRC, /payload\?\.stop_reason === 'refusal' \? null :/);
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
  assert.match(FRAMES, /requireOptionalNativeModule<NativeThumbnails>\('ExpoVideoThumbnails'\)/);
  assert.ok(!/from 'expo-video-thumbnails'/.test(FRAMES + LIVE), 'importing the package would throw on an old build');
  assert.match(FRAMES, /export function videoFramesAvailable\(\): boolean \{\n\s*return thumbnails != null;/);
  assert.match(LIVE, /export function formCheckAvailable\(\): boolean \{\n\s*return videoFramesAvailable\(\);/);
});

test('the web reads frames itself, so form check works on the web preview', () => {
  const WEB = read('src/lib/video-frames.web.ts');
  assert.match(WEB, /canvas\.toDataURL\('image\/jpeg', compress\)/);
  assert.match(WEB, /export function videoFramesAvailable\(\): boolean/);
});

test('the app reuses the ONE camera-or-library path and never touches ImagePicker itself', () => {
  assert.ok(!/from 'expo-image-picker'/.test(LIVE.replace(/import type[^;]+;/g, '')), 'types only');
  assert.match(LIVE, /export async function pickFormVideo\(pick: MediaPick, source: 'camera' \| 'library'\)/);
  assert.match(LIVE, /videoMaxDuration: FORM_CLIP_SECONDS/);
  assert.match(LIVE, /directCamera: source === 'camera',\n\s*directLibrary: source === 'library',/);
});

test('a non-2xx from the function is never reported as "offline"', () => {
  assert.match(LIVE, /ctx instanceof Response/);
  assert.match(LIVE, /return \{ kind: 'unavailable' \};/);
  assert.match(LIVE, /return \{ kind: 'offline' \};/);
});

test('the app re-runs the guard on whatever came back', () => {
  assert.match(LIVE, /return formResultFrom\(body, cleanLift, capped\.length\);/);
  assert.match(VIEW, /const read = sanitizeFormRead\(d\.read, lift, frameCount\);/);
});

test('the paste copy never carries the app-only half', () => {
  assert.ok(!/form-check-view/.test(SRC), 'the function must not import the app-only module');
  const committed = read(DEPLOY_COPY);
  for (const name of ['formCheckSummary', 'knownFromCoaching', 'trimWindow', 'formResultFrom']) {
    assert.ok(!committed.includes(`function ${name}`), `${name} is app-only and must not be pasted`);
  }
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
