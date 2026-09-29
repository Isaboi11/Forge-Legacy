// node --test src/app/__tests__/bug-sources-migration.test.mjs
//
// Static guards on migration 0239 (the Bugs page's four sources, AA-D21). Same tripwires as 0238's:
// every admin function opens with the guard, the new tables have no policies, the bundle is verbatim,
// and — because 0238 is applied — nothing here restates an applied function.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MIGRATION = readFileSync(new URL('../../../supabase/migrations/0239_bug_sources.sql', import.meta.url), 'utf8');
const BUNDLE = readFileSync(new URL('../../../supabase/apply/pending-0239.sql', import.meta.url), 'utf8');
const ROUNDTRIP = readFileSync(new URL('../../../supabase/seed/admin-roundtrip.mjs', import.meta.url), 'utf8');

function functions(sql) {
  const out = new Map();
  for (const m of sql.matchAll(/create or replace function public\.(\w+)\s*\(([\s\S]*?)\$\$([\s\S]*?)\$\$;/g)) out.set(m[1], m[3]);
  return out;
}
const FNS = functions(MIGRATION);
const ADMIN = [...FNS.keys()].filter((n) => n.startsWith('admin_'));

test('the paste bundle carries the migration byte-for-byte', () => {
  assert.ok(BUNDLE.includes(MIGRATION));
});

test('6 admin functions, each opening with admin_guard() (AA-D5), each in the roundtrip', () => {
  assert.equal(ADMIN.length, 6);
  for (const name of ADMIN) {
    const first = FNS.get(name).replace(/^[\s\S]*?\bbegin\b/i, '').trim().split(';')[0].trim();
    assert.equal(first, 'perform public.admin_guard()', `${name} does not open with the guard`);
    assert.match(ROUNDTRIP, new RegExp(`\\['${name}'`), `admin-roundtrip.mjs lacks ${name}`);
  }
});

test('every new table is RLS-on with no policy (AA-D6)', () => {
  for (const t of ['sentry_issues', 'asc_feedback', 'ops_sync_log', 'ops_report_state', 'ops_bug_links']) {
    assert.match(MIGRATION, new RegExp(`alter table public\\.${t} enable row level security;`), t);
    assert.doesNotMatch(MIGRATION, new RegExp(`create policy[^;]*on public\\.${t}\\b`), `${t} has a policy`);
  }
});

test('no function applied in 0238 is restated here', () => {
  for (const applied of ['admin_bugs', 'admin_bug_track', 'admin_bug_save', 'admin_user_card', 'admin_revenue', 'ops_next_bug_ref']) {
    assert.ok(!FNS.has(applied), `0239 restates ${applied}`);
  }
});

test('TestFlight feedback never stores the tester email (AA-D13)', () => {
  const table = MIGRATION.match(/create table if not exists public\.asc_feedback \(([\s\S]*?)\);/)[1];
  assert.doesNotMatch(table, /email/i);
});

test('the inbox reads no training, social, presence, nutrition or health table', () => {
  assert.doesNotMatch(FNS.get('admin_reports_inbox'), /\bpublic\.(workouts?|workout_\w+|squad\w*|friend\w*|athlete_activity|meal\w*|food\w*|health\w*|chapter\w*)\b|auth\.users/i);
});
