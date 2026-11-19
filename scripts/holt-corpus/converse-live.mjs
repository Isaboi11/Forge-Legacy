/**
 * TALK TO HOLT — LIVE CONVERSATIONS (Holt Listens step 4 seed; PO 11-19: "Claude Chat or ChatGPT in Holt's voice,
 * integrated with the app — start giving the examples and testing it").
 *
 * Each conversation is the athlete's own lines, typed one by one into the REAL engine (`engine/turn.ts` → `act.ts` →
 * build / edit / change), with the REAL models behind it: Holt's chat (coach-ask's caps prompt + `change_v1`, same
 * bytes as the function), the rewriter (`rewrite.ts`) and the program writer (coach-author). The world is a fake store
 * seeded with a real-shaped program. A "Do it" is tapped when it appears. Then the SAVED RESULT is checked in code.
 *
 * ⚠ SPENDS REAL MONEY (PO $50 cap for the push; quote first).
 *   FL_ENV_FILE=…/.env.local node --experimental-strip-types scripts/holt-corpus/converse-live.mjs [--only id] [--cap 2]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canDoExercise } from '../../src/domain/home-gym/equipment.ts';
import { plannedDays, trainingDays } from '../../src/domain/program/progress-core.ts';
import { assemble } from '../../src/domain/coach/assemble.ts';
import { ASK_OUTPUT_CAP, askUserTurn, cleanContext } from '../../src/domain/coach/ask-wire.ts';
import { ASK_ACTION_CHANGE, ASK_ACTIONS, ASK_ACTIONS_V1, ASK_TOOLS, CHANGE_PROMPT, actionAckV1 } from '../../src/domain/coach/ask-tools.ts';
import { FOOD_ACTIONS, FOOD_PROMPT, FOOD_TOOLS } from '../../src/domain/coach/ask-food-tools.ts';
import { AUTHOR_OUTPUT_CAP, AUTHOR_SCHEMA, authoredFromModelText, authorUserTurn } from '../../src/domain/coach/author.ts';
import { AUTHOR_CATALOGUE } from '../../src/domain/coach/author-catalogue.ts';
import { CHANGE_ACTIONS, LEGACY_ACTIONS, NEW_ACTIONS } from '../../src/domain/coach/holt-actions.ts';
import { REWRITE_OUTPUT_CAP, REWRITE_SCHEMA, REWRITE_SYSTEM, programText } from '../../src/domain/coach/rewrite.ts';
import { requestFields } from '../../src/domain/ai/model-request.ts';
import { contextFrom } from '../../src/domain/coach/candidates.ts';
import { limitationPatterns } from '../../src/domain/coach/rulebook/limitations.ts';
import { resetVoice } from '../../src/domain/coach/rulebook/voice.ts';
import { actOn } from '../../src/domain/coach/engine/act.ts';
import { advance } from '../../src/domain/coach/engine/build.ts';
import { clearEdit, finishTypedEdit } from '../../src/domain/coach/engine/edit.ts';
import { fakePort, recordingSink } from '../../src/domain/coach/engine/testing.ts';
import { alsoSaid, process as turn } from '../../src/domain/coach/engine/turn.ts';
import { freshRefs } from '../../src/domain/coach/engine/types.ts';
import { systemOf } from '../evals/lib/suite-kit.mjs';
import { catalog } from '../../src/domain/coach/engine/__tests__/fixtures.mjs';
import { CASES, WORLDS } from './converse-cases.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.FL_ENV_FILE ?? path.join(HERE, '../../.env.local');
const KEY = process.env.ANTHROPIC_API_KEY ?? /ANTHROPIC_API_KEY\s*=\s*"?([^"\n]+)"?/.exec(readFileSync(envFile, 'utf8'))?.[1]?.trim();
const MODEL = 'claude-sonnet-5';
const PRICE = { input: 2 / 1e6, output: 10 / 1e6, cacheWrite: 2.5 / 1e6, cacheRead: 0.2 / 1e6 };
const arg = (n) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null);
const CAP = Number(arg('--cap') ?? 2);
const ONLY = arg('--only');
const TODAY = '2026-11-19';

let spent = 0;
async function post(body) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { error: `${res.status} ${(await res.text()).slice(0, 200)}` };
  const j = await res.json();
  const u = j.usage ?? {};
  spent += (u.input_tokens ?? 0) * PRICE.input + (u.output_tokens ?? 0) * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite;
  return { j };
}
const textOf = (j) => (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
const cached = (text) => [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];

// ── coach-ask, as the function runs it with caps actions_v1 + change_v1 ──
const CHAT_SYSTEM = `${systemOf('coach-ask', 'SYSTEM_V1')}\n\n${FOOD_PROMPT}\n\n${CHANGE_PROMPT}`;
const CHAT_TOOLS = [...ASK_TOOLS, ...FOOD_TOOLS, ...ASK_ACTIONS, ...ASK_ACTIONS_V1, ...FOOD_ACTIONS, ASK_ACTION_CHANGE];
const FORWARDS = [...LEGACY_ACTIONS, ...NEW_ACTIONS, ...CHANGE_ACTIONS];
async function chat(text, history, world, building) {
  const program = world.active ? `${world.active.name}\n${programText(world.active.structure, world.marks, 0).slice(0, 2500)}` : null;
  const context = cleanContext({ ...(program ? { program } : {}), ...(building ? { building } : {}) });
  const messages = history.map((t) => ({ role: t.role === 'athlete' ? 'user' : 'assistant', content: t.text }));
  if (messages.length && messages[0].role === 'assistant') messages.unshift({ role: 'user', content: '(The athlete opened the chat with Holt.)' });
  messages.push({ role: 'user', content: askUserTurn(text, context, TODAY, { ageYears: null, minor: false }) });
  const said = [];
  const actions = [];
  for (const choice of ['auto', 'auto', 'none']) {
    const r = await post({
      model: MODEL,
      max_tokens: ASK_OUTPUT_CAP,
      ...requestFields(MODEL, { thinkingOff: true, effort: 'low' }),
      tools: CHAT_TOOLS,
      system: cached(CHAT_SYSTEM),
      ...(choice === 'none' ? { tool_choice: { type: 'none' } } : {}),
      messages,
    });
    if (r.error) return { said: [`(error ${r.error})`], actions };
    const words = textOf(r.j);
    if (words) said.push(words);
    if (r.j.stop_reason !== 'tool_use') break;
    const results = [];
    for (const b of (r.j.content ?? []).filter((c) => c.type === 'tool_use')) {
      if (FORWARDS.includes(b.name)) {
        actions.push({ name: b.name, input: b.input ?? {} });
        results.push({ type: 'tool_result', tool_use_id: b.id, content: actionAckV1(b.name) });
      } else if (b.name === 'get_program_status' && world.active) {
        results.push({ type: 'tool_result', tool_use_id: b.id, content: programText(world.active.structure, world.marks, 0).slice(0, 3800) });
      } else {
        results.push({ type: 'tool_result', tool_use_id: b.id, content: 'Nothing is logged for that yet.' });
      }
    }
    messages.push({ role: 'assistant', content: r.j.content }, { role: 'user', content: results });
  }
  return { said, actions };
}

// ── the rewriter and the writer ──
async function rewriter(user) {
  const r = await post({ model: MODEL, max_tokens: REWRITE_OUTPUT_CAP, thinking: { type: 'disabled' }, output_config: { effort: 'low', format: { type: 'json_schema', schema: REWRITE_SCHEMA } }, system: cached(REWRITE_SYSTEM), messages: [{ role: 'user', content: user }] });
  return r.error ? { kind: 'unavailable' } : { kind: 'ok', text: textOf(r.j) };
}
/* coach-author's SYSTEM interpolates the catalogue — built the way author-live.mjs builds it. */
const AUTHOR_FN = readFileSync(path.join(HERE, '../../supabase/functions/coach-author/index.ts'), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const AUTHOR_SYSTEM = (() => {
  const at = AUTHOR_FN.indexOf('const SYSTEM = `') + 'const SYSTEM = `'.length;
  return AUTHOR_FN.slice(at, AUTHOR_FN.indexOf('`;', at)).replace('${AUTHOR_CATALOGUE}', AUTHOR_CATALOGUE);
})();
async function author(req) {
  const r = await post({ model: MODEL, max_tokens: AUTHOR_OUTPUT_CAP[req.kind], thinking: { type: 'disabled' }, output_config: { effort: 'low', format: { type: 'json_schema', schema: AUTHOR_SCHEMA } }, system: cached(AUTHOR_SYSTEM), messages: [{ role: 'user', content: authorUserTurn(req) }] });
  if (r.error) return { kind: 'unavailable' };
  const plan = authoredFromModelText(textOf(r.j), req.kind);
  return plan ? { kind: 'ok', plan, remaining: null } : { kind: 'none' };
}

const UNCAPPED = { outcome: 'allowed', cap: -1, ok: true, showUpsell: false, showRetry: false, left: Infinity, label: '' };

// ── one conversation ──
async function converse(c) {
  resetVoice();
  const w = WORLDS[c.world]();
  const { port, world } = fakePort({ active: w.active, marks: w.marks, catalog: catalog() });
  port.build.rewrite = rewriter;
  port.build.author = (req) => author(req);
  const sink = recordingSink();
  const refs = { ...freshRefs(), constraints: { ...w.constraints } };
  const history = [];
  const edit = {
    premiumAi: true,
    entitlementStatus: 'ready',
    ctx: () => contextFrom({ owned: refs.constraints.ownedEquipment ?? [], canDo: canDoExercise, experience: refs.constraints.experience?.lifting ?? 'intermediate', limitations: [], limitationPatterns, excludeExercises: [] }),
    buildTheNewOne: (said, line) => {
      clearEdit(refs);
      refs.askedAboutReplacing = true;
      if (said) alsoSaid(refs, said);
      refs.mode = 'program';
      return advance(refs, port, sink, build, refs.constraints, 'program', line);
    },
  };
  const build = { lane: 'ai', gates: () => UNCAPPED, closeSignal: () => new AbortController().signal, stop: (r, t) => sink.say({ kind: 'stop', text: `[stop ${r}] ${t}` }), lastCard: () => undefined, setConstraints: (x) => void (refs.constraints = x), setBuilt: (b) => void (refs.built = b) };
  const hooks = {
    premiumAi: true, nutritionAccess: true, kitchen: false, edit, build,
    setMode: (m) => void (refs.mode = m), setConstraints: (x) => void (refs.constraints = x),
    tapChip: (chip) => sink.say({ kind: 'holt', text: `[tapChip ${chip.label}]` }),
    guard: () => true, blockDoorRefuses: () => false, keepRoom: (env) => void (refs.room = env),
    creditsLine: async () => 'Out of credits.', loadNotes: async () => [], history: () => history.slice(-8),
    askAloud: async (text, _h, q) => {
      const r = await chat(text, history.slice(-8), world, refs.mode ? `Building ${refs.mode === 'day' ? 'ONE session' : 'a full program'}.${q ? ` Holt just asked: "${q.ask}"` : ''}` : null);
      for (const s of r.said) sink.say({ kind: 'holt', text: s });
      await actOn(refs, port, sink, { turn: hooks, knownNotes: () => [], cardContext: async () => ({}), showCard: () => undefined, canDo: canDoExercise }, r.actions, text, { done: true, stop: null }, true, q, refs.mode ?? 'program');
      history.push({ role: 'athlete', text }, { role: 'holt', text: r.said.join(' ') });
      c.trace.push(`  tools: ${r.actions.map((a) => a.name).join(', ') || 'none'}`);
    },
    runKitchen: async () => undefined,
    stops: { crisis: (t) => sink.say({ kind: 'stop', text: t }), urgent: (t) => sink.say({ kind: 'stop', text: t }), care: (t) => sink.say({ kind: 'stop', text: t }), medical: (t) => sink.say({ kind: 'stop', text: t }) },
  };
  for (const line of c.lines) {
    if (spent >= CAP) break;
    const from = sink.turns.length;
    c.trace.push(`ATHLETE: ${line}`);
    turn(refs, port, sink, hooks, line);
    for (let i = 0; i < 600 && (sink.busyLog.at(-1) !== null || sink.turns.length === from); i += 1) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 300));
    for (const t of sink.turns.slice(from)) c.trace.push(t.kind === 'chips' ? `  [${t.chips.map((x) => x.label).join(' | ')}]` : `  ${t.kind.toUpperCase()}: ${t.text ?? ''}`);
    const chips = [...sink.turns].slice(from).reverse().find((t) => t.kind === 'chips');
    const doIt = chips?.chips.find((x) => x.label === 'Do it');
    if (doIt) {
      c.trace.push('ATHLETE taps: Do it');
      await finishTypedEdit(refs, port, sink, edit, doIt);
    }
  }
  return { sink, world, refs };
}

// ── the conversations: scripts/holt-corpus/converse-cases.mjs (the PO's examples + the comprehensive set) ──
const chipLabels = (sink) => sink.turns.filter((t) => t.kind === 'chips').flatMap((t) => t.chips.map((x) => x.label));
const ALLOWED = new Set(['Do it', 'Leave it', 'Undo', 'Show me the program', 'Just this week', 'The rest of the block']);
/** The AI-lane bar (PO D10), on every conversation: no button flows. */
const noButtonFlows = (r) => chipLabels(r.sink).every((l) => ALLOWED.has(l)) || `buttons shown: ${chipLabels(r.sink).filter((l) => !ALLOWED.has(l)).join(', ')}`;
const FAMILY = arg('--family');
const CONVOS = CASES.filter((x) => (!ONLY || x.id === ONLY) && (!FAMILY || x.family === FAMILY) && (!process.argv.includes('--po') || x.tags.includes('po')));

const out = [];
for (const c of CONVOS) {
  if (spent >= CAP) { console.log(`cap $${CAP} reached — stopping`); break; }
  c.trace = [];
  const before = spent;
  let res;
  try { res = await converse(c); res.start = WORLDS[c.world](); } catch (e) { console.log(`✖ ${c.id}: crashed ${e?.message}`); out.push({ id: c.id, crash: String(e?.message) }); continue; }
  const fails = [...c.checks, noButtonFlows].map((f) => { try { return f(res); } catch (e) { return `check crashed: ${e?.message}`; } }).filter((x) => x !== true);
  console.log(`\n${fails.length ? '✖' : '✓'} ${c.family}/${c.id}  $${(spent - before).toFixed(3)}`);
  for (const l of c.trace) console.log(l.length > 400 ? `${l.slice(0, 400)}…` : l);
  for (const f of fails) console.log(`  FAIL: ${f}`);
  out.push({ id: c.id, family: c.family, pass: !fails.length, fails, cost: spent - before, trace: c.trace });
}
console.log(`\n${out.filter((o) => o.pass).length}/${out.length} passed · spent $${spent.toFixed(3)} (cap $${CAP})`);
const fam = {};
for (const o of out) (fam[o.family ?? '?'] ??= [0, 0])[o.pass ? 0 : 1] += 1;
for (const [f, [p2, x]] of Object.entries(fam)) console.log(`  ${f}: ${p2}/${p2 + x}`);
writeFileSync(path.join(HERE, `live-converse-${TODAY}.jsonl`), out.map((o) => JSON.stringify(o)).join('\n') + '\n');
