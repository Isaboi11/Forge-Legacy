/**
 * Resolve, validate and emit the Bridger Logan program.
 *
 *   node scripts/bridger-logan/build.mjs           # report only
 *   node scripts/bridger-logan/build.mjs --write   # also write structure.json + insert.sql
 *
 * Three jobs, in order of how much they matter:
 *
 *   1. VALIDATE the shape against the app's own reader (`progress-core`), so the thing that gets inserted
 *      is a thing the app can actually walk. 32 sessions, weeks of 6/6/5/5/5/5, no dead slot.
 *   2. RESOLVE written names to catalogue ids, using the same matcher the paste-import uses — which
 *      abstains rather than guess, because a wrong lift is invisible and permanent.
 *   3. EMIT the row. SQL for the Supabase editor, since this project has no CLI or service key.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { STRUCTURE } from './program.mjs';
import { ALIASES } from './aliases.mjs';
import { matchExercise } from '../../src/domain/program/exercise-match.ts';
import { scheduleSlots, totalSessions, weekSizes, nextSession } from '../../src/domain/program/progress-core.ts';
import { deriveBlocks, plannedSetCount, schemeText } from '../../src/domain/program/prescription.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const catalog = JSON.parse(readFileSync(join(ROOT, 'src/domain/exercise-relationships/source/exercises.json'), 'utf8')).map(
  (e) => ({ key: e.id, name: e.name, aliases: e.aliases ?? [] }),
);

const allItems = (s) => {
  const out = [];
  for (const wp of s.weekPlans) for (const d of wp.days) out.push(...d.warmup, ...d.main, ...d.cooldown);
  return out;
};

// ── 1. validate the shape ────────────────────────────────────────────────────

const sizes = weekSizes(STRUCTURE);
const slots = scheduleSlots(STRUCTURE);
const dead = slots.filter((s) => !s.day).length;
const unreachable = Array.from({ length: totalSessions(STRUCTURE) }, (_, i) => nextSession(STRUCTURE, i)).filter((s) => !s).length;

console.log('── shape ──');
console.log('weeks       :', sizes.join(', '), `(${sizes.reduce((a, b) => a + b, 0)} sessions)`);
console.log('totalSessions:', totalSessions(STRUCTURE));
console.log('dead slots  :', dead);
console.log('unreachable :', unreachable);

const problems = [];
if (totalSessions(STRUCTURE) !== 32) problems.push(`expected 32 sessions, got ${totalSessions(STRUCTURE)}`);
if (String(sizes) !== String([6, 6, 5, 5, 5, 5])) problems.push(`expected weeks 6,6,5,5,5,5 — got ${sizes}`);
if (dead) problems.push(`${dead} slot(s) resolve to no day`);
if (unreachable) problems.push(`${unreachable} session(s) unreachable via nextSession`);

// Every day must actually prescribe something, and every circuit must know its own size.
for (const [wi, wp] of STRUCTURE.weekPlans.entries()) {
  for (const [di, d] of wp.days.entries()) {
    const n = d.warmup.length + d.main.length + d.cooldown.length;
    if (!n) problems.push(`W${wi + 1}D${di + 1} "${d.name}" is empty`);
    for (const b of deriveBlocks([...d.warmup, ...d.main, ...d.cooldown])) {
      if (b.groupId && !b.rounds && !b.capSec) problems.push(`W${wi + 1}D${di + 1} block "${b.name}" has neither rounds nor a cap`);
    }
  }
}

// ── 2. resolve names ─────────────────────────────────────────────────────────

// An alias pointing at an id that does not exist is a typo that would silently produce a dead link on a
// detail page nobody opens until months later. Caught here instead.
const validIds = new Set(catalog.map((c) => c.key));
for (const [written, id] of Object.entries(ALIASES)) {
  if (!validIds.has(id)) problems.push(`alias "${written}" → "${id}" is not a catalogue id`);
}

const items = allItems(STRUCTURE);
const byName = new Map();
for (const ex of items) {
  if (ex.kind === 'cardio') {
    ex.catalogKey = `cardio:${ex.activity}`;
    continue;
  }
  if (!byName.has(ex.name)) {
    // The hand map first, the fuzzy matcher only for what it can settle on its own.
    const id = ALIASES[ex.name];
    byName.set(ex.name, id ? { key: id, by: 'alias' } : (matchExercise(ex.name, catalog) ?? null));
  }
  const m = byName.get(ex.name);
  if (m) ex.catalogKey = m.key;
}

const distinct = [...byName.entries()];
const matched = distinct.filter(([, m]) => m);
const unmatched = distinct.filter(([, m]) => !m);

console.log('\n── catalogue ──');
console.log(`items        : ${items.length}`);
console.log(`distinct     : ${distinct.length}`);
console.log(`matched      : ${matched.length}`);
console.log(`unmatched    : ${unmatched.length}`);
if (unmatched.length) {
  console.log('\nUnmatched (kept verbatim — they still train fine, they just have no detail page):');
  for (const [name] of unmatched) console.log('  ·', name);
}

console.log('\n── sample: W1D1 ──');
const d1 = STRUCTURE.weekPlans[0].days[0];
for (const b of deriveBlocks([...d1.warmup, ...d1.main, ...d1.cooldown])) {
  if (b.groupId) {
    console.log(`  [${b.capSec ? 'AMRAP ' + b.capSec / 60 + 'm' : b.rounds + ' rounds'}] ${b.name}`);
    for (const i of b.items) console.log(`      ${schemeText(i).padEnd(14)} ${i.name}`);
  } else {
    for (const i of b.items) console.log(`  ${schemeText(i).padEnd(16)} ${i.name}`);
  }
}
console.log(`  planned sets: ${plannedSetCount([...d1.warmup, ...d1.main, ...d1.cooldown])}`);

// ── 3. emit ──────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error('\n✖ NOT VALID — nothing written:');
  for (const p of problems) console.error('  ·', p);
  process.exit(1);
}
console.log('\n✔ shape valid');

if (process.argv.includes('--write')) {
  // Passed in, never committed — the account this belongs to is not repository content.
  const EMAIL = (process.argv.find((a) => a.startsWith('--email=')) ?? '').slice('--email='.length);
  if (!EMAIL) {
    console.error('\n✖ --write needs --email=<the account this program belongs to>');
    process.exit(1);
  }
  const outDir = join(HERE, 'out');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'structure.json'), JSON.stringify(STRUCTURE, null, 2));

  /**
   * The insert, for the Supabase SQL editor.
   *
   * The athlete is looked up BY EMAIL rather than a pasted uuid — the editor runs as the service role,
   * so `auth.uid()` is null here and a hand-copied id is a silent way to write somebody else's row.
   * `where not exists` makes re-running it a no-op instead of a second copy with split progress.
   */
  const sql = `-- Bridger Logan — 6 Weeks: one personal program row for a single athlete.
-- Paste into the Supabase SQL editor. Safe to re-run: it will not create a duplicate.
--
-- NOT a catalog program. \`source_definition_id\` stays NULL so this never appears in Discover for
-- anyone else — it is a transcription of a program this athlete bought, for their own use.

insert into public.programs (athlete_id, name, structure)
select u.id, ${sqlStr(STRUCTURE.name)}, ${sqlStr(JSON.stringify(STRUCTURE))}::jsonb
from auth.users u
where u.email = ${sqlStr(EMAIL)}
  and not exists (
    select 1 from public.programs p
    where p.athlete_id = u.id and p.name = ${sqlStr(STRUCTURE.name)}
  );
`;
  writeFileSync(join(outDir, 'insert.sql'), sql);
  console.log(`\nwrote ${join(outDir, 'structure.json')}`);
  console.log(`wrote ${join(outDir, 'insert.sql')}`);
}

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
