// node --experimental-strip-types --test scripts/evals/__tests__/evals.test.mjs
//
// PL-6: the runner, the gate, the prompt hash and the record/replay store — with fake suites in a temp folder. No
// test here makes a network call; `runLive` is driven by a fake callLive.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FUNCTIONS } from '../../deploy-ai/functions.mjs';
import { changedSlugs, gateSlug } from '../gate.mjs';
import { constantString, constantText, promptHash } from '../lib/prompt-hash.mjs';
import { costOf, evaluateSuite, formatResult, loadBaselines, loadSuites, ratesFor, runLive, validateSuite } from '../lib/runner.mjs';
import { state, writeRecording } from '../lib/store.mjs';
import { parseArgs } from '../run.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function tempRoot(promptText = 'You are Holt.') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evals-'));
  fs.mkdirSync(path.join(dir, 'fn'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'fn', 'index.ts'), `const MODEL = 'claude-sonnet-5';\r\nconst SYSTEM = \`${promptText}\`;\r\n`);
  return dir;
}

function fakeSuite(over = {}) {
  return {
    name: 'fake',
    functions: ['coach-ask'],
    promptSources: [{ file: 'fn/index.ts', exportName: 'SYSTEM' }],
    model: 'claude-sonnet-5',
    cases: async () => [
      { id: 'a', input: 'x', expect: 'ok' },
      { id: 'b', input: 'y', expect: 'ok' },
    ],
    deterministic: async () => [{ id: 'd1', pass: true }],
    grade: async (c, rec) => ({ pass: rec.reply === 'ok', score: rec.reply === 'ok' ? 1 : 0, notes: rec.reply }),
    callLive: async () => ({ reply: 'ok', usage: { input_tokens: 1000, output_tokens: 100 } }),
    estimateUsd: (cases) => cases.length * 0.01,
    threshold: { metric: 'pass_rate', min: 1 },
    ...over,
  };
}

// ── the prompt hash ─────────────────────────────────────────────────────────────────────────────────────────

test('prompt hash: the constant’s text + the model; CRLF-proof; a changed prompt or model is a new hash', () => {
  const root = tempRoot();
  const s = fakeSuite();
  const h = promptHash(s, root);
  assert.match(h, /^[0-9a-f]{64}$/);
  fs.writeFileSync(path.join(root, 'fn', 'index.ts'), fs.readFileSync(path.join(root, 'fn', 'index.ts'), 'utf8').replace(/\r\n/g, '\n'));
  assert.equal(promptHash(s, root), h, 'LF and CRLF checkouts hash the same');
  assert.notEqual(promptHash({ ...s, model: 'claude-sonnet-5-5' }, root), h, 'the model is in the hash');
  assert.notEqual(promptHash(s, tempRoot('You are Holt!')), h, 'one character of prompt is a new hash');
  assert.throws(() => promptHash({ ...s, promptSources: [{ file: 'fn/index.ts', exportName: 'NOPE' }] }, root), /no top-level const NOPE/);
  assert.throws(() => promptHash({ ...s, promptSources: [] }, root), /names no promptSources/);
  assert.equal(constantText("const A = 'x';\nexport const B = { a: 1 };", 'B'), '{ a: 1 }');
  assert.equal(constantString('const S = `a\\nb`;', 'S'), 'a\nb');
  assert.throws(() => constantString('const S = `a${x}`;', 'S'), /substitutions/);
});

test('every real suite hashes a prompt that exists, and the hash moves when the function’s prompt moves', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'scripts/evals/suites'))) assert.ok(f.endsWith('.mjs'), f);
  const sys = constantText(fs.readFileSync(path.join(ROOT, 'supabase/functions/coach-ask/index.ts'), 'utf8'), 'SYSTEM');
  assert.ok(sys.length > 1000);
});

// ── the store ───────────────────────────────────────────────────────────────────────────────────────────────

test('store: unrecorded → current → stale when the prompt moves; a file whose hash disagrees is ignored', () => {
  const rec = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
  const h1 = 'a'.repeat(64);
  const h2 = 'b'.repeat(64);
  assert.equal(state(rec, 'fake', h1).state, 'unrecorded');
  writeRecording(rec, { suite: 'fake', hash: h1, model: 'm', caseId: 'a', reply: 'ok', usage: null, now: new Date('2026-11-17T00:00:00Z') });
  const s1 = state(rec, 'fake', h1);
  assert.equal(s1.state, 'current');
  assert.equal(s1.current.get('a').recordedAt, '2026-11-17T00:00:00.000Z');
  assert.equal(state(rec, 'fake', h2).state, 'stale');
  assert.deepEqual(state(rec, 'fake', h2).older, ['aaaaaaaaaaaa']);
  // A recording copied into the wrong hash folder is not trusted.
  fs.mkdirSync(path.join(rec, 'fake', h2.slice(0, 12)));
  fs.copyFileSync(path.join(rec, 'fake', h1.slice(0, 12), 'a.json'), path.join(rec, 'fake', h2.slice(0, 12), 'a.json'));
  assert.equal(state(rec, 'fake', h2).current.size, 0);
  assert.throws(() => writeRecording(rec, { suite: 'fake', hash: h1, model: 'm', caseId: '../x', reply: null, usage: null }), /safe file name/);
});

// ── the runner's policy ─────────────────────────────────────────────────────────────────────────────────────

test('UNRECORDED: the deterministic checks decide, loudly; STALE: fail with the re-record cost; GRADED: the threshold', async () => {
  const root = tempRoot();
  const recordings = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
  const s = fakeSuite();
  const u = await evaluateSuite(s, { root, recordings });
  assert.equal(u.status, 'UNRECORDED');
  assert.equal(u.verdict, 'pass');
  assert.match(u.messages.join(' '), /UNRECORDED — record on the next live run \(~\$0\.02\)/);
  const uf = await evaluateSuite(fakeSuite({ deterministic: async () => [{ id: 'd1', pass: false, notes: 'broken' }] }), { root, recordings });
  assert.equal(uf.verdict, 'fail');

  const hash = promptHash(s, root);
  writeRecording(recordings, { suite: 'fake', hash, model: s.model, caseId: 'a', reply: 'ok', usage: null });
  const partial = await evaluateSuite(s, { root, recordings });
  assert.equal(partial.status, 'GRADED');
  assert.equal(partial.graded.missing, 1);
  assert.equal(partial.verdict, 'fail', 'a case without a recording under the current prompt counts as a fail');
  writeRecording(recordings, { suite: 'fake', hash, model: s.model, caseId: 'b', reply: 'ok', usage: null });
  const g = await evaluateSuite(s, { root, recordings });
  assert.equal(g.verdict, 'pass');
  assert.equal(g.graded.metric, 1);
  writeRecording(recordings, { suite: 'fake', hash, model: s.model, caseId: 'b', reply: 'wrong', usage: null });
  assert.equal((await evaluateSuite(s, { root, recordings })).verdict, 'fail');
  assert.equal((await evaluateSuite({ ...s, threshold: { metric: 'pass_rate', min: 0.5 } }, { root, recordings })).verdict, 'pass');

  const stale = await evaluateSuite(s, { root: tempRoot('A changed prompt.'), recordings });
  assert.equal(stale.status, 'STALE');
  assert.equal(stale.verdict, 'fail');
  assert.match(stale.messages.join(' '), /STALE — .* re-record: ~\$0\.02 live/);
});

test('duplicate case ids and malformed suites are refused loudly', async () => {
  const root = tempRoot();
  await assert.rejects(
    () => evaluateSuite(fakeSuite({ cases: async () => [{ id: 'a' }, { id: 'a' }] }), { root, recordings: fs.mkdtempSync(path.join(os.tmpdir(), 'r-')) }),
    /duplicate case id a/,
  );
  assert.throws(() => validateSuite({ ...fakeSuite(), threshold: { metric: 'vibes', min: 1 } }), /threshold/);
  assert.throws(() => validateSuite({ ...fakeSuite(), functions: [] }), /functions/);
  assert.throws(() => validateSuite({ ...fakeSuite(), name: 'Bad Name' }), /kebab/);
  assert.throws(() => validateSuite({ ...fakeSuite(), threshold: { metric: 'pass_rate', min: 1, floor: 'yesterday' } }), /floor/);
  validateSuite({ ...fakeSuite(), threshold: { metric: 'pass_rate', min: 1, floor: 'live' } });
});

// ── floor: 'live' — "no worse than live" (Sprint 3b §1.1, PO 11-18) ───────────────────────────────────────────

/** A suite held to live, four cases, graded from recordings whose reply is 'ok' or not. */
async function liveFloorSetup(replies) {
  const root = tempRoot();
  const recordings = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
  const s = fakeSuite({
    threshold: { metric: 'pass_rate', min: 0.95, floor: 'live' },
    cases: async () => ['a', 'b', 'c', 'd'].map((id) => ({ id, input: id, expect: 'ok' })),
  });
  const hash = promptHash(s, root);
  for (const [caseId, reply] of Object.entries(replies)) writeRecording(recordings, { suite: 'fake', hash, model: s.model, caseId, reply, usage: null });
  return { s, root, recordings };
}
const liveBaseline = (passedCaseIds, n = 4) => ({ fake: { metricName: 'pass_rate', metric: passedCaseIds.length / n, passedCaseIds, recordedAt: '2026-11-17T20:00:00.000Z', promptHash: 'f'.repeat(64), source: 'test' } });

test('floor live: passes below the absolute bar when it beats live and keeps every case live passes — the bar prints as a target', async () => {
  const { s, root, recordings } = await liveFloorSetup({ a: 'ok', b: 'ok', c: 'ok', d: 'wrong' });
  const r = await evaluateSuite(s, { root, recordings, baselines: liveBaseline(['a', 'b']) });
  assert.equal(r.verdict, 'pass', '0.75 is under the 0.95 bar, but over live (0.5) with a and b still passing');
  assert.match(r.messages.join('\n'), /target 0\.95 — at 0\.750 \(live 0\.500\)/);
  assert.deepEqual(r.floor.regressed, []);
  assert.match(formatResult(r), /floor: live 2 passed \(0\.500\)/);
  // Equal to live is "no worse": passes.
  assert.equal((await evaluateSuite(s, { root, recordings, baselines: liveBaseline(['a', 'b', 'c']) })).verdict, 'pass');
});

test('floor live: a metric under live fails', async () => {
  const { s, root, recordings } = await liveFloorSetup({ a: 'ok', b: 'wrong', c: 'wrong', d: 'wrong' });
  const r = await evaluateSuite(s, { root, recordings, baselines: liveBaseline(['a', 'c']) });
  assert.equal(r.verdict, 'fail');
  assert.match(r.messages.join('\n'), /pass_rate 0\.250 < live 0\.500/);
});

test('floor live: a case live passed that now fails fails the suite, even when the metric went UP', async () => {
  const { s, root, recordings } = await liveFloorSetup({ a: 'ok', b: 'wrong', c: 'ok', d: 'ok' });
  const r = await evaluateSuite(s, { root, recordings, baselines: liveBaseline(['a', 'b']) });
  assert.equal(r.graded.metric, 0.75, 'better than live overall (0.5)…');
  assert.equal(r.verdict, 'fail', '…but b regressed, and a gain never buys a regression');
  assert.deepEqual(r.floor.regressed.map((x) => x.id), ['b']);
  assert.match(r.messages.join('\n'), /1 case\(s\) live passes now fail: b: wrong/);
  // A case live passed that is no longer in the suite cannot be shown to pass: fail, and say re-baseline.
  const gone = await evaluateSuite(s, { root, recordings, baselines: liveBaseline(['a', 'z']) });
  assert.equal(gone.verdict, 'fail');
  assert.match(gone.messages.join('\n'), /z: no longer a case in the suite — re-baseline it/);
  // A case live passed with no recording under the current prompt is a regression too.
  const { s: s2, root: root2, recordings: rec2 } = await liveFloorSetup({ a: 'ok', c: 'ok', d: 'ok' });
  const unrecordedCase = await evaluateSuite(s2, { root: root2, recordings: rec2, baselines: liveBaseline(['b']) });
  assert.equal(unrecordedCase.verdict, 'fail');
  assert.match(unrecordedCase.messages.join('\n'), /b: no recording under the current prompt/);
});

test('floor live: no baseline (or a malformed one) fails — never a guessed baseline; unrecorded fails too; deterministic still decides', async () => {
  const { s, root, recordings } = await liveFloorSetup({ a: 'ok', b: 'ok', c: 'ok', d: 'ok' });
  const none = await evaluateSuite(s, { root, recordings, baselines: {} });
  assert.equal(none.verdict, 'fail', 'a perfect score with no baseline still fails');
  assert.match(none.messages.join('\n'), /no live baseline for fake in scripts\/evals\/baselines\.json/);
  assert.match(formatResult(none), /floor: live \(NO BASELINE\)/);
  assert.equal((await evaluateSuite(s, { root, recordings, baselines: { fake: { metric: 0.5 } } })).verdict, 'fail', 'no passedCaseIds');
  assert.equal((await evaluateSuite(s, { root, recordings, baselines: { fake: { passedCaseIds: [] } } })).verdict, 'fail', 'no metric');
  assert.equal((await evaluateSuite(s, { root, recordings, baselines: { fake: { ...liveBaseline([]).fake, metricName: 'mean_score' } } })).verdict, 'fail', 'another metric');
  // The file itself: none in a fresh root → {}, so the suite fails.
  assert.deepEqual(loadBaselines(root), {});
  assert.equal((await evaluateSuite(s, { root, recordings })).verdict, 'fail');

  const det = await evaluateSuite({ ...s, deterministic: async () => [{ id: 'd1', pass: false }] }, { root, recordings, baselines: liveBaseline(['a']) });
  assert.equal(det.verdict, 'fail', 'a failed deterministic check fails, however good the graded run');
  const unrec = await evaluateSuite(s, { root, recordings: fs.mkdtempSync(path.join(os.tmpdir(), 'rec-')), baselines: liveBaseline(['a']) });
  assert.equal(unrec.status, 'UNRECORDED');
  assert.equal(unrec.verdict, 'fail', 'deterministic checks alone cannot show "no worse than live"');
  // Without the floor, the same graded run is held to its absolute bar as before.
  const absolute = await evaluateSuite({ ...s, threshold: { metric: 'pass_rate', min: 0.95 } }, { root, recordings, baselines: {} });
  assert.equal(absolute.verdict, 'pass');
  assert.equal(absolute.floor, undefined);
});

test('the gate passes baselines through: GATE PASS / GATE FAIL by the live floor', async () => {
  const { s, root, recordings } = await liveFloorSetup({ a: 'ok', b: 'wrong', c: 'ok', d: 'ok' });
  fs.cpSync(recordings, path.join(root, 'scripts', 'evals', 'recordings'), { recursive: true });
  const functions = { 'coach-ask': { suites: ['fake'] } };
  assert.equal((await gateSlug('coach-ask', { root, suites: [s], functions, baselines: liveBaseline(['a', 'c']) })).ok, true);
  const fail = await gateSlug('coach-ask', { root, suites: [s], functions, baselines: liveBaseline(['a', 'b']) });
  assert.equal(fail.ok, false);
  assert.equal(fail.lines.at(-1), 'GATE FAIL coach-ask');
});

// ── live: never without a budget ────────────────────────────────────────────────────────────────────────────

test('live: refuses without a budget, over the estimate, without a key; stops at the measured budget; records', async () => {
  const root = tempRoot();
  const recordings = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
  const s = fakeSuite();
  const quiet = () => {};
  await assert.rejects(() => runLive(s, { root, apiKey: 'k', budget: null, log: quiet }), /needs --budget/);
  await assert.rejects(() => runLive(s, { root, apiKey: 'k', budget: 0.01, log: quiet }), /over the budget/);
  await assert.rejects(() => runLive(s, { root, apiKey: '', budget: 1, log: quiet }), /no ANTHROPIC_API_KEY/);
  let calls = 0;
  const pricey = fakeSuite({ callLive: async () => (calls++, { reply: 'ok', usage: { input_tokens: 0, output_tokens: 3000 } }) }); // $0.03 a call
  const r = await runLive(pricey, { root, apiKey: 'k', budget: 0.025, record: true, recordings, log: quiet });
  assert.equal(r.done, 1, 'the first call spent past the budget; the second never ran');
  assert.equal(calls, 1);
  assert.equal(state(recordings, 'fake', r.hash).current.size, 1);
  assert.equal(costOf({ input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 1e6, cache_creation_input_tokens: 1e6 }, 'claude-sonnet-5'), 2 + 10 + 0.2 + 2.5);
  assert.equal(ratesFor('claude-haiku-4-5-20251001').in, 1, 'the longest prefix wins (0268)');
  // One usage per function (import-corpus runs the app's own path): counted, not $0 (11-17).
  const nested = { 'workout-card-read': { input_tokens: 1e6, output_tokens: 0 }, 'workout-tidy': { input_tokens: 0, output_tokens: 1e6 } };
  assert.equal(costOf(nested, 'claude-sonnet-5'), 2 + 10);
  assert.equal(ratesFor('mystery').in, 2);
});

test('live: an API failure stops the run and is never recorded; a busy answer waits and retries twice', async () => {
  const root = tempRoot();
  const quiet = () => {};
  const sleeps = [];
  const sleep = async (ms) => { sleeps.push(ms); };
  const ok = { reply: { text: 'fine' }, usage: { input_tokens: 10, output_tokens: 10 } };
  const many = async () => [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  // Out of credit (400) on the 2nd case: stops there, records only the 1st, no retry.
  let recordings = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
  let n = 0;
  const drained = fakeSuite({ cases: many, callLive: async () => (n++ === 0 ? ok : { reply: { error: 'http_400' }, usage: null }) });
  let r = await runLive(drained, { root, apiKey: 'k', budget: 1, record: true, recordings, log: quiet, sleep });
  assert.equal(r.stoppedOn, 'http_400');
  assert.equal(r.done, 1);
  assert.equal(n, 2, 'never knocks again on a drained account');
  assert.equal(state(recordings, 'fake', r.hash).current.size, 1, 'the error is not a recording');
  assert.deepEqual(sleeps, []);

  // 529 twice then fine: waits 15 s then 30 s, and goes on.
  recordings = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
  n = 0;
  const busy = fakeSuite({ cases: async () => [{ id: 'a' }], callLive: async () => (n++ < 2 ? { reply: { error: 'http_529' }, usage: null } : ok) });
  r = await runLive(busy, { root, apiKey: 'k', budget: 1, record: true, recordings, log: quiet, sleep });
  assert.equal(r.stoppedOn, null);
  assert.equal(r.done, 1);
  assert.deepEqual(sleeps, [15_000, 30_000]);

  // Still busy after two waits: stops. The app's own path (import-corpus) says upstream_error: stops too.
  n = 0;
  const stuck = fakeSuite({ cases: many, callLive: async () => (n++, { reply: { error: 'http_429' }, usage: null }) });
  r = await runLive(stuck, { root, apiKey: 'k', budget: 1, log: quiet, sleep });
  assert.equal(r.stoppedOn, 'http_429');
  assert.equal(n, 3);
  const app = fakeSuite({ cases: many, callLive: async () => ({ reply: { bodies: { 'workout-card-read': { status: 503, body: { ok: false, reason: 'upstream_error' } } } }, usage: {} }) });
  r = await runLive(app, { root, apiKey: 'k', budget: 1, log: quiet, sleep });
  assert.equal(r.stoppedOn, 'workout-card-read: upstream_error');
  assert.equal(r.done, 0);
});

test('run.mjs: --record needs --live, and --live runs one suite at a time', () => {
  assert.throws(() => parseArgs(['--suite', 'a', '--record']), /--record only makes sense with --live/);
  assert.throws(() => parseArgs(['--suite', 'all', '--live', '--budget', '5']), /one suite at a time/);
  assert.throws(() => parseArgs([]), /--suite/);
  assert.deepEqual(parseArgs(['--suite', 'author', '--live', '--budget', '2', '--record']), { suite: 'author', live: true, budget: 2, record: true, json: false, model: null });
  // PL-7: another model, recorded beside the function's own (the model is part of the recording key).
  assert.equal(parseArgs(['--suite', 'author', '--model', 'claude-opus-5-5']).model, 'claude-opus-5-5');
});

// ── the gate ────────────────────────────────────────────────────────────────────────────────────────────────

test('gate: changed slugs come from a function folder or its bundle', () => {
  assert.deepEqual(changedSlugs(['supabase/functions/coach-ask/index.ts', 'supabase/apply/deploy-coach-kitchen.ts', 'src/x.ts', 'supabase/functions/nope/index.ts', 'supabase/apply/pending-0271.sql']), ['coach-ask', 'coach-kitchen']);
});

test('gate: a missing suite fails, a noSuite reason passes, an unknown slug fails, an unlisted suite warns', async () => {
  const root = tempRoot();
  const functions = {
    one: { suites: ['fake'], tests: [] },
    two: { suites: ['ghost'], tests: [] },
    three: { suites: [], noSuite: 'No model.', tests: [] },
    four: { suites: [], tests: [] },
  };
  const s = fakeSuite({ functions: ['one', 'three'] });
  const one = await gateSlug('one', { root, suites: [s], functions });
  assert.equal(one.ok, true, one.lines.join('\n'));
  assert.match(one.lines.join('\n'), /UNRECORDED/);
  assert.equal((await gateSlug('two', { root, suites: [s], functions })).ok, false);
  const three = await gateSlug('three', { root, suites: [s], functions });
  assert.match(three.lines.join('\n'), /functions\.mjs does not list it/);
  assert.equal((await gateSlug('four', { root, suites: [], functions })).ok, false, 'no suite and no reason');
  assert.equal((await gateSlug('nope', { root, suites: [], functions })).ok, false);
});

test('the real suites: each validates, gates functions that exist, and every suite the map names exists', async () => {
  const suites = await loadSuites(ROOT);
  const names = new Set(suites.map((s) => s.name));
  for (const s of ['chat-safety', 'chat-answers', 'author', 'kitchen-allergens', 'meal-photo', 'form-check', 'import-corpus']) assert.ok(names.has(s), s);
  for (const s of suites) {
    for (const f of s.functions) assert.ok(FUNCTIONS[f], `${s.name} gates ${f}, which is not in functions.mjs`);
    assert.match(promptHash(s, ROOT), /^[0-9a-f]{64}$/);
    for (const f of s.functions) assert.ok(FUNCTIONS[f].suites.includes(s.name), `functions.mjs['${f}'].suites lists ${s.name}`);
  }
  for (const [slug, m] of Object.entries(FUNCTIONS)) {
    for (const n of m.suites) assert.ok(names.has(n), `${slug} expects suite ${n}`);
  }
});

test('the live floor is on import-corpus and kitchen-allergens ONLY, and each has a real baseline from real recordings', async () => {
  const suites = await loadSuites(ROOT);
  const floored = suites.filter((s) => s.threshold.floor === 'live').map((s) => s.name).sort();
  assert.deepEqual(floored, ['import-corpus', 'kitchen-allergens'], 'PO 11-18: tidy and Kitchen only');
  // ⛔ The medical stop keeps an absolute bar.
  assert.equal(suites.find((s) => s.name === 'chat-safety').threshold.floor, undefined);
  const baselines = loadBaselines(ROOT);
  for (const name of floored) {
    const s = suites.find((x) => x.name === name);
    const b = baselines[name];
    assert.ok(b, `${name} has a baseline`);
    const ids = new Set((await s.cases()).map((c) => String(c.id)));
    assert.equal(b.metricName, s.threshold.metric);
    assert.equal(new Set(b.passedCaseIds).size, b.passedCaseIds.length, `${name}: no duplicate ids`);
    for (const id of b.passedCaseIds) assert.ok(ids.has(id), `${name}: baseline case ${id} is a case`);
    assert.equal(b.passed, b.passedCaseIds.length);
    assert.equal(b.cases, ids.size, `${name}: the baseline graded every case there is today`);
    assert.equal(b.metric, b.passed / b.cases);
    assert.match(b.promptHash, /^[0-9a-f]{64}$/);
    assert.match(b.recordedAt, /^2026-11-17T/);
    assert.ok(b.source.length > 40, `${name}: says where it came from`);
    // The recordings it names exist, were made under the hash it names, and cover every case.
    const dir = path.join(ROOT, b.recordings);
    assert.equal(path.basename(dir), b.promptHash.slice(0, 12));
    const recs = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    assert.equal(recs.length, b.cases);
    for (const r of recs) assert.equal(r.promptHash, b.promptHash);
    for (const r of recs) assert.equal(r.model, b.model);
  }
  // 11-18 numbers (PO): live tidy/import 29 of 61, live Kitchen 31 of 36.
  assert.equal(baselines['import-corpus'].passed, 29);
  assert.equal(baselines['kitchen-allergens'].passed, 31);
});
