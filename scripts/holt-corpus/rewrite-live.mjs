/**
 * HOLT REWRITES — LIVE (Holt Listens step 3, PO D12). Runs the PO's own scenarios through the real model with the
 * rewriter prompt (`src/domain/coach/rewrite.ts`), then the app's checker (`engine/checker.ts`), and prints what the
 * athlete would get: Holt's words, what changed per session, weekly miles before → after, what was dropped and said.
 *
 * ⚠ SPENDS REAL MONEY (PO $50 cap for the push). Direct API with ANTHROPIC_API_KEY from .env.local — no deploy needed.
 *   node --experimental-strip-types scripts/holt-corpus/rewrite-live.mjs [--only id] [--cap 1.00]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canDoExercise } from '../../src/domain/home-gym/equipment.ts';
import { plannedDays, trainingDays } from '../../src/domain/program/progress-core.ts';
import { assemble } from '../../src/domain/coach/assemble.ts';
import { checkRewrite } from '../../src/domain/coach/engine/checker.ts';
import { REWRITE_OUTPUT_CAP, REWRITE_SCHEMA, REWRITE_SYSTEM, programText, rewriteFromModelText, rewriteUserTurn } from '../../src/domain/coach/rewrite.ts';
import { BENJAMIN_KIT, benjaminWorld, catalog } from '../../src/domain/coach/engine/__tests__/fixtures.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '../..');
/* The key: the environment, else .env.local here, else the file FL_ENV_FILE names (a worktree has no .env.local). */
const envFile = process.env.FL_ENV_FILE ?? path.join(ROOT, '.env.local');
const key = process.env.ANTHROPIC_API_KEY ?? /ANTHROPIC_API_KEY\s*=\s*"?([^"\n]+)"?/.exec(readFileSync(envFile, 'utf8'))?.[1]?.trim();
if (!key) throw new Error('ANTHROPIC_API_KEY not in .env.local');

const MODEL = 'claude-sonnet-5';
/** $ per token — Sonnet 5 ($2 in / $10 out per million; cache write 1.25×, read 0.1×). */
const PRICE = { input: 2 / 1e6, output: 10 / 1e6, cacheWrite: 2.5 / 1e6, cacheRead: 0.2 / 1e6 };
const arg = (n) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : null;
const CAP = Number(arg('--cap') ?? 1.0);
const ONLY = arg('--only');

// ── worlds ──
function marathonWorld() {
  const res = assemble(
    { goal: 'run_marathon', experience: { lifting: 'beginner', running: 'intermediate' }, daysPerWeek: 4, sessionMinutes: 60, environment: 'full_gym', ownedEquipment: [], limitations: [], excludeExercises: [], raceInWeeks: 20, currentWeeklyMi: 20 },
    catalog(),
    canDoExercise,
  );
  const s = { ...res.assembly.structure, name: 'Marathon — April' };
  const marks = [];
  for (let w = 0; w < 8; w += 1) for (let d = 0; d < s.daysPerWeek; d += 1) marks.push({ weekIndex: w, dayIndex: d, state: 'completed' });
  return { structure: s, marks, athlete: { experience: 'intermediate', environment: 'full_gym', ownedEquipment: [], limitations: [] }, facts: { goal: 'run_marathon', level: 'intermediate', equipment: ['full gym'], limitations: [] }, race: true };
}
function benjamin() {
  const w = benjaminWorld();
  return { structure: w.active.structure, marks: w.marks, athlete: { experience: 'intermediate', environment: 'home', ownedEquipment: BENJAMIN_KIT, limitations: [] }, facts: { goal: 'muscle', level: 'intermediate', equipment: BENJAMIN_KIT, limitations: [] }, race: false };
}

// ── the PO's scenarios, in their words ──
const CASES = [
  {
    id: 'benjamin',
    world: benjamin,
    said: [
      'What I’d like is for you to build out some variation. Keep it on the 5 day plan. Add abs (core) and anything else like rear deltoids that you feel like are missing. I’d also like to potentially add cardio. Here is the equipment that I have: Pull up bar, Lat pull down bar, Straight bar, EZ bar, Racking EZ Bar, Barbell, Dumbbells, Cable rope, Close grip bar, Single handles, Dip bar, Belt squat attachment, Ankle cable attachment, Cables, Bench, Bench attachment for decline work, Peloton. So, I’m limited on my leg equipment, but I have a good chunk of the rest.',
      'I want to edit the entire workout to include what I’ve mentioned above.',
    ],
    brief: 'Keep 5 days. Add core twice a week, rear delts twice a week, more cable work and variety, an easy Peloton ride after two sessions.',
  },
  {
    id: 'p3-rear-delts',
    world: benjamin,
    said: ['I really want to implement more shoulders within my program. I’ve been thinking about rear delts, the back of my shoulders, and I want to really get those bigger. What workouts can we add? I need to implement that a lot more during the week.'],
    brief: 'Rear delts on the back and shoulder sessions, two to three times a week.',
  },
  {
    id: 'p2-sore-marathon',
    world: marathonWorld,
    said: ['I’m feeling really, really sore. These miles are really taking a toll on me. We need to change the program up a bit. I just need less miles, less running, more rest days.'],
    brief: 'Ease the running from the next session, one more rest day a week, keep the race.',
  },
  {
    id: 'p6-weight-loss',
    world: benjamin,
    said: ['I’m feeling stuck with my weight. Can we change our workout up a bit to help me with losing weight? I feel like I’m just bulking too much.'],
    brief: 'Shift toward fat loss: keep the lifting, add conditioning and cardio, tighten rest.',
  },
];

let spent = 0;
async function call(system, user) {
  const t0 = Date.now();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: REWRITE_OUTPUT_CAP,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: REWRITE_SCHEMA } },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
    }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) return { error: `${res.status} ${(await res.text()).slice(0, 300)}`, ms };
  const p = await res.json();
  const u = p.usage ?? {};
  const cost = (u.input_tokens ?? 0) * PRICE.input + (u.output_tokens ?? 0) * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite;
  spent += cost;
  return { text: (p.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join(''), ms, cost, usage: u, stop: p.stop_reason };
}

const miles = (s, w) => trainingDays(plannedDays(s, w)).reduce((t, d) => t + d.main.reduce((u, e) => u + (e.activity === 'run' ? e.targetMi ?? 0 : 0), 0), 0);
function diff(before, after, fromWeek) {
  const out = [];
  const w = Math.min(after.weeks - 2, fromWeek + 1);
  const b = trainingDays(plannedDays(before, w));
  const a = trainingDays(plannedDays(after, w));
  a.forEach((d, i) => {
    const was = new Set(b[i]?.main.map((e) => e.catalogKey ?? e.activity));
    const now = new Set(d.main.map((e) => e.catalogKey ?? e.activity));
    const added = [...now].filter((k) => !was.has(k));
    const gone = [...was].filter((k) => !now.has(k));
    if (added.length || gone.length) out.push(`    wk${w + 1} ${d.name}: +${added.join(', +') || '—'}  −${gone.join(', −') || '—'}`);
  });
  return out;
}

const log = [];
for (const c of CASES) {
  if (ONLY && c.id !== ONLY) continue;
  if (spent >= CAP) { console.log(`cap $${CAP} reached — stopping`); break; }
  const w = c.world();
  const fromWeek = Math.min(...w.structure.weeks ? [Array.from({ length: w.structure.weeks }, (_, i) => i).find((i) => trainingDays(plannedDays(w.structure, i)).some((_, d) => !w.marks.some((m) => m.weekIndex === i && m.dayIndex === d))) ?? 0] : [0]);
  const user = rewriteUserTurn({ said: c.said, brief: c.brief, athlete: w.facts, program: programText(w.structure, w.marks, fromWeek), name: w.structure.name });
  const r = await call(REWRITE_SYSTEM, user);
  if (r.error) { console.log(`✖ ${c.id}: ${r.error}`); log.push({ id: c.id, error: r.error }); continue; }
  const parsed = rewriteFromModelText(r.text);
  if (!parsed) { console.log(`✖ ${c.id}: unreadable (${r.stop})`); log.push({ id: c.id, unreadable: r.text.slice(0, 400) }); continue; }
  const checked = checkRewrite(w.structure, w.marks, parsed.rewrite, { athlete: w.athlete, catalog: catalog(), canDo: canDoExercise, race: w.race });
  console.log(`\n■ ${c.id}  ${(r.ms / 1000).toFixed(1)}s  $${r.cost.toFixed(3)}  out ${r.usage.output_tokens} tok`);
  console.log(`  Holt: ${parsed.say}`);
  if (parsed.unmet.length) console.log(`  unmet: ${parsed.unmet.join(' · ')}`);
  if (!checked.ok) { console.log(`  ✖ checker refused: ${checked.reason}`); log.push({ id: c.id, refused: checked.reason, say: parsed.say }); continue; }
  console.log(`  ✓ checker passed · rest marks ${checked.rest.length} · dropped ${checked.dropped.map((d) => `${d.name} (${d.why})`).join(', ') || 'none'}`);
  for (const l of checked.said) console.log(`  said: ${l}`);
  for (const l of diff(w.structure, checked.structure, fromWeek)) console.log(l);
  if (w.race) console.log(`  miles wk${fromWeek + 2}: ${miles(w.structure, fromWeek + 1).toFixed(1)} → ${miles(checked.structure, fromWeek + 1).toFixed(1)}`);
  log.push({ id: c.id, say: parsed.say, unmet: parsed.unmet, rest: checked.rest.length, dropped: checked.dropped, said: checked.said, cost: r.cost });
}
console.log(`\nspent $${spent.toFixed(3)} (cap $${CAP})`);
writeFileSync(path.join(HERE, `live-rewrite-${new Date().toISOString().slice(0, 10)}.jsonl`), log.map((x) => JSON.stringify(x)).join('\n') + '\n');
