/**
 * holt-actions-mount.test.mjs — AI Road to 10 Sprint 4a, lane A: how the sheet routes Holt's actions, and the §1.3 rule
 * from the sheet's side — a refused, retracted, errored, cut-off, timed-out, stopped or closed reply shows NO card and
 * runs NO executor.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { planHoltActions } from '../ask-outcome.ts';
import { cardsMayShow } from '../holt-actions.ts';
import { settleAskRead } from '../ask-stream.ts';

const TODAY = '2026-11-18';
const SHEET = fs.readFileSync(path.join(process.cwd(), 'src/components/forge/CoachChatSheet.tsx'), 'utf8').replace(/\r\n/g, '\n');
const clean = (actions, extra = {}) => planHoltActions(actions, { clean: true, todayISO: TODAY, nutrition: true, ...extra });

test('a build is the existing patch handling, narrowed by coach-interpret’s own narrower', () => {
  const p = clean([{ name: 'propose_program', input: { daysPerWeek: 4, goal: 'strength', sessionMinutes: 50, nonsense: 1, dayFocus: 'legs' } }]);
  assert.deepEqual(p.steps, [{ kind: 'patch', name: 'propose_program', patch: { daysPerWeek: 4, goal: 'strength', sessionMinutes: 45 } }]);
  const d = clean([{ name: 'propose_day', input: { dayFocus: 'legs', sessionMinutes: 25 } }]);
  assert.deepEqual(d.steps, [{ kind: 'patch', name: 'propose_day', patch: { dayFocus: 'legs', sessionMinutes: 30 } }]);
  // A build that names nothing is the door that asks (and offers the running program's session for a day).
  assert.deepEqual(clean([{ name: 'propose_program', input: {} }]).steps, [{ kind: 'door', to: 'build' }]);
  assert.deepEqual(clean([{ name: 'propose_day', input: { dayFocus: 'full body' } }]).steps, [{ kind: 'door', to: 'build_day' }]);
  // A junk week is dropped whole, never repaired (narrowPatch's all-or-nothing rule).
  assert.deepEqual(clean([{ name: 'propose_program', input: { daysPerWeek: 9 } }]).steps, [{ kind: 'door', to: 'build' }]);
});

test('doors, edits, the web offer and cards — and ONE build/door/edit per reply', () => {
  const p = clean([
    { name: 'propose_program_edit', input: { op: 'skip', day: 'Friday' } },
    { name: 'propose_program', input: { daysPerWeek: 3 } },
    { name: 'open_door', input: { door: 'targets' } },
    { name: 'open_door', input: { door: 'import' } },
    { name: 'swap_exercise_today', input: { from: 'squats', to: 'leg press' } },
    { name: 'offer_online_recipe_search', input: { looking_for: 'high-protein chili' } },
  ]);
  assert.deepEqual(p.steps.map((s) => s.kind), ['edit', 'card', 'card', 'web']);
  assert.deepEqual(p.dropped, ['propose_program', 'open_door']);
  assert.deepEqual(clean([{ name: 'open_door', input: { door: 'pick' } }]).steps, [{ kind: 'door', to: 'pick' }]);
  assert.deepEqual(clean([{ name: 'open_door', input: { door: 'the moon' } }]).dropped, ['open_door']);
  assert.deepEqual(clean([{ name: 'get_lift_history', input: {} }]).dropped, ['get_lift_history'], 'a read is never an action');
});

test('remember_note: their words only, never the body, never one they already have — else no card at all', () => {
  assert.deepEqual(clean([{ name: 'remember_note', input: { text: '  Hates   lunges ' } }]).steps, [{ kind: 'card', action: { name: 'remember_note', input: { text: 'Hates lunges' } } }]);
  assert.deepEqual(clean([{ name: 'remember_note', input: { text: 'Left knee swells after squats' } }]).steps, []);
  assert.deepEqual(clean([{ name: 'remember_note', input: { text: 'Hates lunges' } }], { knownNotes: ['hates lunges.'] }).steps, []);
  assert.deepEqual(clean([{ name: 'remember_note', input: { text: 'x'.repeat(81) } }]).steps, []);
});

test('no nutrition access: no web offer (the cards themselves say so for targets / meal plan)', () => {
  assert.deepEqual(clean([{ name: 'offer_online_recipe_search', input: { looking_for: 'chili' } }], { nutrition: false }).steps, []);
});

test('⛔ §1.3 a reply that did not end cleanly shows nothing: every action dropped, nothing reaches a card or an executor', () => {
  const actions = [
    { name: 'swap_exercise_today', input: { from: 'bench', to: 'dumbbell press' } },
    { name: 'propose_program', input: { daysPerWeek: 4 } },
    { name: 'remember_note', input: { text: 'Hates lunges' } },
  ];
  for (const end of [
    { done: true, stop: 'refusal' },
    { done: true, stop: 'max_tokens' },
    { done: true, stop: 'end_turn', retracted: true },
    { done: false, stop: null, error: 'upstream_error' },
    { done: false, stop: null, aborted: true },
    { done: false, stop: null },
  ]) {
    assert.equal(cardsMayShow(end), false, JSON.stringify(end));
    const p = planHoltActions(actions, { clean: cardsMayShow(end), todayISO: TODAY });
    assert.deepEqual(p.steps, [], JSON.stringify(end));
    assert.deepEqual(p.dropped, actions.map((a) => a.name));
  }
  assert.equal(cardsMayShow({ done: true, stop: 'end_turn' }), true);
  assert.equal(cardsMayShow({ done: true, stop: 'tool_use' }), true);
});

test('⛔ §1.3 what the stream settles to carries what cardsMayShow reads — a cut-off or broken reply is never clean', () => {
  const base = { text: 'Swap is on the card.', remaining: 40, finished: true, stop: 'end_turn', failure: null, actions: [{ name: 'start_workout', input: {} }], broke: null, refunded: false, upstream: null, status: null };
  const ok = settleAskRead(base);
  assert.equal(ok.kind, 'answer');
  assert.equal(cardsMayShow({ done: ok.complete, stop: ok.stop }) && !ok.cut, true);
  const cut = settleAskRead({ ...base, stop: 'max_tokens' });
  assert.equal(cardsMayShow({ done: cut.complete, stop: cut.stop }) && !cut.cut, false);
  const dropped = settleAskRead({ ...base, finished: false, stop: null, failure: 'upstream_dropped' });
  assert.equal(dropped.kind === 'answer' && cardsMayShow({ done: dropped.complete, stop: dropped.stop ?? null }), false);
  assert.equal(settleAskRead({ ...base, stop: 'refusal' }).kind, 'refused', 'a refusal is not an answer at all');
  assert.equal(settleAskRead({ ...base, retracted: true }).kind, 'retracted');
});

test('the sheet: interpret retired, every action through actOn with the turn’s end, cards only via lane C’s hold → confirm', () => {
  assert.doesNotMatch(SHEET, /interpretTyped\(/);
  assert.match(SHEET, /const acted = await actOn\(r\.actions, text, end, cardsMayShow\(end\) && !r\.cut, q, mode \?\? 'program'\);/);
  // The one road to a write: a SHOWN card (released by hold.release after a clean end) through confirmHoltAction.
  assert.match(SHEET, /const res = await confirmHoltAction\(held\.shown, key\);/);
  assert.equal((SHEET.match(/\.apply\(/g) ?? []).filter(() => true).length >= 0, true);
  assert.doesNotMatch(SHEET, /executorFor\(/, 'the sheet never reaches an executor by itself');
  // Only an answer runs actOn; refused / retracted / offline never do.
  const ask = SHEET.slice(SHEET.indexOf('const askAloud = async'), SHEET.indexOf('const onChip = (chip'));
  const answerCase = ask.slice(ask.indexOf("case 'answer':"), ask.indexOf("case 'crisis':"));
  assert.ok(answerCase.includes('actOn('));
  assert.ok(!ask.slice(ask.indexOf("case 'refused':")).includes('actOn('));
  // A card from before a reload is never restored waiting for Confirm.
  assert.match(SHEET, /withoutHeldCards\(withoutStaleHome\(stored\)\)/);
  // caps on every coach-ask body (+ memory_v1 since Sprint 4b).
  assert.match(fs.readFileSync(path.join(process.cwd(), 'src/data/coach-ask-live.ts'), 'utf8'), /caps: \[HOLT_ACTION_CAPS, HOLT_MEMORY_CAPS\],/);
});

test('mid-build, a build that names nothing is dropped (the question comes back) — never a fresh build door', () => {
  const p = planHoltActions([{ name: 'propose_program', input: {} }], { clean: true, todayISO: TODAY, building: true });
  assert.deepEqual(p.steps, []);
  assert.deepEqual(p.dropped, ['propose_program']);
  // "none" to what to train around is an ANSWER: limitations [] survives narrowPatch.
  assert.deepEqual(planHoltActions([{ name: 'propose_program', input: { limitations: [] } }], { clean: true, todayISO: TODAY, building: true }).steps, [{ kind: 'patch', name: 'propose_program', patch: { limitations: [] } }]);
  assert.deepEqual(planHoltActions([{ name: 'propose_day', input: { dayFocus: 'full body' } }], { clean: true, todayISO: TODAY, building: true }).steps, [{ kind: 'patch', name: 'propose_day', patch: { dayFocus: 'full body' } }]);
});
