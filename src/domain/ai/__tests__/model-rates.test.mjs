import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { MODEL_RATES, rateCost, rateKeyFor } from '../model-rates.ts';

/*
 * The TS mirror of `coach_ai_config.model_rates` (0268) must equal the SQL literal, key for key and number for number,
 * and look a model up the same way `coach_ai_rate_cost()` does: exact → longest prefix → default (contract §2).
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const MIG = readFileSync(resolve(ROOT, 'supabase/migrations/0268_ai_meter_reserve_settle.sql'), 'utf8').replace(/\r\n/g, '\n');

function sqlRates() {
  const m = /set model_rates = '(\{[\s\S]*?\})'::jsonb/.exec(MIG);
  assert.ok(m, 'the rate literal is in 0268');
  return JSON.parse(m[1]);
}

test('the TS mirror equals the SQL literal in 0268', () => {
  assert.deepEqual({ ...MODEL_RATES }, sqlRates());
});

test('the contract §2 table, exactly', () => {
  assert.deepEqual(MODEL_RATES['claude-sonnet-5'], { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5 });
  assert.deepEqual(MODEL_RATES['claude-sonnet-5-5'], { input: 2, output: 10, cache_read: 0.1, cache_write: 2.5 });
  assert.deepEqual(MODEL_RATES['claude-haiku-4-5'], { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 });
  assert.deepEqual(MODEL_RATES['claude-haiku-5-5'], { input: 0.1, output: 0.5, cache_read: 0.01, cache_write: 0.125 });
  assert.deepEqual(MODEL_RATES['claude-opus-5-5'], { input: 4, output: 20, cache_read: 0.2, cache_write: 5 });
  assert.deepEqual(MODEL_RATES['claude-opus-5'], { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 });
  assert.deepEqual(MODEL_RATES.default, { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5 });
  assert.equal(Object.keys(MODEL_RATES).length, 7);
});

test('lookup: exact key, else the LONGEST key the model starts with, else default', () => {
  assert.equal(rateKeyFor('claude-sonnet-5'), 'claude-sonnet-5');
  assert.equal(rateKeyFor('claude-sonnet-5-5'), 'claude-sonnet-5-5', 'exact beats a shorter prefix');
  assert.equal(rateKeyFor('claude-haiku-4-5-20251001'), 'claude-haiku-4-5', 'the live dated id');
  assert.equal(rateKeyFor('claude-sonnet-5-5-20261201'), 'claude-sonnet-5-5', 'longest prefix, not the first one');
  assert.equal(rateKeyFor('claude-opus-5-5-20261101'), 'claude-opus-5-5');
  assert.equal(rateKeyFor('claude-opus-5-20260601'), 'claude-opus-5');
  assert.equal(rateKeyFor('gpt-anything'), 'default');
  assert.equal(rateKeyFor(''), 'default');
  assert.equal(rateKeyFor(null), 'default');
  assert.equal(rateKeyFor(undefined), 'default');
  assert.equal(rateKeyFor('default-ish'), 'default', '"default" is never a prefix match');
});

test('cost: per million tokens, every count priced separately, rounded to the ledger’s 6 places', () => {
  // The same four the §2 assertion of pending-0268.sql checks in SQL.
  assert.equal(rateCost('claude-haiku-4-5-20251001', { input: 1_000_000 }), 1);
  assert.equal(rateCost('claude-sonnet-5', { output: 1_000_000 }), 10);
  assert.equal(rateCost('claude-sonnet-5-5', { cacheRead: 1_000_000 }), 0.1);
  assert.equal(rateCost('claude-opus-5-5-20261101', { input: 1_000_000 }), 4);
  assert.equal(rateCost('a-model-nobody-priced', { input: 1_000_000 }), 2);
  assert.equal(rateCost(null, { cacheWrite: 1_000_000 }), 2.5);
  // A typical cached Sonnet message: 1,000 in, 200 out, 14,000 read → $0.0068.
  assert.equal(rateCost('claude-sonnet-5', { input: 1000, output: 200, cacheRead: 14_000 }), 0.0068);
  assert.equal(rateCost('claude-sonnet-5', { input: -5, output: Number.NaN }), 0);
  const bundle = readFileSync(resolve(ROOT, 'supabase/apply/pending-0268.sql'), 'utf8');
  for (const [model, args, usd] of [
    ['claude-haiku-4-5-20251001', '1000000, 0, 0, 0', '1.000000'],
    ['claude-sonnet-5', '0, 1000000, 0, 0', '10.000000'],
    ['claude-sonnet-5-5', '0, 0, 1000000, 0', '0.100000'],
    ['claude-opus-5-5-20261101', '1000000, 0, 0, 0', '4.000000'],
    ['a-model-nobody-priced', '1000000, 0, 0, 0', '2.000000'],
  ]) {
    assert.ok(bundle.includes(`coach_ai_rate_cost('${model}', ${args}) is distinct from ${usd}`), `§2 checks ${model}`);
  }
});
