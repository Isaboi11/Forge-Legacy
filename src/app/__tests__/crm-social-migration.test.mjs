// node --test src/app/__tests__/crm-social-migration.test.mjs
//
// Static guards on migration 0247 (the CRM's Social section, Admin-Analytics-Amendment-003). The PGlite run
// that executed the bundle end to end (the gate, attach/unlink, tags, the daily tick, no token in the read)
// lives outside the repo; these are the cheap, permanent tripwires on what makes it safe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const MIGRATION = read('../../../supabase/migrations/0247_crm_social.sql');
const BUNDLE = read('../../../supabase/apply/pending-0247.sql');
const LIVE = read('../../data/admin-live.ts');
const SOCIAL_LIVE = read('../../data/social-live.ts');
const ROUNDTRIP = read('../../../supabase/seed/admin-roundtrip.mjs');
const SYNC = read('../../../supabase/functions/social-sync/index.ts');

/** name → body, for every `create or replace function public.<name>(` in the migration. */
function functions(sql) {
  const out = new Map();
  const re = /create or replace function public\.(\w+)\s*\(([\s\S]*?)\$\$([\s\S]*?)\$\$;/g;
  for (const m of sql.matchAll(re)) out.set(m[1], m[3]);
  return out;
}
const FNS = functions(MIGRATION);
const ADMIN = [...FNS.keys()].filter((n) => n.startsWith('admin_'));
const TABLES = [...MIGRATION.matchAll(/create table if not exists public\.(ops_social_\w+)/g)].map((m) => m[1]);

test('the paste bundle carries the migration byte-for-byte', () => {
  assert.ok(BUNDLE.includes(MIGRATION));
});

test('15 admin functions, and admin_guard() is the FIRST statement of every one (AA-D5)', () => {
  assert.equal(ADMIN.length, 15);
  for (const name of ADMIN) {
    const firstStatement = FNS.get(name).replace(/^[\s\S]*?\bbegin\b/i, '').trim().split(';')[0].trim();
    assert.equal(firstStatement, 'perform public.admin_guard()', `${name} does not open with the guard`);
  }
});

test('13 tables, every one RLS-on with no policy and no grant to a client role (AA-D6)', () => {
  assert.equal(TABLES.length, 13);
  const revoke = MIGRATION.match(/revoke all on public\.ops_social_accounts[\s\S]*?from anon, authenticated;/)?.[0] ?? '';
  for (const t of TABLES) {
    assert.match(MIGRATION, new RegExp(`alter table public\\.${t}\\s+enable row level security;`), t);
    assert.match(revoke, new RegExp(`public\\.${t}\\b`), `${t} is not revoked from the client roles`);
  }
  assert.doesNotMatch(MIGRATION, /create policy/i);
});

test('the read says WHETHER an account is connected and never carries a token (AA-D26)', () => {
  const body = FNS.get('admin_social_media');
  assert.equal(body.match(/access_token/g).length, 1);
  assert.match(body, /'connected', a\.access_token is not null/);
  assert.doesNotMatch(body, /refresh_token|cron_secret|token_expires_at/);
  // `username`, not `handle`: the roundtrip's leak check reserves "handle" for athletes.
  assert.doesNotMatch(body, /'handle'/);
});

test('nothing here reads an athlete, training or billing table (AA-D13, AA-D28)', () => {
  const banned = /\bpublic\.(profiles|athletes?|workouts?|workout_\w+|personal_records|squad\w*|friend\w*|store_events|store_subscriptions|athlete_entitlement)\b|\bauth\.users\b/;
  for (const [name, body] of FNS) assert.doesNotMatch(body, banned, name);
  // The one outside table is the early-access list, and only as a count per platform per day.
  const body = FNS.get('admin_social_media');
  assert.match(body, /from public\.testflight_requests t/);
  assert.doesNotMatch(body, /t\.email/);
});

test('only the link counter is open to the public, and it can only count a known platform', () => {
  assert.match(MIGRATION, /grant execute on function public\.social_link_hit\(text\) to anon, authenticated;/);
  assert.equal(MIGRATION.match(/grant [^;]*\bto anon\b/g).length, 1);
  const body = FNS.get('social_link_hit');
  assert.match(body, /if v_p not in \('tiktok', 'instagram'\) then\s+return;/);
  assert.doesNotMatch(body, /auth\.uid|inet_client_addr|request\.headers/);
});

test('the daily tick is callable by nobody, and proves itself to the function with the secret', () => {
  assert.match(MIGRATION, /revoke all on function public\.social_sync_tick\(\) from public, anon, authenticated;/);
  assert.match(FNS.get('social_sync_tick'), /'x-cron-secret', v_cfg\.cron_secret/);
  assert.match(SYNC, /timingSafeEqual\(cronSecret/);
});

test('no index uses an expression Postgres will refuse (the 42P17 the first PGlite run caught)', () => {
  for (const m of MIGRATION.matchAll(/create (unique )?index[^;]*;/g)) assert.doesNotMatch(m[0], /::date|now\(\)|current_date/, m[0]);
});

test('the client names 0247 when a function is missing, calls every function, and the roundtrip lists every one', () => {
  for (const name of ADMIN) {
    assert.match(LIVE, new RegExp(`'${name}'`), `admin-live.ts FROM_MIGRATION lacks ${name}`);
    assert.match(SOCIAL_LIVE, new RegExp(`'${name}'`), `social-live.ts never calls ${name}`);
    assert.match(ROUNDTRIP, new RegExp(`\\['${name}'`), `admin-roundtrip.mjs lacks ${name}`);
  }
});
