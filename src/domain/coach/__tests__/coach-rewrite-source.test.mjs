import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildCoachRewriteDeploy, DEPLOY_COPY } from '../../../../scripts/build-coach-rewrite-deploy.mjs';
import { AI_APP_TIMEOUT_MS } from '../../ai/ai-call.ts';
import { narrowRewriteRequest, REWRITE_LIMITS, REWRITE_SCHEMA, REWRITE_SYSTEM, rewriteFromModelText, rewriteUserTurn } from '../rewrite.ts';
import { rewriteSystem } from '../rewrite-wire.ts';
import { AUTHOR_CATALOGUE } from '../author-catalogue.ts';

/*
 * SOURCE TESTS for supabase/functions/coach-rewrite/index.ts (Deno, live API, live meter — neither reachable from
 * `node --test`), its paste copy, and the wire it shares with the app (Holt Listens, PO D11/D12/D13).
 */
const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('supabase/functions/coach-rewrite/index.ts');
const WIRE = read('src/domain/coach/rewrite-wire.ts');
const at = (needle, hay = SRC) => {
  const i = hay.indexOf(needle);
  assert.ok(i >= 0, `expected to find: ${needle}`);
  return i;
};

test('request → ⛔ medical guard → credit (Premium AI, consent) → model → shape check → settle, in that order', () => {
  const order = [
    at('narrowRewriteRequest(raw)'),
    at('medicalRoute(line)'),
    at("supabase.rpc('coach_ai_reserve', { p_action: 'program', p_fn: FN })"),
    at("fetch('https://api.anthropic.com/v1/messages'"),
    at('if (!rewriteFromModelText(text))'),
    at("await settle('ok')"),
  ];
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(SRC, /const FN = 'coach-rewrite';/);
});

test('the guard checks every line they said AND Holt’s brief, before any credit', () => {
  assert.match(SRC, /for \(const line of \[\.\.\.request\.said, request\.brief\]\)/);
  assert.match(read('src/data/coach-rewrite-live.ts'), /for \(const line of \[\.\.\.req\.said, req\.brief\]\) if \(medicalRoute\(line\) !== 'clear'\)/);
});

test('CORS preflight answered; one cached system block; structured output; thinking off', () => {
  assert.match(SRC, /if \(req\.method === 'OPTIONS'\) return new Response\('ok', \{ headers: CORS \}\);/);
  assert.match(SRC, /system: \[\{ type: 'text', text: REWRITE_SYSTEM, cache_control: \{ type: 'ephemeral' \} \}\]/);
  assert.match(SRC, /format: \{ type: 'json_schema', schema: REWRITE_SCHEMA \}/);
  assert.match(SRC, /thinkingOff: true/);
});

test('the function’s prompt IS the app’s prompt (rules + the same catalogue)', () => {
  assert.match(SRC, /const REWRITE_SYSTEM = rewriteSystem\(AUTHOR_CATALOGUE\);/);
  assert.equal(REWRITE_SYSTEM, rewriteSystem(AUTHOR_CATALOGUE));
  assert.ok(REWRITE_SYSTEM.includes(AUTHOR_CATALOGUE));
});

test('⛔ D13: nowhere to write a weight — no load field in the schema, and the prompt forbids one', () => {
  const fields = JSON.stringify(REWRITE_SCHEMA);
  for (const f of ['weight', 'load', 'lbs', 'kg', 'percent', 'rpe']) assert.ok(!new RegExp(`"${f}"`, 'i').test(fields), `no "${f}" field`);
  assert.match(REWRITE_SYSTEM, /Never write a weight or a load of any kind/);
});

test('the clocks: function 75 s inside the app’s 90 s (contract §3), and the app’s table agrees', () => {
  assert.match(SRC, /const UPSTREAM_MS = 75_000;/);
  // coach-rewrite-live.ts imports `@/` modules node cannot resolve — read its clock from the source.
  assert.match(read('src/data/coach-rewrite-live.ts'), /export const REWRITE_TIMEOUT_MS = 90_000;/);
  assert.equal(AI_APP_TIMEOUT_MS['coach-rewrite'], 90_000);
});

test('the wire file has no imports — the paste copy inlines it whole', () => {
  assert.doesNotMatch(WIRE, /^import /m);
});

test('the request is narrowed and bounded; the user turn carries what they said, the brief and the weeks', () => {
  const r = narrowRewriteRequest({
    said: ['', 'add rear delts', 42, 'x'.repeat(5000)],
    brief: 'rear delts Tue/Thu',
    athlete: { goal: 'muscle', level: 'intermediate', equipment: ['dumbbell', 7], limitations: [] },
    program: 'Week 4:\n  Day 1 Pull: ...',
    name: '8-Week Muscle Block',
    extra: 'dropped',
  });
  assert.deepEqual(r.said.map((l) => l.length), [14, REWRITE_LIMITS.line]);
  assert.deepEqual(r.athlete.equipment, ['dumbbell']);
  assert.equal('extra' in r, false);
  const turn = rewriteUserTurn(r);
  assert.match(turn, /Program: 8-Week Muscle Block/);
  assert.match(turn, /- "add rear delts"/);
  assert.match(turn, /Your plan from the conversation: rear delts Tue\/Thu/);
  assert.match(turn, /The weeks still ahead:\nWeek 4:/);
  // Junk off the wire is a bad request, never a throw.
  assert.deepEqual(narrowRewriteRequest(null).said, []);
  assert.equal(narrowRewriteRequest('nope').program, '');
});

test('the shape check: JSON with sessions or weeks reads; anything else is null', () => {
  assert.equal(rewriteFromModelText('not json'), null);
  assert.equal(rewriteFromModelText('{"say":"hi"}'), null);
  const p = rewriteFromModelText('{"say":"Done.","sessions":[{"name":"Pull","rows":[{"key":"db-rear-delt-fly","sets":3,"reps":15}]}]}');
  assert.equal(p.sessions[0].rows[0].key, 'db-rear-delt-fly');
});

test('the paste copy is current, has no src/ import, and is generated', () => {
  const built = buildCoachRewriteDeploy();
  assert.equal(read(DEPLOY_COPY), built.replace(/\r\n/g, '\n'), 'run node scripts/build-coach-rewrite-deploy.mjs');
  assert.doesNotMatch(built, /'\.\.\/\.\.\/\.\.\/src\//);
  assert.match(built, /GENERATED, DO NOT EDIT/);
});
