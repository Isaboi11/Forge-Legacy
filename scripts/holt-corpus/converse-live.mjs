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
import { BENJAMIN_KIT, benjaminWorld, catalog } from '../../src/domain/coach/engine/__tests__/fixtures.mjs';

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

// ── worlds ──
const UNCAPPED = { outcome: 'allowed', cap: -1, ok: true, showUpsell: false, showRetry: false, left: Infinity, label: '' };
function benjamin() {
  const w = benjaminWorld();
  return { ...w, constraints: { experience: { lifting: 'intermediate', running: 'beginner' }, ownedEquipment: BENJAMIN_KIT, environment: 'home', goal: 'muscle' } };
}
function marathoner() {
  const res = assemble({ goal: 'run_marathon', experience: { lifting: 'beginner', running: 'intermediate' }, daysPerWeek: 4, sessionMinutes: 60, environment: 'full_gym', ownedEquipment: [], limitations: [], excludeExercises: [], raceInWeeks: 20, currentWeeklyMi: 20 }, catalog(), canDoExercise);
  const structure = { ...res.assembly.structure, name: 'Marathon — April' };
  const marks = [];
  for (let w = 0; w < 8; w += 1) for (let d = 0; d < 4; d += 1) marks.push({ weekIndex: w, dayIndex: d, state: 'completed', workoutId: null });
  return { active: { id: 'prog-mara', name: structure.name, structure, state: 'active', startedAt: null, endedAt: null, createdAt: '', sourceDefinitionId: null }, marks, constraints: { experience: { lifting: 'beginner', running: 'intermediate' }, environment: 'full_gym', goal: 'run_marathon' } };
}
const newUser = () => ({ active: null, marks: [], constraints: {} });

// ── one conversation ──
async function converse(c) {
  resetVoice();
  const w = c.world();
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

// ── the conversations (PO's examples, his words where he gave them) ──
const weekKeys = (s, w) => trainingDays(plannedDays(s, w)).flatMap((d) => d.main.map((e) => e.catalogKey ?? e.activity));
const miles = (s, w) => trainingDays(plannedDays(s, w)).reduce((t, d) => t + d.main.reduce((u, e) => u + (e.activity === 'run' ? e.targetMi ?? 0 : 0), 0), 0);
const chipLabels = (sink) => sink.turns.filter((t) => t.kind === 'chips').flatMap((t) => t.chips.map((x) => x.label));
const ALLOWED = new Set(['Do it', 'Leave it', 'Undo', 'Show me the program', 'Just this week', 'The rest of the block']);
const noButtonFlows = (sink) => chipLabels(sink).every((l) => ALLOWED.has(l)) || `buttons shown: ${chipLabels(sink).filter((l) => !ALLOWED.has(l)).join(', ')}`;

const CONVOS = [
  {
    id: 'p3-rear-delts', world: benjamin,
    lines: ['I really want to implement more shoulders within my program. I’ve been thinking about rear delts, the back of my shoulders, and I want to really get those bigger. What workouts can we add? I need to implement that a lot more during the week.'],
    check: ({ world, sink }) => [
      world.writes.some((x) => x.kind === 'update') || 'nothing saved',
      weekKeys(world.active.structure, 5).filter((k) => /rear-delt|face-pull/.test(k ?? '')).length >= 2 || 'fewer than 2 rear-delt movements in week 6',
      noButtonFlows(sink),
    ],
  },
  {
    id: 'third-day', world: benjamin,
    lines: ['I don’t like the third day. Change it up — I want more cable work on it, I’ve got a full cable setup.'],
    check: ({ world }) => {
      const b = trainingDays(plannedDays(benjaminWorld().active.structure, 5));
      const a = trainingDays(plannedDays(world.active.structure, 5));
      return [
        world.writes.some((x) => x.kind === 'update') || 'nothing saved',
        JSON.stringify(a[2].main.map((e) => e.catalogKey)) !== JSON.stringify(b[2].main.map((e) => e.catalogKey)) || 'day 3 unchanged',
        a[2].main.some((e) => /^cable/.test(e.catalogKey ?? '')) || 'no cable movement on day 3',
        JSON.stringify(a[0].main) === JSON.stringify(b[0].main) || 'day 1 changed too',
      ];
    },
  },
  {
    id: 'p2-sore-marathon', world: marathoner,
    lines: ['I’m feeling really, really sore. These miles are really taking a toll on me. We need to change the program up a bit. I just need less miles, less running, more rest days.'],
    check: ({ world }) => [
      world.writes.some((x) => x.kind === 'update') || 'nothing saved',
      miles(world.active.structure, 9) < miles(marathoner().active.structure, 9) || 'week 10 not less running',
      world.writes.some((x) => x.kind === 'skip') || 'no rest day added',
    ],
  },
  {
    id: 'p6-weight-loss', world: benjamin,
    lines: ['I’m feeling stuck with my weight. Can we change our workout up a bit to help me with losing weight? I feel like I’m just bulking too much.'],
    check: ({ world }) => [
      world.writes.some((x) => x.kind === 'update') || 'nothing saved',
      trainingDays(plannedDays(world.active.structure, 5)).some((d) => [...d.main, ...d.cooldown].some((e) => e.kind === 'cardio')) || 'no conditioning added',
    ],
  },
  {
    id: 'slim-down', world: benjamin,
    lines: ['Work got crazy. I only have about 45 minutes now — slim my workouts down.'],
    check: ({ world }) => {
      const b = trainingDays(plannedDays(benjaminWorld().active.structure, 5)).reduce((t, d) => t + d.main.length, 0);
      const a = trainingDays(plannedDays(world.active.structure, 5)).reduce((t, d) => t + d.main.length, 0);
      return [world.writes.some((x) => x.kind === 'update') || 'nothing saved', a < b || `week 6 not slimmer (${a} vs ${b} movements)`];
    },
  },
  {
    id: 'new-8wk-bulk', world: newUser,
    lines: ['Build me an 8 week bulking program, 4 days a week, I lift at a full gym and I’ve been lifting a couple years.'],
    check: ({ refs, sink }) => [refs.built?.kind === 'program' || 'no program built', refs.built?.structure?.weeks === 8 || `weeks ${refs.built?.structure?.weeks}`, refs.built?.structure?.daysPerWeek === 4 || `days ${refs.built?.structure?.daysPerWeek}`, noButtonFlows(sink)],
  },
  {
    id: 'p4-arms-hour', world: benjamin,
    lines: ['I have an hour. I’m going to do arms. I want a really quick workout, about 8 exercises, supersets, and keep it so I’m not moving around too much.'],
    check: ({ refs }) => {
      const day = refs.built?.kind === 'day' ? refs.built.day : null;
      return [!!day || 'no day built', !day || (day.main.length >= 7 && day.main.length <= 9) || `${day?.main.length} movements`, !day || day.main.some((e) => e.groupId) || 'no supersets'];
    },
  },
  {
    id: 'p1-marathon-bike', world: newUser,
    lines: ['Hey Holt, I’m running a marathon in April next year. I don’t know anything about what to do. Build me a program. I want running in it and I also want biking in it.'],
    check: ({ refs }) => {
      const s = refs.built?.structure;
      const all = s ? Array.from({ length: s.weeks }, (_, w) => trainingDays(plannedDays(s, w))).flat().flatMap((d) => d.main) : [];
      return [!!s || 'no program built', all.some((e) => e.activity === 'run') || 'no running', all.some((e) => e.activity === 'bike') || 'no biking (HL-15 not built yet)'];
    },
  },
];

const out = [];
for (const c of CONVOS) {
  if (ONLY && c.id !== ONLY) continue;
  if (spent >= CAP) { console.log(`cap $${CAP} reached — stopping`); break; }
  c.trace = [];
  const before = spent;
  let res;
  try { res = await converse(c); } catch (e) { console.log(`✖ ${c.id}: crashed ${e?.message}`); out.push({ id: c.id, crash: String(e?.message) }); continue; }
  const fails = c.check(res).filter((x) => x !== true);
  console.log(`\n${fails.length ? '✖' : '✓'} ${c.id}  $${(spent - before).toFixed(3)}`);
  for (const l of c.trace) console.log(l.length > 400 ? `${l.slice(0, 400)}…` : l);
  for (const f of fails) console.log(`  FAIL: ${f}`);
  out.push({ id: c.id, pass: !fails.length, fails, cost: spent - before, trace: c.trace });
}
console.log(`\n${out.filter((o) => o.pass).length}/${out.length} passed · spent $${spent.toFixed(3)} (cap $${CAP})`);
writeFileSync(path.join(HERE, `live-converse-${TODAY}.jsonl`), out.map((o) => JSON.stringify(o)).join('\n') + '\n');
