/**
 * output-scan.test.mjs — what HOLT SAYS, against the two-way corpus and against real recorded output
 * (AI Road to 10 Sprint 2, CH-2 · audit C-I1, C-D6). Free and offline.
 *
 *   · `SAID_STOP` must stop with the right kind; `SAID_PASS` must flow (`src/domain/coach/__tests__/safety-both-ways.mjs`).
 *   · REAL output must flow: every recorded live kitchen reply (87, 2026-09-25), every recorded dish (168, 09-26), every
 *     exercise name and every published coaching record (Holt answers from those records word for word) — the
 *     `feedback_test_fixtures_must_be_real_input` rule. Found this way: "band-shoulder-dislocate" is an exercise.
 *   · Form check's sentence guard carries a byte-identical copy of the shared clinical list.
 *   · The module is import-free and its private names cannot collide with the modules it is inlined beside.
 *
 * Run (from the repo root):  node --experimental-strip-types --test src/domain/ai/__tests__/output-scan.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CLINICAL_TERMS, scanReply, scanStringsOf, scanTexts } from '../output-scan.ts';
import { SAID_PASS, SAID_STOP } from '../../coach/__tests__/safety-both-ways.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const jsonl = (rel) => read(rel).split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));

test('⛔ every line Holt must not keep is stopped, with the right kind', () => {
  assert.ok(SAID_STOP.length >= 70, `the stop side keeps growing (${SAID_STOP.length})`);
  const missed = [];
  for (const l of SAID_STOP) {
    const r = scanReply(l.text, l.asked);
    if (!r.hit || r.kind !== l.kind) missed.push(`${l.kind} ← ${JSON.stringify(r)} | ${l.text}`);
  }
  assert.deepEqual(missed, []);
});

test('⚠ ordinary coaching, food and the stop line itself flow', () => {
  assert.ok(SAID_PASS.length >= 50, `the pass side keeps growing (${SAID_PASS.length})`);
  const stopped = SAID_PASS.map((l) => ({ l, r: scanReply(l.text, l.asked) })).filter((x) => x.r.hit);
  assert.deepEqual(stopped.map((x) => `${x.r.kind}:${x.r.match} | ${x.l.text}`), []);
});

test('⚠ REAL output flows — every recorded live kitchen reply and every recorded dish', () => {
  const replies = jsonl('scripts/holt-corpus/live-kitchen-2026-09-25.jsonl');
  assert.ok(replies.length >= 80);
  const hits = replies.map((r) => ({ r, s: scanReply(r.reply ?? '', r.text) })).filter((x) => x.s.hit);
  assert.deepEqual(hits.map((x) => `${x.s.kind}:${x.s.match} | ${x.r.reply}`), []);

  let dishes = 0;
  const bad = [];
  for (const f of ['live-kitchen-dishes-2026-09-26.jsonl', 'live-kitchen-dishes-2026-09-26-run1.jsonl', 'live-kitchen-dishes-2026-09-26-retest.jsonl']) {
    for (const row of jsonl(`scripts/holt-corpus/${f}`)) {
      for (const o of row.raw?.options ?? []) {
        dishes += 1;
        const s = scanTexts([o.name, o.why, ...(o.steps ?? []), ...(o.ingredients ?? []).map((i) => i.text)], row.ask);
        if (s.hit) bad.push(`${o.name}: ${s.kind} ${s.match}`);
      }
    }
  }
  assert.ok(dishes >= 150, `dishes read: ${dishes}`);
  assert.deepEqual(bad, []);
});

test('⚠ REAL app content flows — every exercise name and every coaching record Holt quotes', () => {
  for (const rel of ['src/domain/exercise-relationships/source/exercises.json', 'src/domain/exercise-coaching/content/coaching_content.json']) {
    const strings = scanStringsOf(JSON.parse(read(rel)), 1e7);
    assert.ok(strings.length > 5000, `${rel}: ${strings.length} strings`);
    const hits = new Set(strings.map((s) => scanReply(s)).filter((r) => r.hit).map((r) => `${r.kind}:${r.match}`));
    assert.deepEqual([...hits], [], rel);
  }
});

test('`asked` only ever ADDS a stop — a reply to a symptom that says "that’s normal" is about the symptom', () => {
  const reply = 'Done — swapped tomorrow to an upper day. That’s normal after a big week.';
  assert.equal(scanReply(reply).hit, false, 'alone, "a big week" is training');
  assert.equal(scanReply(reply, 'my legs are sore, swap tomorrow').hit, true);
  assert.equal(scanReply(reply, 'swap tomorrow please').hit, false);
  // Never the other way: a stop without `asked` is a stop with it.
  for (const l of SAID_STOP.filter((x) => !x.asked)) assert.equal(scanReply(l.text, 'anything at all').hit, true, l.text);
});

test('"normal" stops beside a symptom, in the next sentence of a pointing-back one, never on its own', () => {
  assert.equal(scanReply('That’s normal.').hit, false);
  assert.equal(scanReply('Your bench stalled at 225. That’s normal.').hit, false);
  assert.equal(scanReply('Your knee clicked on the last rep. That’s normal.').hit, true);
  assert.equal(scanReply('That’s normal. Your quads will ache for a day.').hit, true);
  // A long sentence with its own subject is read on its own.
  assert.equal(scanReply('Your knee clicked on the last rep. A stall after three months of linear gains is normal.').hit, false);
  // Curly apostrophes (a phone keyboard) read like straight ones.
  assert.deepEqual(scanReply('it’s just gas'), scanReply("it's just gas"));
});

test('scanTexts reads each field on its own; scanStringsOf walks a value; junk is clear', () => {
  assert.deepEqual(scanTexts(['Crack 2 eggs into the pan.', 'Cook until set, about 3 minutes.']), { hit: false });
  assert.equal(scanTexts(['Fine.', 'Take 2 tablets.']).hit, true);
  assert.deepEqual(scanStringsOf({ a: ['x', { b: 'y' }], c: 3, d: null }), ['x', 'y']);
  for (const junk of [null, undefined, 42, '', '   ', {}]) assert.deepEqual(scanReply(junk), { hit: false });
  assert.deepEqual(scanTexts([null, 3, {}]), { hit: false });
});

test('⚠ ONE clinical list: form check’s sentence guard holds a byte-identical copy', () => {
  const block = (src) => {
    const a = src.indexOf('// ── CLINICAL TERMS: begin ──');
    const b = src.indexOf('// ── CLINICAL TERMS: end ──');
    assert.ok(a > 0 && b > a, 'markers present');
    return src.slice(a, b).replace(/\r\n/g, '\n').match(/=\s*\n?\s*(\/.*\/i);/s)[1];
  };
  const mine = block(read('src/domain/ai/output-scan.ts'));
  const form = block(read('src/domain/coach/form-check.ts'));
  assert.equal(form, mine, 'change one and you change the other, in the same commit');
  assert.equal(mine, CLINICAL_TERMS.toString());
  for (const w of ['valgus', 'varus', 'kyphosis', 'kyphotic', 'lordosis', 'scoliosis', 'impingement', 'anterior pelvic tilt']) {
    assert.ok(CLINICAL_TERMS.test(`a bit of ${w} there`), w);
  }
});

test('⚠ no lookbehind anywhere — the phone runs Hermes, and a regex that fails to compile breaks the chat at load', () => {
  const src = read('src/domain/ai/output-scan.ts');
  // The one lookbehind allowed is a single character class — the sentence splitter form-check.ts already ships on
  // build 11 (`(?<=[.!?])`). Anything longer is taken out as text (`scanIdiomsOut`).
  const behinds = [...src.matchAll(/\(\?<[!=]/g)].map((m) => src.slice(m.index, src.indexOf(')', m.index) + 1));
  assert.deepEqual(behinds.filter((b) => !/^\(\?<[!=]\[[^\]]+\]\)$/.test(b)), [], 'idioms are taken out as text, never with a long lookbehind');
  // …and the idioms still flow, and the injuries still stop.
  assert.equal(scanReply("It won't hurt to take an extra rest day — that's normal.").hit, false);
  assert.equal(scanReply('Band shoulder dislocates are a normal warm-up.').hit, false);
  assert.equal(scanReply('It sounds like you dislocated your shoulder.').hit, true);
  assert.equal(scanReply('That hurt in your knee is normal.').hit, true);
});

test('import-free, and no private name collides with the modules it is inlined beside', () => {
  const src = read('src/domain/ai/output-scan.ts');
  assert.ok(!/^import /m.test(src), 'the paste builders refuse a module with imports');
  const names = (s) => new Set([...s.matchAll(/^(?:export\s+)?(?:const|let|function|type|interface)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
  const mine = names(src);
  const neighbours = [
    'src/domain/coach/medical-routing.ts',
    'src/domain/coach/ask-wire.ts',
    'src/domain/coach/ask-tools.ts',
    'src/domain/coach/ask-turn.ts',
    'src/domain/coach/form-check.ts',
    'src/domain/coach/pose/pose-facts.ts',
    'src/domain/coach/interpret-narrow.ts',
    'src/domain/ai/meter-server.ts',
    'src/domain/nutrition/kitchen-dishes.ts',
    'src/domain/nutrition/kitchen-foods.ts',
  ];
  for (const rel of neighbours) {
    const clash = [...names(read(rel))].filter((n) => mine.has(n));
    assert.deepEqual(clash, [], rel);
  }
});
