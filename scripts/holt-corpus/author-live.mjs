/**
 * HOLT WRITES IT — LIVE. Runs `corpus-author.mjs` through the real model exactly as `coach-author` does, then
 * through the device's own validation, and scores what would reach the card against what the athlete asked for.
 *
 *   node --experimental-strip-types scripts/holt-corpus/author-live.mjs [--cap 3] [--only id,id] [--tag region]
 *        [--kind day|program] [--out live-author-<date>.jsonl] [--conc 4]
 *
 * ⚠ EVERY RUN SPENDS REAL MONEY (`feedback_live_ai_tests_spend_real_money`). About 1¢ a session and 2-3¢ a
 * week on Sonnet 5 with the catalogue cached. `--cap` is a hard dollar ceiling: the run stops when the MEASURED
 * spend reaches it. Quote the total before a bigger run; one bulk run once drained the account.
 *
 * Same as production, on purpose:
 *   · SYSTEM is read out of `supabase/functions/coach-author/index.ts` (not copied), catalogue and all;
 *   · the request goes through `narrowAuthorRequest` + `authorUserTurn`, the reply through
 *     `authoredFromModelText`, and the plan through `validateAuthored` with `canDoExercise` — the app's code.
 * Different from production: it calls the API directly with `ANTHROPIC_API_KEY` from `.env.local`, so no
 * credits are spent and nothing touches the database.
 */

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPickerDb } from '../../src/domain/exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../src/domain/home-gym/equipment.ts';
import { AUTHOR_OUTPUT_CAP, AUTHOR_SCHEMA, authoredFromModelText, authoredIsWhole, authorUserTurn, narrowAuthorRequest } from '../../src/domain/coach/author.ts';
import { AUTHOR_CATALOGUE } from '../../src/domain/coach/author-catalogue.ts';
import { authoredLine, authorFacts, validateAuthored } from '../../src/domain/coach/author-validate.ts';
import { BODY_PART_MUSCLES } from '../../src/domain/coach/day.ts';
import { medicalRoute } from '../../src/domain/coach/medical-routing.ts';
import { DAY_CASES, PROGRAM_CASES } from './corpus-author.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const MODEL = 'claude-sonnet-5';
// Sonnet 5, $/token — the same table `form-check-eval.mjs` uses.
const PRICE = { input: 2e-6, output: 10e-6, cacheRead: 0.2e-6, cacheWrite: 2.5e-6 };

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const CAP = Number(arg('cap', 3));
const ONLY = arg('only')?.split(',');
const TAG = arg('tag');
const KIND = arg('kind');
const CONC = Number(arg('conc', 4));
const OUT = path.join(HERE, arg('out', `live-author-${new Date().toISOString().slice(0, 10)}.jsonl`));

const key = readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('ANTHROPIC_API_KEY=')).slice('ANTHROPIC_API_KEY='.length).trim();
const fn = readFileSync(path.join(ROOT, 'supabase/functions/coach-author/index.ts'), 'utf8').replace(/\r\n/g, '\n');
const start = fn.indexOf('const SYSTEM = `') + 'const SYSTEM = `'.length;
const SYSTEM = fn.slice(start, fn.indexOf('`;', start)).replace('${AUTHOR_CATALOGUE}', AUTHOR_CATALOGUE);
if (SYSTEM.includes('${')) throw new Error('SYSTEM interpolates something this script does not fill in');

const source = (f) => JSON.parse(readFileSync(path.join(ROOT, 'src/domain/exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({ exercises: source('exercises.json'), exerciseMuscles: source('exercise_muscles.json'), muscles: source('muscles.json'), equipment: source('equipment.json') });
const BY_KEY = new Map(POOL.map((e) => [e.key, e]));
for (const act of ['run', 'walk', 'bike', 'row', 'elliptical', 'stair']) BY_KEY.set(`cardio:${act}`, { key: `cardio:${act}`, equipId: 'cardio', primaryMuscleIds: ['cardiovascular'] });

// ── the athlete the app knows ────────────────────────────────────────────────────────────────────────
const athleteOf = (a = {}) => ({
  experience: a.level ?? 'advanced',
  environment: a.room ?? 'full_gym',
  ownedEquipment: a.gear ?? [],
  limitations: a.limits ?? [],
  excludeExercises: a.avoid ?? [],
});

function requestFor(c, kind) {
  const a = c.a ?? {};
  const athlete = athleteOf(a);
  return {
    athlete,
    request: narrowAuthorRequest({
      kind,
      said: c.said,
      minutes: a.minutes ?? 60,
      days: kind === 'program' ? a.days ?? null : null,
      weeks: kind === 'program' ? a.weeks ?? 8 : null,
      goal: 'goal' in a ? a.goal : 'muscle',
      level: athlete.experience,
      room: athlete.environment,
      ...authorFacts(athlete, POOL, canDoExercise),
      recent: a.recent ?? [],
      notes: a.notes ?? [],
      beside: a.beside ?? null,
    }),
  };
}

// ── one call ─────────────────────────────────────────────────────────────────────────────────────────
let spent = 0;
async function call(request) {
  const t0 = Date.now();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: AUTHOR_OUTPUT_CAP[request.kind],
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: AUTHOR_SCHEMA } },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: authorUserTurn(request) }],
    }),
  });
  const ms = Date.now() - t0;
  if (!res.ok) return { error: `${res.status} ${(await res.text()).slice(0, 300)}`, ms, cost: 0 };
  const payload = await res.json();
  const u = payload.usage ?? {};
  const cost = (u.input_tokens ?? 0) * PRICE.input + (u.output_tokens ?? 0) * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite;
  spent += cost;
  const text = (payload.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { text, ms, cost, usage: u, stop: payload.stop_reason };
}

// ── scoring ──────────────────────────────────────────────────────────────────────────────────────────
const inRange = (v, want) => (Array.isArray(want) ? v >= want[0] && v <= want[1] : v === want);
const show = (want) => (Array.isArray(want) ? `${want[0]}-${want[1]}` : String(want));
const musclesOf = (id) => BODY_PART_MUSCLES[id] ?? [id];
const trains = (m, id) => BY_KEY.get(m.catalogKey).primaryMuscleIds.some((x) => musclesOf(id).includes(x));
const re = (s) => new RegExp(s, 'i');

/** Every way `main` (a list of movements) fails `want`. Empty means it is what was asked for. */
function failures(main, want, where = '') {
  const out = [];
  const bad = (msg) => out.push(where ? `${where}: ${msg}` : msg);
  const keys = main.map((m) => m.catalogKey);
  if (want.n != null && !inRange(main.length, want.n)) bad(`${main.length} movements, asked ${show(want.n)}`);
  for (const [id, n] of Object.entries(want.muscle ?? {})) {
    const got = main.filter((m) => trains(m, id)).length;
    if (!inRange(got, n)) bad(`${got} ${id} movements, asked ${show(n)}`);
  }
  if (want.first && !re(want.first).test(keys[0] ?? '')) bad(`opens with ${keys[0]}, asked /${want.first}/`);
  for (const h of want.has ?? []) if (!keys.some((k) => re(h).test(k))) bad(`nothing matches /${h}/`);
  for (const l of want.lacks ?? []) {
    const hit = keys.filter((k) => re(l).test(k));
    if (hit.length) bad(`has ${hit.join(', ')}, asked for none of /${l}/`);
  }
  for (const [r, n] of want.count ?? []) {
    const got = keys.filter((k) => re(r).test(k)).length;
    if (!inRange(got, n)) bad(`${got} match /${r}/, asked ${show(n)}`);
  }
  if (want.equip) {
    const off = main.filter((m) => !want.equip.includes(BY_KEY.get(m.catalogKey).equipId));
    if (off.length) bad(`uses ${off.map((m) => `${m.catalogKey} (${BY_KEY.get(m.catalogKey).equipId})`).join(', ')}, asked only ${want.equip.join('/')}`);
  }
  // A prescription may be a range ("8-12"): both of its ends have to sit inside what was asked.
  const repsOk = (m, n) => inRange(m.reps, n) && inRange(m.repsMax ?? m.reps, n);
  const repsOf = (m) => (m.repsMax ? `${m.reps}-${m.repsMax}` : m.reps);
  for (const [r, n] of want.sets ?? []) {
    for (const m of main.filter((x) => re(r).test(x.catalogKey))) if (!inRange(m.sets, n)) bad(`${m.catalogKey} sets ${m.sets}, asked ${show(n)}`);
  }
  for (const [r, n] of want.reps ?? []) {
    for (const m of main.filter((x) => re(r).test(x.catalogKey))) if (!repsOk(m, n)) bad(`${m.catalogKey} reps ${repsOf(m)}, asked ${show(n)}`);
  }
  if (want.allSets) for (const m of main) if (!inRange(m.sets, want.allSets)) bad(`${m.catalogKey} sets ${m.sets}, asked ${show(want.allSets)}`);
  if (want.allReps) for (const m of main) if (m.reps != null && !repsOk(m, want.allReps)) bad(`${m.catalogKey} reps ${repsOf(m)}, asked ${show(want.allReps)}`);
  if (want.ranged) for (const m of main) if (m.reps != null && !m.repsMax) bad(`${m.catalogKey} is one number, asked for a range`);
  if (want.groups != null) {
    const blocks = new Set(main.map((m) => m.groupId).filter(Boolean)).size;
    if (!inRange(blocks, want.groups)) bad(`${blocks} supersets/circuits, asked ${show(want.groups)}`);
  }
  if (want.groupKind) for (const m of main.filter((x) => x.groupId)) if (m.groupKind !== want.groupKind) bad(`${m.catalogKey} is in a ${m.groupKind}, asked ${want.groupKind}`);
  for (const [a, b] of want.before ?? []) {
    const ia = keys.findIndex((k) => re(a).test(k));
    const ib = keys.findIndex((k) => re(b).test(k));
    if (ia < 0 || ib < 0 || ia > ib) bad(`/${a}/ is not before /${b}/`);
  }
  if (want.held) for (const m of main.filter((x) => re(want.held).test(x.catalogKey))) if (m.durationSec == null) bad(`${m.catalogKey} is counted, should be held`);
  return out;
}

function score(c, kind, plan, valid) {
  const want = c.want ?? {};
  if (!plan) return ['the model returned nothing usable'];
  if (!valid) return ['validation refused the plan (a day fell under three movements)'];
  const out = [];
  const all = valid.days.flatMap((d) => d.main);
  // Warm-up and cool-down are counted apart from the main work, in either kind of build.
  for (const [section, n] of [['warmup', want.warmup], ['cooldown', want.cooldown]]) {
    if (n == null) continue;
    for (const d of valid.days) if (!inRange(d[section].length, n)) out.push(`${d.name}: ${d[section].length} ${section} movements, asked ${show(n)}`);
  }
  for (const h of want.warmupHas ?? []) if (!valid.days[0].warmup.some((m) => re(h).test(m.catalogKey))) out.push(`no warm-up matches /${h}/`);
  if (kind === 'day') {
    const { first, before, has, lacks, ...rest } = want;
    out.push(...failures(valid.days[0].main, rest));
    out.push(...failures([...valid.days[0].warmup, ...valid.days[0].main, ...valid.days[0].cooldown], { first, before, has, lacks }));
  }
  else {
    if (want.days != null && valid.days.length !== want.days) out.push(`${valid.days.length} days, asked ${want.days}`);
    const { days: _d, day: _day, everyDay: _e, distinct: _x, unmet: _u, noLoads: _n, warmup: _w, cooldown: _c, warmupHas: _h, ...whole } = want;
    out.push(...failures(all, whole));
    for (const d of valid.days) if (want.everyDay) out.push(...failures(d.main, want.everyDay, d.name));
    for (const { at, ...checks } of want.day ?? []) {
      const hits = typeof at === 'number' ? [valid.days[at]].filter(Boolean) : valid.days.filter((d) => re(at).test(d.name));
      if (!hits.length) out.push(`no day ${at}`);
      for (const d of hits) out.push(...failures(d.main, checks, d.name));
    }
    if (want.distinct != null) {
      const ratio = new Set(all.map((m) => m.catalogKey)).size / all.length;
      if (ratio < want.distinct) out.push(`only ${Math.round(ratio * 100)}% of movements are distinct across days`);
    }
  }
  if (want.unmet && plan.unmet.length === 0) out.push('said nothing about what he could not do');
  if (want.noLoads) {
    const words = [plan.say, ...plan.days.flatMap((d) => d.exercises.map((e) => e.note))].join(' ');
    if (/\d\s*(lbs?|pounds|kgs?|kilos?|%)/i.test(words)) out.push(`wrote a load: "${words.match(/[^.]*\d\s*(lbs?|pounds|kgs?|kilos?|%)[^.]*/i)[0].trim()}"`);
  }
  // He broke a rule the prompt gave him; the device caught it, and the athlete lost a slot.
  for (const d of valid.dropped) out.push(`DROPPED ${d.name} (${d.why})`);
  return out;
}

// ── the run ──────────────────────────────────────────────────────────────────────────────────────────
const cases = [...DAY_CASES.map((c) => ({ ...c, kind: 'day' })), ...PROGRAM_CASES.map((c) => ({ ...c, kind: 'program' }))].filter(
  (c) => (!ONLY || ONLY.includes(c.id)) && (!TAG || c.tags.includes(TAG)) && (!KIND || c.kind === KIND),
);
console.log(`${cases.length} cases · cap $${CAP.toFixed(2)} · system ${SYSTEM.length} chars · → ${path.basename(OUT)}`);
writeFileSync(OUT, '');

const rows = [];
async function runCase(c) {
  for (const line of c.said) if (medicalRoute(line) !== 'clear') return rows.push({ id: c.id, kind: c.kind, tags: c.tags, stopped: true, fails: [] });
  if (spent >= CAP) return rows.push({ id: c.id, kind: c.kind, tags: c.tags, skipped: true, fails: [] });
  const { athlete, request } = requestFor(c, c.kind);
  let r = await call(request);
  let retried = false;
  if (!r.error && !authoredIsWhole(authoredFromModelText(r.text, c.kind))) {
    const again = await call(request);
    retried = true;
    if (!again.error) r = { ...again, cost: r.cost + again.cost, ms: r.ms + again.ms };
  }
  if (r.error) {
    console.log(`✖ ${c.id}  API ${r.error}`);
    return rows.push({ id: c.id, kind: c.kind, tags: c.tags, error: r.error, fails: ['api error'] });
  }
  const plan = authoredFromModelText(r.text, c.kind);
  const valid = plan ? validateAuthored(plan, athlete, POOL, canDoExercise) : null;
  const fails = score(c, c.kind, plan, valid);
  const row = {
    id: c.id, kind: c.kind, tags: c.tags, said: c.said, a: c.a ?? {}, fails,
    say: plan?.say ?? null, line: plan && valid ? authoredLine(plan, valid) : null, unmet: plan?.unmet ?? [],
    days: valid?.days.map((d) => {
      const line = (m, lead = '') =>
        `${lead}${m.groupId ? `{${m.groupKind === 'circuit' ? 'C' : 'S'}${m.groupId.split('-').pop()}} ` : ''}${m.catalogKey} ${m.targetSec != null ? `${Math.round(m.targetSec / 60)}min` : `${m.sets}x${m.reps != null ? (m.repsMax ? `${m.reps}-${m.repsMax}` : m.reps) : `${m.durationSec}s`}`}${m.coachNote ? ` [${m.coachNote}]` : ''}`;
      return { name: d.name, main: [...d.warmup.map((m) => line(m, 'WARM ')), ...d.main.map((m) => line(m)), ...d.cooldown.map((m) => line(m, 'COOL '))] };
    }) ?? null,
    raw: valid ? undefined : r.text.slice(0, 600),
    ms: r.ms, cost: r.cost, usage: r.usage, stop: r.stop, retried,
  };
  rows.push(row);
  appendFileSync(OUT, JSON.stringify(row) + '\n');
  console.log(`${fails.length ? '✖' : '✔'} ${c.id.padEnd(24)} ${String(r.ms).padStart(5)}ms $${r.cost.toFixed(4)}${fails.length ? `  ${fails.join(' · ')}` : ''}`);
}

// The first call alone, so the catalogue is written to the cache once and read by every call after it.
if (cases.length) await runCase(cases[0]);
const queue = cases.slice(1);
await Promise.all(Array.from({ length: CONC }, async () => {
  for (let c = queue.shift(); c; c = queue.shift()) await runCase(c);
}));

const ran = rows.filter((r) => !r.skipped && !r.stopped && !r.error);
const passed = ran.filter((r) => r.fails.length === 0);
const by = (kind) => ran.filter((r) => r.kind === kind);
const pct = (list) => (list.length ? `${list.filter((r) => r.fails.length === 0).length}/${list.length}` : '—');
const avg = (list, f) => (list.length ? list.reduce((n, r) => n + f(r), 0) / list.length : 0);
console.log('\n── result ──');
console.log(`built as asked: ${passed.length}/${ran.length}   days ${pct(by('day'))}   programs ${pct(by('program'))}`);
const tags = [...new Set(ran.flatMap((r) => r.tags))].sort();
console.log(tags.map((t) => `${t} ${pct(ran.filter((r) => r.tags.includes(t)))}`).join('   '));
console.log(`dropped by the device: ${ran.filter((r) => r.fails.some((f) => f.startsWith('DROPPED'))).length} cases`);
console.log(`cost: $${spent.toFixed(3)} total · day $${avg(by('day'), (r) => r.cost).toFixed(4)} · program $${avg(by('program'), (r) => r.cost).toFixed(4)}`);
console.log(`time: day ${Math.round(avg(by('day'), (r) => r.ms))}ms · program ${Math.round(avg(by('program'), (r) => r.ms))}ms`);
if (rows.some((r) => r.skipped)) console.log(`⚠ ${rows.filter((r) => r.skipped).length} cases skipped: the $${CAP} cap was reached`);
