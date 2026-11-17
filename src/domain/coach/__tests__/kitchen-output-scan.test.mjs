/**
 * kitchen-output-scan.test.mjs — coach-kitchen, AI Road to 10 Sprint 2 (CH-2 · audit C-I1), on the REAL paste bundle
 * (json-fn-harness.mjs), with REAL dishes the live model wrote on 2026-09-26 (`scripts/holt-corpus/live-kitchen-dishes-*`).
 *
 *   · the real dishes, as written, pass the scan and are charged — food amounts are not doses
 *   · the same dishes with one medical line in a step (a dose, a reassurance) → the existing stop reply
 *     (`reason: 'stop'`, `route: 'medical'`), settled `guarded`, refunded
 *   · the cached SYSTEM block is byte-identical
 *
 * ⚠ Offline: a fake model and a fake meter.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

import { buildCoachKitchenDeploy } from '../../../../scripts/build-coach-kitchen-deploy.mjs';
import { fakeModel, loadJsonFunction, newLog, post, settled } from './json-fn-harness.mjs';

const REAL = fs
  .readFileSync('scripts/holt-corpus/live-kitchen-dishes-2026-09-26.jsonl', 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .find((r) => (r.raw?.options ?? []).length >= 3);
const BODY = { have: REAL.have, ask: REAL.ask || 'what can I make?' };

async function run(t, options) {
  const log = newLog();
  fakeModel(t, log, JSON.stringify({ options }));
  const res = await post(await loadJsonFunction(buildCoachKitchenDeploy, log), BODY);
  return { ...res, log };
}

test('⚠ real dishes the live model wrote pass the scan, and are charged', async (t) => {
  const { json, log } = await run(t, REAL.raw.options);
  assert.equal(json.ok, true, JSON.stringify(json).slice(0, 200));
  assert.ok(json.options.length >= 1);
  assert.deepEqual(settled(log), [['ok', false]]);
});

for (const [kind, line] of [
  ['dose', 'Stir in 5 g of creatine before serving.'],
  ['reassurance', 'If your stomach cramps after, that is normal.'],
]) {
  test(`⛔ one ${kind} in a step: the existing stop reply, settled guarded and refunded`, async (t) => {
    const options = structuredClone(REAL.raw.options);
    options[1].steps = [...options[1].steps.slice(0, 2), line, ...options[1].steps.slice(2)];
    const { status, json, log } = await run(t, options);
    assert.equal(status, 200);
    assert.equal(json.ok, false);
    assert.equal(json.reason, 'stop', 'every app shows the stop card for this reason');
    assert.equal(json.route, 'medical');
    assert.equal(json.refunded, true);
    assert.ok(!('options' in json), 'no dish leaves');
    assert.deepEqual(settled(log), [['guarded', true]]);
  });
}

test('⛔ the cached SYSTEM block is byte-identical to Sprint 1’s', () => {
  const src = fs.readFileSync('supabase/functions/coach-kitchen/index.ts', 'utf8').replace(/\r\n/g, '\n');
  const a = src.indexOf('const SYSTEM = `');
  assert.equal(createHash('sha256').update(src.slice(a, src.indexOf('`;', a))).digest('hex'), '27da26b6f5803260804576192ee0f17776efed86bd8c42b42f0fd5c9d3d7735a');
});
