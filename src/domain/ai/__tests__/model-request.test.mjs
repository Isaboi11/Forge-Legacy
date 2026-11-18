import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  EFFORTS,
  FALLBACK_BETA,
  KNOWN_MODELS,
  anthropicHeaders,
  answeredBy,
  fellBack,
  isKnownModel,
  modelFamily,
  requestBetas,
  requestFields,
} from '../model-request.ts';
import { MODEL_RATES, rateKeyFor } from '../model-rates.ts';

/*
 * AI Road to 10 Sprint 3b, PL-7 — contract §1.2: "a test asserts no model is sent a field it rejects".
 *
 * REJECTS is written from the claude-api skill (models + migration guides, cached 2026-11-03, read 2026-11-18) and NOT
 * from model-request.ts's own table, so a wrong rule there fails here instead of agreeing with itself.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

const HIGH_PLUS = new Set(['xhigh', 'max']);

/** Does `model` reject this body? Returns the reason, or null. */
function rejects(model, body) {
  const t = body.thinking;
  const e = body.output_config?.effort;
  const reasons = [];
  if (t && Object.keys(t).some((k) => k !== 'type')) reasons.push('extra field inside thinking');
  if (t?.type === 'enabled') reasons.push('budget thinking is removed');
  switch (model) {
    case 'claude-sonnet-5':
      if (t?.type === 'between_tools') reasons.push('between_tools is Sonnet 5.5 only');
      if (body.fallbacks) reasons.push('Sonnet 5 is a fallback target, not a fallback source');
      break;
    case 'claude-sonnet-5-5':
      if (t?.type === 'disabled') reasons.push('Sonnet 5.5: disabled is a 400 — between_tools');
      if (t?.type === 'between_tools' && HIGH_PLUS.has(e)) reasons.push('Sonnet 5.5: between_tools only at effort <= high');
      break;
    case 'claude-haiku-5-5':
      if (t?.type === 'between_tools') reasons.push('between_tools is Sonnet 5.5 only');
      if (t?.type === 'disabled' && HIGH_PLUS.has(e)) reasons.push('Haiku 5.5: disabled only at effort <= high');
      if (body.fallbacks) reasons.push('Haiku 5.5 has no server-side fallback (array = 400, "default" does nothing)');
      break;
    case 'claude-opus-5-5':
      if (t?.type === 'disabled') reasons.push('Opus 5.5: thinking cannot be disabled at any effort');
      if (t?.type === 'between_tools') reasons.push('between_tools is Sonnet 5.5 only');
      break;
    case 'claude-opus-5':
      if (t?.type === 'between_tools') reasons.push('between_tools is Sonnet 5.5 only');
      if (t?.type === 'disabled' && HIGH_PLUS.has(e)) reasons.push('Opus 5: disabled only at effort <= high');
      break;
    case 'claude-haiku-4-5':
      if (e) reasons.push('Haiku 4.5 rejects effort');
      if (t) reasons.push('Haiku 4.5 takes no disabled / adaptive / between_tools thinking');
      if (body.fallbacks) reasons.push('no fallback on Haiku 4.5');
      break;
    default:
      if (t || e || body.fallbacks) reasons.push('an unknown model gets the minimal request');
  }
  return reasons.length ? reasons.join('; ') : null;
}

const KNOB_SETS = [];
for (const thinkingOff of [false, true])
  for (const adaptive of [false, true])
    for (const effort of [null, ...EFFORTS])
      for (const format of [undefined, { type: 'json_schema', schema: { type: 'object' } }])
        for (const fallback of [undefined, false]) KNOB_SETS.push({ thinkingOff, adaptive, effort, format, fallback });

const MODELS = [...KNOWN_MODELS, 'claude-haiku-4-5-20251001', 'claude-sonnet-5-5-20261001', 'claude-fable-5-2', 'gpt-something', '', null];

test('no model is ever sent a field it rejects — every model × every knob a function uses', () => {
  let checked = 0;
  for (const model of MODELS) {
    const family = modelFamily(model);
    for (const k of KNOB_SETS) {
      const body = requestFields(model, k);
      const why = rejects(family === 'unknown' ? 'unknown' : family, body);
      assert.equal(why, null, `${model} ${JSON.stringify(k)} → ${JSON.stringify(body)}: ${why}`);
      checked++;
    }
  }
  assert.ok(checked > 1000, `${checked} combinations`);
});

test('the shapes the functions use today, model by model', () => {
  const off = { thinkingOff: true, effort: 'low' };
  assert.deepEqual(requestFields('claude-sonnet-5', off), { thinking: { type: 'disabled' }, output_config: { effort: 'low' } }, 'Sonnet 5 = the bytes every function sends today');
  assert.deepEqual(requestFields('claude-sonnet-5-5', off), { thinking: { type: 'between_tools' }, output_config: { effort: 'low' }, fallbacks: 'default' });
  assert.deepEqual(requestFields('claude-haiku-5-5', off), { thinking: { type: 'disabled' }, output_config: { effort: 'low' } });
  assert.deepEqual(requestFields('claude-opus-5-5', off), { output_config: { effort: 'low' }, fallbacks: 'default' });
  assert.deepEqual(requestFields('claude-haiku-4-5', off), {});
  // workout-tidy: adaptive at low effort.
  assert.deepEqual(requestFields('claude-sonnet-5', { adaptive: true, effort: 'low' }), { thinking: { type: 'adaptive' }, output_config: { effort: 'low' } });
  assert.deepEqual(requestFields('claude-haiku-4-5', { adaptive: true, effort: 'low' }), {});
  // Structured output rides along everywhere, Haiku 4.5 included.
  const f = { type: 'json_schema', schema: { type: 'object' } };
  assert.deepEqual(requestFields('claude-haiku-4-5', { ...off, format: f }), { output_config: { format: f } });
  assert.deepEqual(requestFields('claude-haiku-5-5', { ...off, format: f }).output_config, { effort: 'low', format: f });
});

test('thinking off above high effort runs adaptive instead of a 400 — the effort is kept', () => {
  assert.deepEqual(requestFields('claude-sonnet-5-5', { thinkingOff: true, effort: 'max' }), { output_config: { effort: 'max' }, fallbacks: 'default' });
  assert.deepEqual(requestFields('claude-haiku-5-5', { thinkingOff: true, effort: 'xhigh' }), { output_config: { effort: 'xhigh' } });
  assert.deepEqual(requestFields('claude-sonnet-5-5', { thinkingOff: true, effort: 'high' }).thinking, { type: 'between_tools' });
});

test('the refusal fallback: on by default where one exists, with its beta header — and only there', () => {
  for (const m of KNOWN_MODELS) {
    const f = requestFields(m, { thinkingOff: true, effort: 'low' });
    const h = anthropicHeaders('k', f);
    if (f.fallbacks) {
      assert.equal(f.fallbacks, 'default');
      assert.equal(h['anthropic-beta'], FALLBACK_BETA, m);
    } else assert.equal(h['anthropic-beta'], undefined, m);
  }
  assert.deepEqual(KNOWN_MODELS.filter((m) => requestFields(m).fallbacks), ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-opus-5']);
  assert.equal(requestFields('claude-sonnet-5-5', { fallback: false }).fallbacks, undefined, 'a caller can turn it off');
  assert.deepEqual(requestBetas({}), []);
  const h = anthropicHeaders('sk', {});
  assert.deepEqual(h, { 'x-api-key': 'sk', 'anthropic-version': '2023-06-01', 'content-type': 'application/json' });
});

test('families: dated ids belong to their model; an unknown id is never mistaken for a near one', () => {
  assert.equal(modelFamily('claude-haiku-4-5-20251001'), 'claude-haiku-4-5');
  assert.equal(modelFamily('claude-sonnet-5-5'), 'claude-sonnet-5-5');
  assert.equal(modelFamily('claude-sonnet-5'), 'claude-sonnet-5');
  assert.equal(modelFamily('claude-sonnet-50'), 'unknown', 'a prefix only counts at a dash');
  assert.equal(modelFamily('claude-opus-5-5-x'), 'claude-opus-5-5');
  assert.equal(modelFamily(undefined), 'unknown');
  assert.equal(isKnownModel('claude-haiku-5-5'), true);
  assert.equal(isKnownModel('claude-haiku-4-5-20251001'), false, 'config only takes the plain ids');
});

test('every model a function can be configured to run has its own rate (never the default)', () => {
  for (const m of KNOWN_MODELS) assert.equal(rateKeyFor(m), m, m);
  for (const k of Object.keys(MODEL_RATES)) if (k !== 'default') assert.ok(KNOWN_MODELS.includes(k), `${k} is priced but not configurable`);
});

test('the answering model: the response says, else the one asked for; a fallback is seen', () => {
  assert.equal(answeredBy({ model: 'claude-sonnet-5' }, 'claude-sonnet-5-5'), 'claude-sonnet-5');
  assert.equal(answeredBy({}, 'claude-sonnet-5-5'), 'claude-sonnet-5-5');
  assert.equal(answeredBy(null, 'claude-haiku-5-5'), 'claude-haiku-5-5');
  assert.equal(fellBack({ usage: { iterations: [{ type: 'message' }, { type: 'fallback_message' }] } }), true);
  assert.equal(fellBack({ usage: { iterations: [{ type: 'message' }] } }), false);
  assert.equal(fellBack({ usage: {} }), false);
});

test('0274 admits exactly the models and efforts this module can send', () => {
  const sql = readFileSync(resolve(ROOT, 'supabase/migrations/0274_ai_model_config.sql'), 'utf8').replace(/\r\n/g, '\n');
  const list = (name) => {
    const m = new RegExp(`${name} in \\(([^)]*)\\)`).exec(sql);
    assert.ok(m, `${name} CHECK in 0274`);
    return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
  };
  assert.deepEqual(list('model').sort(), [...KNOWN_MODELS].sort());
  assert.deepEqual(list('effort').sort(), [...EFFORTS].sort());
});

test('model-request.ts has no import (an inlined module may not)', () => {
  const src = readFileSync(resolve(ROOT, 'src/domain/ai/model-request.ts'), 'utf8');
  assert.equal(/^import /m.test(src), false);
  const cfg = readFileSync(resolve(ROOT, 'src/domain/ai/model-config.ts'), 'utf8');
  assert.equal(/^import /m.test(cfg), false);
});

test('web search only goes to a model that has it (never Haiku)', async () => {
  const { takesWebSearch } = await import('../model-request.ts');
  assert.deepEqual(KNOWN_MODELS.filter(takesWebSearch), ['claude-sonnet-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-opus-5']);
  assert.equal(takesWebSearch('nope'), false);
});
