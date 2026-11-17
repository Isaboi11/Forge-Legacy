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
import { costOf, evaluateSuite, loadSuites, ratesFor, runLive, validateSuite } from '../lib/runner.mjs';
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
  assert.equal(ratesFor('mystery').in, 2);
});

test('run.mjs: --record needs --live, and --live runs one suite at a time', () => {
  assert.throws(() => parseArgs(['--suite', 'a', '--record']), /--record only makes sense with --live/);
  assert.throws(() => parseArgs(['--suite', 'all', '--live', '--budget', '5']), /one suite at a time/);
  assert.throws(() => parseArgs([]), /--suite/);
  assert.deepEqual(parseArgs(['--suite', 'author', '--live', '--budget', '2', '--record']), { suite: 'author', live: true, budget: 2, record: true, json: false });
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
