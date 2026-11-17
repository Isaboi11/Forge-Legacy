// node --test scripts/ci/__tests__/ci.test.mjs
//
// The CI helpers (PL-6 / C-I6): the TAP parser that decides a red or green run, the allowlist, the lint filter, and
// the two workflows parse and run the commands this repo has.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { judge, parseTap } from '../run-tests.mjs';
import { lintTargets } from '../lint-changed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

test('TAP: leaf failures only, TODO/SKIP never count, escaped names come back whole', () => {
  const tap = [
    'TAP version 13',
    '# Subtest: outer',
    '    not ok 1 - inner one',
    '    ok 2 - inner two',
    'not ok 1 - outer',
    'ok 2 - fine',
    'not ok 3 - a file that did not load.test.mjs',
    'not ok 4 - known \\# with a hash # TODO not yet',
    'ok 5 - skipped # SKIP',
    'not ok 6 - the push trigger keeps 0153’s arms',
    '# tests 6',
  ].join('\n');
  const r = parseTap(tap);
  assert.deepEqual(r.failed, ['inner one', 'a file that did not load.test.mjs', 'the push trigger keeps 0153’s arms']);
});

test('the allowlist: only exact names pass; a fixed one is a notice', () => {
  const known = [{ name: 'a' }, { name: 'b' }];
  assert.deepEqual(judge(['a'], known), { ok: true, unexpected: [], fixed: ['b'] });
  assert.equal(judge(['a', 'c'], known).ok, false);
  assert.equal(judge(['A'], known).ok, false, 'case matters');
  const list = JSON.parse(read('scripts/ci/known-failures.json')).failures;
  assert.equal(list.length, 4, 'exactly the four the contract names (§3)');
  for (const k of list) assert.ok(fs.existsSync(path.join(ROOT, k.file)) && read(k.file).includes(k.name), `${k.name} is a real test in ${k.file}`);
});

test('lint targets: app code only — never design_reference, site, Deno functions or paste bundles', () => {
  assert.deepEqual(
    lintTargets(['src/app/a.tsx', 'scripts/x.mjs', 'design_reference/y.js', 'site/z.js', 'supabase/functions/coach-ask/index.ts', 'supabase/apply/deploy-x.ts', 'Docs/a.md', 'eslint.config.js']),
    ['eslint.config.js', 'scripts/x.mjs', 'src/app/a.tsx'],
  );
});

/** A tiny YAML reader for the subset the workflows use (maps, lists, block scalars) — enough to check structure. */
function yamlKeys(text) {
  const keys = [];
  for (const line of text.split('\n')) {
    const m = /^(\s*)([A-Za-z_][\w-]*):/.exec(line);
    if (m) keys.push(`${m[1].length}:${m[2]}`);
  }
  return keys;
}

test('ci.yml: on push to main and pull requests, Node 24, and every step this repo can run', () => {
  const y = read('.github/workflows/ci.yml');
  assert.doesNotMatch(y, /\t/, 'YAML has no tabs');
  assert.ok(yamlKeys(y).includes('0:on') && yamlKeys(y).includes('0:jobs'));
  assert.match(y, /node-version: '24'/);
  for (const cmd of ['npm ci --ignore-scripts', 'npx tsc --noEmit', 'node scripts/ci/lint-changed.mjs', 'node scripts/ci/run-tests.mjs', 'node scripts/evals/run.mjs --suite all', 'node scripts/evals/gate.mjs --changed', 'node scripts/rls-static-check.mjs', 'node scripts/definer-grants-check.mjs']) {
    assert.ok(y.includes(cmd), cmd);
  }
  assert.match(y, /expo-env\.d\.ts/, 'tsc needs the Expo types file a fresh checkout does not have');
  assert.doesNotMatch(y, /secrets\./, 'CI needs no secret — it never calls a model or Supabase');
  assert.doesNotMatch(y, /--live/);
});

test('drift.yml: nightly on main, the PO’s secret, skips politely until it is set, read-only repo permissions', () => {
  const y = read('.github/workflows/drift.yml');
  assert.doesNotMatch(y, /\t/);
  assert.match(y, /schedule:\n\s+- cron: '\d+ \d+ \* \* \*'/);
  assert.match(y, /workflow_dispatch:/);
  assert.match(y, /ref: main/);
  assert.match(y, /contents: read/);
  assert.match(y, /SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(y, /node scripts\/deploy-ai\/drift\.mjs --record/);
  assert.match(y, /if: env\.HAS_TOKEN == 'true'/);
});
