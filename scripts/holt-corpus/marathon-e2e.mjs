/**
 * ONE SENTENCE, END TO END — the PO's marathon ask (2026-09-30) through every stage the app runs it through.
 *
 *   node --experimental-strip-types scripts/holt-corpus/marathon-e2e.mjs ["another sentence"] [--race-in 16] [--miles 15]
 *
 * ⚠ SPENDS REAL MONEY: two live calls, about 3¢ (`feedback_live_ai_tests_spend_real_money`).
 *
 *   1. `coach-interpret`'s own SYSTEM reads the sentence → the fields it fills (goal, days, lifting days, weeks).
 *   2. The chat's questionnaire says what Holt still asks. Answered here with `--race-in` (weeks until the
 *      race; default: at the end of the weeks they said) and `--miles` (current weekly mileage, default 15).
 *   3. `assemble()` builds the race block — the running is the rulebook's arithmetic, on the athlete's split.
 *   4. `coach-author`'s own SYSTEM writes the lifting days; `validateAuthored` checks them; `spliceLiftDays`
 *      puts them into the block; `firstWeeksOf` cuts it to the weeks they asked for.
 *
 * It calls the API directly with `ANTHROPIC_API_KEY` from `.env.local` — no credits, no database. The chat
 * sheet does the same four things in the same order (`CoachChatSheet.tsx` `advance`), which this does not run.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPickerDb } from '../../src/domain/exercise-picker/catalog-core.ts';
import { canDoExercise } from '../../src/domain/home-gym/equipment.ts';
import { assemble } from '../../src/domain/coach/assemble.ts';
import { narrowReply, parseModelJson } from '../../src/domain/coach/interpret-narrow.ts';
import { completeFor, nextQuestion } from '../../src/domain/coach/chat-core.ts';
import { AUTHOR_OUTPUT_CAP, AUTHOR_SCHEMA, authoredFromModelText, authorUserTurn, narrowAuthorRequest } from '../../src/domain/coach/author.ts';
import { AUTHOR_CATALOGUE } from '../../src/domain/coach/author-catalogue.ts';
import { authoredLine, authorFacts, validateAuthored } from '../../src/domain/coach/author-validate.ts';
import { endsOnRace, firstWeeksOf, RACE_WEEK_LINE, raceWeekShape, spliceLiftDays, stopsShortLine } from '../../src/domain/coach/author-race.ts';
import { RACE_SPEC } from '../../src/domain/coach/rulebook/endurance.ts';
import { PO_MARATHON } from './corpus-author.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const flag = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : null;
};
const SAID = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : PO_MARATHON;
const PRICE = { input: 2e-6, output: 10e-6, cacheRead: 0.2e-6, cacheWrite: 2.5e-6 };
let spent = 0;

const key = readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('ANTHROPIC_API_KEY=')).slice('ANTHROPIC_API_KEY='.length).trim();
const systemOf = (file, fill = (s) => s) => {
  const src = readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
  const a = src.indexOf('const SYSTEM = `') + 'const SYSTEM = `'.length;
  return fill(src.slice(a, src.indexOf('`;', a)));
};
async function model(system, user, extra) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-5', thinking: { type: 'disabled' }, system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: user }], ...extra }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const p = await res.json();
  const u = p.usage ?? {};
  spent += (u.input_tokens ?? 0) * PRICE.input + (u.output_tokens ?? 0) * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite;
  return (p.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

const source = (f) => JSON.parse(readFileSync(path.join(ROOT, 'src/domain/exercise-relationships/source', f), 'utf8'));
const POOL = buildPickerDb({ exercises: source('exercises.json'), exerciseMuscles: source('exercise_muscles.json'), muscles: source('muscles.json'), equipment: source('equipment.json') });
const today = new Date().toISOString().slice(0, 10);

console.log(`SAID: ${SAID}\n`);

// 1 ── what he understood
const read = await model(
  systemOf('supabase/functions/coach-interpret/index.ts'),
  `Today is ${today}.\nThe athlete spoke first; no question is on the table.\nMode: a full program.\n\nThe athlete typed: "${SAID}"`,
  { max_tokens: 1024, output_config: { effort: 'low' } },
);
const reply = narrowReply(parseModelJson(read) ?? {}, today, []);
console.log('1. UNDERSTOOD:', JSON.stringify(reply.route === 'patch' ? reply.patch : reply));
if (reply.route !== 'patch') process.exit(0);

// 2 ── what he still asks (level and room are remembered: advanced, full gym)
let state = { ...reply.patch, experience: { lifting: 'advanced', running: 'intermediate' }, environment: 'full_gym' };
if (typeof state.liftDays === 'number' && state.liftDays > 0) state.splitAsSaid = true;
const raceIn = flag('race-in');
const asked = [];
for (let i = 0; i < 8; i += 1) {
  const q = nextQuestion(state, 'program');
  if (!q) break;
  let pick = q.chips[0];
  if (q.id === 'race_when' && raceIn != null) pick = { label: `in ${raceIn} weeks`, patch: { raceDate: new Date(Date.now() + raceIn * 7 * 864e5).toISOString().slice(0, 10) } };
  if (q.id === 'race_base') pick = { label: `${flag('miles') ?? 15} miles`, patch: { currentWeeklyMi: flag('miles') ?? 15 } };
  asked.push(`"${q.ask}" → ${pick.label}`);
  state = { ...state, ...pick.patch };
}
console.log('2. ASKED:\n   ' + asked.join('\n   '));

// 3 ── the rulebook's block, on their split
const c = completeFor(state, 'program');
const built = assemble({ ...c, buildAnyway: true }, POOL, canDoExercise);
if (!built.ok) {
  console.log('3. REFUSED:', built.refusal.message);
  process.exit(0);
}
let structure = built.assembly.structure;
const shape = raceWeekShape(structure);
console.log(`3. BUILT: ${structure.name} — ${structure.weeks} weeks, ${shape.runDays} runs + ${shape.liftDays} lifts a week`);
for (const line of [built.assembly.concern?.message, ...(built.assembly.concerns ?? [])].filter(Boolean)) console.log('   HOLT SAYS:', line);

// 4 ── the lifting days he writes
const athlete = { experience: c.experience.lifting, environment: c.environment, ownedEquipment: c.ownedEquipment, limitations: c.limitations, excludeExercises: c.excludeExercises };
const request = narrowAuthorRequest({
  kind: 'program', said: [SAID], minutes: c.sessionMinutes, days: shape.liftDays, weeks: state.weeks != null && state.weeks < structure.weeks ? state.weeks : structure.weeks, goal: c.strengthGoal ?? 'strength',
  level: athlete.experience, room: athlete.environment, ...authorFacts(athlete, POOL, canDoExercise), recent: [], notes: [],
  beside: { race: RACE_SPEC[c.goal].label, runDays: shape.runDays },
});
const wrote = authoredFromModelText(
  await model(systemOf('supabase/functions/coach-author/index.ts', (s) => s.replace('${AUTHOR_CATALOGUE}', AUTHOR_CATALOGUE)), authorUserTurn(request), {
    max_tokens: AUTHOR_OUTPUT_CAP.program,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: AUTHOR_SCHEMA } },
  }),
  'program',
);
const valid = wrote ? validateAuthored(wrote, athlete, POOL, canDoExercise) : null;
if (valid) {
  structure = spliceLiftDays(structure, valid.days);
  console.log('4. HOLT WROTE THE LIFTING:', authoredLine(wrote, valid), shape.liftDays > 1 && endsOnRace(structure) ? RACE_WEEK_LINE : '');
} else console.log('4. HOLT COULD NOT WRITE THE LIFTING — the rulebook days stay.');
const full = structure.weeks;
if (state.weeks != null && state.weeks < structure.weeks) {
  structure = firstWeeksOf(structure, state.weeks);
  console.log('   ' + stopsShortLine(structure.weeks, full));
}

const row = (m) => `${m.name}${m.targetMi != null ? ` ${m.targetMi} mi` : m.targetSec != null ? ` ${Math.round(m.targetSec / 60)} min` : m.reps != null ? ` ${m.sets}×${m.reps}${m.repsMax ? `-${m.repsMax}` : ''}` : m.durationSec != null ? ` ${m.sets}×${m.durationSec}s` : ''}`;
console.log(`\nTHE PROGRAM: ${structure.name} — ${structure.weeks} weeks`);
for (const w of [0, Math.floor((structure.weeks - 1) / 2), structure.weeks - 1].filter((v, i, a) => a.indexOf(v) === i)) {
  console.log(`\n  WEEK ${w + 1}`);
  for (const d of structure.weekPlans[w].days) console.log(`    ${d.letter}  ${d.name.padEnd(16)} ${d.main.map(row).join(' · ') || '—'}`);
}
console.log(`\nspent $${spent.toFixed(4)}`);
