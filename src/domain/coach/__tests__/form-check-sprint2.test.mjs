/**
 * form-check-sprint2.test.mjs — AI Road to 10 Sprint 2 for form check (FC-1 · CH-2 · UX-4), partly on the REAL paste
 * bundle (json-fn-harness.mjs).
 *
 *   · 18+: a minor → `under_18`, no birth year → `age_unknown` (fail closed), both 403, before the model, settled
 *     `guarded` and refunded; an adult reaches the model as before
 *   · the frame spacing is said from the times that arrived (V-D4) — the cached block no longer claims it
 *   · dense frames with rep tags, not 6–10 picks (V-D4)
 *   · the output scan holds a read back on the server (`held: true`) and on this end (the web talks to v23 until the
 *     deploy); the shared clinical list blocks on both
 *   · the eval builds the user turn with the function's own builder; the screen asks for the birth year itself
 *
 * ⚠ Offline: a fake model and a fake meter.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { buildCoachFormCheckDeploy } from '../../../../scripts/build-coach-form-check-deploy.mjs';
import { fakeModel, loadJsonFunction, newLog, post, settled } from './json-fn-harness.mjs';
import { formReadTexts, formSpacingLine, formUserText, sanitizeFormRead } from '../form-check.ts';
import { FORM_AGE_UNKNOWN_LINE, formAgeGate, formBirthYear, formResultFrom } from '../form-check-view.ts';
import { densePoseFrames } from '../pose/pose-frames.ts';

const read = (rel) => fs.readFileSync(rel, 'utf8').replace(/\r\n/g, '\n');
const FRAME = 'A'.repeat(400);
const TIMES = [500, 833, 1167, 1500, 1833, 2167, 2500, 2833];
const BODY = { lift: 'Back Squat', frames: TIMES.map(() => FRAME), times: TIMES, sizes: TIMES.map(() => [432, 768]) };
const READ = {
  view: 'side',
  viewLine: 'From the side, three reps.',
  reps: 3,
  looksGood: ['Depth is there on every rep.'],
  fix: ['The bar drifts forward out of the bottom.'],
  marks: [],
  cue: 'bar over mid-foot',
  drill: '',
  vsLast: 'new',
  progress: '',
  encourage: 'Film the next heavy set and we will see the bar path tighten up.',
};

async function run(t, { reserve = {}, model = READ, body = BODY } = {}) {
  const log = newLog({ reserve });
  fakeModel(t, log, JSON.stringify(model));
  const res = await post(await loadJsonFunction(buildCoachFormCheckDeploy, log), body);
  return { ...res, log };
}

// ── 18+ ───────────────────────────────────────────────────────────────────────

test('⛔ a minor is refused before the model: under_18, 403, settled guarded and refunded', async (t) => {
  const { status, json, log } = await run(t, { reserve: { minor: true, age_years: 16 } });
  assert.equal(status, 403);
  assert.equal(json.reason, 'under_18');
  assert.equal(json.refunded, true);
  assert.equal(log.requests.length, 0, 'no model call');
  assert.deepEqual(settled(log), [['guarded', true]]);
});

test('⛔ no birth year fails CLOSED: age_unknown, 403, before the model, refunded', async (t) => {
  const { status, json, log } = await run(t, { reserve: { minor: false, age_years: null } });
  assert.equal(status, 403);
  assert.equal(json.reason, 'age_unknown');
  assert.equal(log.requests.length, 0);
  assert.deepEqual(settled(log), [['guarded', true]]);
});

test('an adult reaches the model; the spacing is said in the user turn, from the times sent; charged', async (t) => {
  const { json, log } = await run(t);
  assert.equal(json.ok, true);
  assert.deepEqual(settled(log), [['ok', false]]);
  const turn = log.requests[0].messages[0].content.at(-1).text;
  assert.match(turn, /The frames are evenly spaced, about 0\.33 s apart, so each rep is covered by several frames in a row\./);
  assert.match(turn, /Athlete's age, from their profile: 30\./);
  const system = log.requests[0].system[0].text;
  assert.doesNotMatch(system, /third of a second/, 'the cached block no longer claims a spacing (V-D4)');
  assert.match(system, /The message after the frames says how far apart they are\./);
});

test('⛔ the output scan holds a read back on the server: medical_stop + held, settled guarded and refunded', async (t) => {
  const { json, log } = await run(t, { model: { ...READ, encourage: 'Take 400 mg of ibuprofen before the next session.' } });
  assert.equal(json.route, 'medical_stop');
  assert.equal(json.held, true);
  assert.equal(json.refunded, true);
  assert.ok(!('read' in json));
  assert.deepEqual(settled(log), [['guarded', true]]);
});

test('the app reads the new answers: held, under_18, age_unknown — and an older app still sees a stop', () => {
  assert.deepEqual(formResultFrom({ route: 'medical_stop', held: true, refunded: true }), { kind: 'held' });
  assert.deepEqual(formResultFrom({ ok: false, reason: 'under_18' }), { kind: 'under_18' });
  assert.deepEqual(formResultFrom({ ok: false, reason: 'age_unknown' }), { kind: 'age_unknown' });
  assert.deepEqual(formResultFrom({ route: 'medical_stop' }), { kind: 'stopped', route: 'medical_stop' }, 'the before-model stop is unchanged');
});

test('⛔ and the app scans every read itself — a function deployed before the scan (v23) cannot put one on screen', () => {
  const r = formResultFrom({ ok: true, read: { ...READ, encourage: 'Some soreness in your knees after this is totally normal. Keep going.' } }, 'Back Squat', 8);
  // The sentence guard drops the soreness sentence; "Keep going." survives and is clean, so the read stands.
  assert.equal(r.kind, 'ok');
  const dosed = formResultFrom({ ok: true, read: { ...READ, cue: 'two Advil, then brace' } }, 'Back Squat', 8);
  assert.deepEqual(dosed, { kind: 'held' });
  // The shared clinical list: a "valgus" sentence is dropped by the guard, on this end too (the web).
  const valgus = sanitizeFormRead({ ...READ, fix: ['Knee valgus on rep two.', 'The bar drifts forward.'] }, 'Back Squat', 8);
  assert.deepEqual(valgus.fix, ['The bar drifts forward.']);
});

// ── The spacing line ──────────────────────────────────────────────────────────

test('formSpacingLine: even, sparse, uneven, and nothing claimed without times', () => {
  assert.equal(formSpacingLine(null), null);
  assert.equal(formSpacingLine([1000]), null);
  assert.match(formSpacingLine([0, 333, 667, 1000]), /evenly spaced, about 0\.33 s apart, so each rep is covered/);
  assert.match(formSpacingLine([0, 750, 1500, 2250]), /evenly spaced, about 0\.75 s apart — a rep may fall between two of them/);
  // Build 11's hand-picked key moments: not even, and said so.
  assert.match(formSpacingLine([400, 1500, 1700, 3900, 4100, 6800]), /not evenly spaced \(from 0\.2 s to 2\.7 s apart\)/);
  // Dense frames nudged onto a rep's moment still read as even.
  assert.match(formSpacingLine([0, 333, 600, 1000, 1333, 1720, 2000]), /evenly spaced/);
});

test('formUserText: the function’s one builder — the order, the note as the athlete’s words, the spacing', () => {
  const t = formUserText({ lift: 'Deadlift', note: 'rep 4 felt off', focus: ['Back'], known: 'Cues: brace', profile: "Athlete's age, from their profile: 31.", times: [0, 333, 667] });
  assert.ok(t.startsWith('Those frames are one set of: Deadlift. They are in time order. The frames are evenly spaced'));
  assert.ok(t.indexOf('Look especially at: Back.') < t.indexOf('The athlete says: "rep 4 felt off"'));
  assert.ok(t.endsWith("Athlete's age, from their profile: 31.\n\nAnswer with the JSON object only."));
  assert.equal(formUserText({ lift: 'Deadlift' }), 'Those frames are one set of: Deadlift. They are in time order.\n\nAnswer with the JSON object only.');
});

test('formReadTexts: every line a person sees, and nothing else', () => {
  const r = sanitizeFormRead({ ...READ, marks: [{ fix: 0, frame: 2, kind: 'dot', x: 100, y: 200, shows: 'bottom of the squat' }] }, 'Back Squat', 8, TIMES.map(() => [432, 768]));
  assert.deepEqual(formReadTexts(r), [
    'From the side, three reps.',
    'Depth is there on every rep.',
    'The bar drifts forward out of the bottom.',
    'bar over mid-foot',
    'Film the next heavy set and we will see the bar path tighten up.',
    'bottom of the squat',
  ]);
});

// ── Dense frames + rep tags (V-D4) ────────────────────────────────────────────

const rep = (startMs, turnMs, midMs, endMs, edge = false) => ({ start: 0, turn: 0, end: 0, startMs, turnMs, midMs, endMs, down: 1, pause: 0, up: 1, edge });

test('densePoseFrames: the dense frames stay, the nearest is moved onto each rep’s moment and tagged, order kept', () => {
  const times = Array.from({ length: 24 }, (_, i) => Math.round(167 + i * 333)); // ~3 a second over 8 s
  const reps = [rep(300, 1400, 2000, 2600), rep(2700, 3900, 4500, 5100), rep(5200, 6400, 7000, 7600)];
  const d = densePoseFrames(times, reps);
  assert.equal(d.times.length, times.length, 'every dense frame is still sent');
  assert.deepEqual(d.times, [...d.times].sort((a, b) => a - b));
  assert.ok(d.times.every((t, i) => i === 0 || t > d.times[i - 1]), 'strictly ascending (capFrameTimes drops anything else)');
  for (let r = 1; r <= 3; r += 1) {
    const bottom = d.tags.findIndex((t) => t && t.rep === r && t.at === 'turn');
    assert.ok(bottom >= 0, `rep ${r} has its bottom`);
    assert.equal(d.times[bottom], reps[r - 1].turnMs, 'moved exactly onto the moment');
  }
  assert.ok(d.tags.filter(Boolean).length >= 9);
  assert.ok(d.times.every((t, i) => Math.abs(t - times[i]) <= 167), 'no frame moved more than half a gap');
});

test('densePoseFrames: an edge rep has no start; no reps tags nothing', () => {
  const times = [100, 433, 767, 1100, 1433, 1767, 2100];
  const d = densePoseFrames(times, [rep(0, 0, 900, 1800, true)]);
  assert.ok(!d.tags.some((t) => t && t.at === 'start'));
  assert.deepEqual(densePoseFrames(times, []), { times, tags: times.map(() => null) });
});

// ── Birth year ────────────────────────────────────────────────────────────────

test('the birth year: four digits, a year a living person was born in; the server’s rule for who is under 18', () => {
  assert.equal(formBirthYear('1990', 2026), 1990);
  for (const bad of ['199', '19900', 'abcd', '2027', '1900', '']) assert.equal(formBirthYear(bad, 2026), null, bad);
  assert.equal(formAgeGate(2008, 2026), 'minor', 'turning 18 this year still counts as under 18 (isUnderAge)');
  assert.equal(formAgeGate(2007, 2026), 'adult');
  assert.equal(formAgeGate(null, 2026), 'unknown');
  assert.match(FORM_AGE_UNKNOWN_LINE, /Add your birth year/);
});

// ── The screen and the eval ───────────────────────────────────────────────────

test('the screen asks for the birth year itself, and reads the server’s new answers', () => {
  const SCREEN = read('src/app/form-check.tsx');
  assert.match(SCREEN, /await saveBirthYear\(year\);/);
  assert.match(SCREEN, /fetchNutritionProfile\(\{ strict: true \}\)/);
  for (const k of ["case 'held':", "case 'under_18':", "case 'age_unknown':"]) assert.ok(SCREEN.includes(k), k);
  // ⚠ The copy never sends anyone to Settings for a birth year — there is no such field there.
  assert.doesNotMatch(SCREEN + read('src/domain/coach/form-check-view.ts'), /birth year in Settings/i);
});

test('UX-4: the form check vote runs on AiFeedback’s own state machine — one vote, never withdrawn, a failed write said', () => {
  const SCREEN = read('src/app/form-check.tsx');
  assert.match(SCREEN, /const \[vote, setVote\] = useState<AiFeedbackState>\(AI_FEEDBACK_IDLE\);/);
  assert.match(SCREEN, /if \(!aiFeedbackWrites\(vote, rating\)\) return;/);
  assert.match(SCREEN, /void rateAiOutput\(\{ feature: 'form_check', ref: r\.ref, rating \}\)\.then\(\(ok\) =>/);
  assert.match(SCREEN, /\{vote\.failed \? \(/);
  assert.doesNotMatch(SCREEN, /useful === v \? null : v/, 'the old toggle-off is gone');
});

test('the eval mirrors the function: the same SYSTEM source, the same user-turn builder, the same guard and scan', () => {
  const EVAL = read('scripts/form-check-eval.mjs');
  assert.match(EVAL, /readFileSync\(path\.join\(ROOT, 'supabase\/functions\/coach-form-check\/index\.ts'\), 'utf8'\)/);
  assert.match(EVAL, /text: formUserText\(\{ lift: clip\.lift, known, profile, times: times\.slice\(0, frames\.length\) \}\)/);
  assert.match(EVAL, /parseFormRead\(text, clip\.lift, frames\.length, sizes\)/);
  assert.match(EVAL, /scanTexts\(formReadTexts\(read\)\)/);
  assert.match(EVAL, /const profile = ageLine\(age, false\);/);
});
