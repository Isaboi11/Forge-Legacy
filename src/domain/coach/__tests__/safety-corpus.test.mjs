/**
 * safety-corpus.test.mjs — the code guard, against 704 real-shaped messages, on every run. Free and offline.
 *
 * The corpus lives in `scripts/holt-corpus/` and is the one the live runs use (`run-live.mjs`). Each line
 * carries the route a coach app should take: `acute` (damage), `advice` (a question about the body),
 * `urgent` (an emergency now), `crisis`, `sensitive`, `swap` (soreness + a request to change training),
 * `benign` / `benign_soreness` (must NOT stop).
 *
 * ⚠ THESE ARE FLOORS AND CEILINGS, NOT EXACT COUNTS. The model catches what the guard does not, so the
 * guard is not required to stop everything — but it may never quietly get worse, and it may never start
 * stopping the ordinary sentences the product is sold with ("my shoulder hurts, swap tomorrow"). Numbers
 * are the measured ones on 2026-09-22 with a little slack; tighten them when the guard improves.
 *
 * Run:  node --test --experimental-strip-types src/domain/coach/__tests__/safety-corpus.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { medicalRoute } from '../medical-routing.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const corpus = (f) =>
  readFileSync(path.join(here, '../../../../scripts/holt-corpus', f), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));

const safety = corpus('corpus-safety.jsonl');
const routed = safety.map((r) => ({ ...r, got: medicalRoute(r.text) }));
const of = (label) => routed.filter((r) => r.route === label);
const stopped = (rows) => rows.filter((r) => r.got !== 'clear');

test('the corpus is the one the live runs use', () => {
  assert.ok(safety.length >= 700, `expected the 704-line safety corpus, got ${safety.length}`);
});

test('⛔ an emergency or a crisis is caught in code, with the right kind of stop', () => {
  const urgent = of('urgent');
  const right = urgent.filter((r) => r.got === 'urgent' || r.got === 'crisis');
  assert.ok(right.length >= 45, `emergencies caught in code: ${right.length}/${urgent.length}`);
  // Whatever else moves, an emergency must never come back as a training patch.
  assert.equal(urgent.filter((r) => r.got === 'clear' && /chest pain|passed out|can't breathe|throat/i.test(r.text)).length, 0);
});

test('⛔ damage and questions about the body stop often enough that the model is a second line, not the only one', () => {
  assert.ok(stopped(of('acute')).length >= 80, `acute stopped: ${stopped(of('acute')).length}`);
  assert.ok(stopped(of('advice')).length >= 25, `advice stopped: ${stopped(of('advice')).length}`);
  assert.ok(stopped(of('sensitive')).length >= 30, `sensitive stopped: ${stopped(of('sensitive')).length}`);
});

test('⚠ the sentence the feature is sold with still goes through', () => {
  const falseStops = stopped(of('swap'));
  assert.ok(falseStops.length <= 3, `swap requests stopped: ${falseStops.map((r) => r.text).join(' | ')}`);
  assert.equal(medicalRoute('My shoulder hurts, swap tomorrow'), 'clear');
});

test('⚠ ordinary gym talk is not a medical event', () => {
  const falseStops = stopped([...of('benign'), ...of('benign_soreness')]);
  assert.ok(falseStops.length <= 10, `benign stopped (${falseStops.length}): ${falseStops.slice(0, 6).map((r) => r.text).join(' | ')}`);
});

test('⚠ the guard stays off the other corpora — it is not a net over everything typed', () => {
  const others = [...corpus('corpus-misc.jsonl'), ...corpus('corpus-build.jsonl')];
  const stops = others.filter((r) => medicalRoute(r.text) !== 'clear');
  assert.ok(stops.length <= 45, `non-safety corpora stopped: ${stops.length}`);
});
