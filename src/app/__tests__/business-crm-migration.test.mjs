// node --test src/app/__tests__/business-crm-migration.test.mjs
//
// Static guards on migration 0236 (the Business CRM, Admin-Analytics-Amendment-002). The PGlite run that
// executed the bundle end to end lives outside the repo; these are the cheap, permanent tripwires on the
// decisions that make the CRM safe to have at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const MIGRATION = readFileSync(new URL('../../../supabase/migrations/0236_business_crm.sql', import.meta.url), 'utf8');
const BUNDLE = readFileSync(new URL('../../../supabase/apply/pending-0236.sql', import.meta.url), 'utf8');
const LIVE = readFileSync(new URL('../../data/admin-live.ts', import.meta.url), 'utf8');
const ROUNDTRIP = readFileSync(new URL('../../../supabase/seed/admin-roundtrip.mjs', import.meta.url), 'utf8');

/** name → body, for every `create or replace function public.<name>(` in the migration. */
function functions(sql) {
  const out = new Map();
  const re = /create or replace function public\.(\w+)\s*\(([\s\S]*?)\$\$([\s\S]*?)\$\$;/g;
  for (const m of sql.matchAll(re)) out.set(m[1], m[3]);
  return out;
}
const FNS = functions(MIGRATION);
const ADMIN = [...FNS.keys()].filter((n) => n.startsWith('admin_'));

test('the paste bundle carries the migration byte-for-byte', () => {
  assert.ok(BUNDLE.includes(MIGRATION));
});

test('21 admin functions, and admin_guard() is the FIRST statement of every one (AA-D5)', () => {
  assert.equal(ADMIN.length, 21);
  for (const name of ADMIN) {
    const body = FNS.get(name);
    const firstStatement = body.replace(/^[\s\S]*?\bbegin\b/i, '').trim().split(';')[0].trim();
    assert.equal(firstStatement, 'perform public.admin_guard()', `${name} does not open with the guard`);
  }
});

test('every new table is RLS-on with no policy of its own (AA-D6 pattern)', () => {
  for (const t of ['ops_bugs', 'crm_contacts', 'crm_activity', 'ops_documents', 'asc_daily', 'asc_reviews', 'asc_sync_log']) {
    assert.match(MIGRATION, new RegExp(`alter table public\\.${t} enable row level security;`), t);
    assert.doesNotMatch(MIGRATION, new RegExp(`create policy[^;]*on public\\.${t}\\b`), `${t} has a policy`);
  }
});

test('the documents bucket is private and only an app admin can touch it (AA-D16)', () => {
  assert.match(MIGRATION, /values \('ops-docs', 'ops-docs', false,/);
  assert.match(MIGRATION, /on conflict \(id\) do update set public = false/);
  const policies = [...MIGRATION.matchAll(/create policy "ops_docs_admin_\w+"[\s\S]*?;/g)].map((m) => m[0]);
  assert.equal(policies.length, 4);
  for (const p of policies) assert.match(p, /bucket_id = 'ops-docs' and public\.is_app_admin\(\)/);
});

test('the user card reads no training, social, presence, photo, nutrition, health or auth table (AA-D13)', () => {
  const body = FNS.get('admin_user_card');
  const banned =
    /\b(public\.)?(workouts?|workout_\w+|personal_records|lift_\w+|chapter_photos|transformation_\w+|squad\w*|friend\w*|athlete_activity|app_events|meal\w*|food\w*|nutrition\w*|health\w*|route\w*|goals?|honors?|rank\w*|chapters?)\b|auth\.users/i;
  assert.doesNotMatch(body, banned);
  // …and it still reads what it is for.
  for (const t of ['athlete_entitlement', 'store_subscriptions', 'store_events', 'coach_ai_spend', 'feedback', 'trainers']) {
    assert.match(body, new RegExp(`public\\.${t}\\b`), t);
  }
});

test('AI usage is metered, never read: no function selects a prompt, reply or memory (AA-D14)', () => {
  assert.doesNotMatch(MIGRATION, /coach_(messages|memory|threads)|holt_memory|\bprompt\b|\breply\b/i);
});

test('the client names 0236 when a function is missing, and the roundtrip lists every function', () => {
  for (const name of ADMIN) {
    assert.match(LIVE, new RegExp(`'${name}'`), `admin-live.ts FROM_MIGRATION lacks ${name}`);
    assert.match(ROUNDTRIP, new RegExp(`\\['${name}'`), `admin-roundtrip.mjs lacks ${name}`);
  }
});

test('QA items are closed, never deleted; only manual bugs can be deleted (AA-D19)', () => {
  assert.match(FNS.get('admin_bug_delete'), /where id = p_id and source = 'manual'/);
});
