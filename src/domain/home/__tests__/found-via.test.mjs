import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FOUND_VIA_COPY, FOUND_VIA_OPTIONS, labelFor } from '../found-via.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const migration = read('supabase/migrations/0273_found_via.sql');

/** Every quoted key inside the first `source in (...)` list after `anchor`. */
function sqlKeys(anchor) {
  const at = migration.indexOf(anchor);
  assert.ok(at >= 0, `0273 no longer contains ${anchor}`);
  const list = /in \(([^)]*)\)/.exec(migration.slice(at))?.[1] ?? '';
  return [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
}

test('the card offers exactly the answers the database accepts (plus Skip)', () => {
  const app = [...FOUND_VIA_OPTIONS.map((o) => o.source), 'skipped'].sort();
  assert.deepEqual(sqlKeys('constraint athlete_found_via_source_check'), app, 'the table check drifted from the card');
  assert.deepEqual(sqlKeys("p_source not in"), app, 'set_found_via drifted from the card');
});

test('the operator push has words for every answer', () => {
  for (const o of FOUND_VIA_OPTIONS) assert.match(migration, new RegExp(`when '${o.source}'\\s+then '`), o.source);
  assert.match(migration, /when 'skipped'\s+then '/);
});

test('six answers, two columns, Other last, no duplicates', () => {
  assert.equal(FOUND_VIA_OPTIONS.length, 6);
  assert.equal(FOUND_VIA_OPTIONS.at(-1).source, 'other');
  assert.equal(new Set(FOUND_VIA_OPTIONS.map((o) => o.label)).size, 6);
  assert.equal(labelFor('tiktok'), 'TikTok');
  assert.equal(FOUND_VIA_COPY.thanksBody('TikTok'), 'TikTok · you won’t see this again.');
});

test('Home holds its first paint for the question, and fails closed without 0273', () => {
  const home = read('src/app/(tabs)/index.tsx');
  assert.match(home, /useQuery\(fetchFoundViaOwed, \[\]\)/);
  assert.match(home, /isHomeReady\(\s*\[[\s\S]*foundViaSettled[\s\S]*\]\s*,/);
  assert.match(home, /\{foundViaOwed \? <FoundViaCard \/> : null\}/);
  const live = read('src/data/found-via-live.ts');
  assert.match(live, /if \(error\) return false;/, 'a failed read must mean "no card", not a thrown Home');
});
