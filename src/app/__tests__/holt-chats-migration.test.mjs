/**
 * holt-chats-migration.test.mjs — 0279 stays the shape past chats depend on (AI Road to 10 Sprint 4b §1.5).
 *
 * Owner-only RLS, no anon, the size check, the newest-100 trim under a per-athlete lock, and the cascade from
 * `auth.users` that IS the account wipe — each fails SILENTLY if a later edit relaxes it (a broader policy still
 * works; a missing trigger still inserts). `node --test` cannot reach Postgres, so they are held as source guards,
 * the same shape as `holt-notes-migration.test.mjs`.
 *
 * Run:  node --test src/app/__tests__/holt-chats-migration.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const MIGRATION = read('../../../supabase/migrations/0279_holt_past_chats.sql');
const BUNDLE = read('../../../supabase/apply/pending-0279.sql');

/** SQL with every `--` comment line removed, so a claim in prose can never satisfy an assertion. */
const code = MIGRATION.split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

test('pending-0279.sql carries 0279_holt_past_chats.sql verbatim', () => {
  assert.ok(BUNDLE.includes(MIGRATION.trim()), 'the pasted file and the migration of record have diverged');
});

test('the table: the phone\'s id, owned by the signed-in athlete, GONE WITH THE ACCOUNT (the cascade is the wipe)', () => {
  assert.match(code, /create table if not exists public\.holt_chats/);
  assert.match(code, /id\s+uuid\s+primary key/);
  assert.match(code, /athlete_id\s+uuid\s+not null default auth\.uid\(\) references auth\.users\(id\) on delete cascade/);
  for (const col of ['title', 'turns', 'preview', 'recap', 'recap_through', 'summary', 'search_text', 'turn_count', 'started_at', 'updated_at']) {
    assert.match(code, new RegExp(`\\n\\s+${col}\\s+\\w`), `column ${col}`);
  }
  assert.match(code, /title\s+varchar\(80\)\s+not null/);
  assert.match(code, /summary\s+varchar\(500\)/);
  assert.ok(!/on delete (set null|restrict|no action)/.test(code), 'every reference cascades');
});

test('the size check: at most 200 turns and 96 KB, and the client agrees', () => {
  assert.match(code, /holt_chats_turns_size check \(\s*jsonb_typeof\(turns\) = 'array'\s*and jsonb_array_length\(turns\) <= 200\s*and octet_length\(turns::text\) <= 98304\s*\)/);
  assert.match(code, /char_length\(recap\) <= 800/);
  const pure = read('../../domain/coach/past-chats.ts');
  assert.match(pure, /export const PAST_CHAT_MAX_TURNS = 200;/);
  assert.match(pure, /export const PAST_CHAT_MAX_BYTES = 96 \* 1024;/);
  assert.match(pure, /export const PAST_CHATS_KEPT = 100;/);
  assert.match(pure, /export const PAST_CHAT_RECAP_CHARS = 800;/);
});

test('RLS is on, and every policy is owner-only', () => {
  assert.match(code, /alter table public\.holt_chats enable row level security/);
  const policies = code.match(/create policy\s+\w+\s+on\s+public\.holt_chats\b[\s\S]*?;/g) ?? [];
  assert.equal(policies.length, 4, 'select, insert, update, delete — one each');
  for (const cmd of ['select', 'insert', 'update', 'delete']) {
    const p = policies.find((x) => new RegExp(`\\bfor ${cmd}\\b`).test(x));
    assert.ok(p, `no ${cmd} policy`);
    assert.ok(/athlete_id = auth\.uid\(\)/.test(p), `${cmd} policy is not owner-scoped`);
    assert.ok(!/\btrue\b|\bor\b/i.test(p.replace(/athlete_id = auth\.uid\(\)/g, '')), `${cmd} policy widened beyond the owner`);
  }
  assert.ok(!/\bfor all\b/.test(code), 'no catch-all policy');
  assert.match(code, /for update\s+using \(athlete_id = auth\.uid\(\)\)\s+with check \(athlete_id = auth\.uid\(\)\)/, 'a row cannot be handed to someone else');
});

test('public and anon have no access', () => {
  assert.match(code, /revoke all on public\.holt_chats from public, anon;/);
  assert.ok(!/grant [^;]*on public\.holt_chats to [^;]*\b(anon|public)\b/.test(code));
  assert.match(code, /grant select, insert, update, delete on public\.holt_chats to authenticated;/);
});

test('the newest 100 are kept, after insert, under a per-athlete advisory lock; updated_at is the server\'s clock', () => {
  assert.match(code, /create trigger holt_chats_keep_hundred\s+after insert on public\.holt_chats\s+for each row execute function public\.holt_chats_keep_hundred\(\)/);
  const fn = code.slice(code.indexOf('create or replace function public.holt_chats_keep_hundred'), code.indexOf('drop trigger if exists holt_chats_keep_hundred'));
  assert.match(fn, /pg_advisory_xact_lock\(hashtextextended\('holt_chats:' \|\| new\.athlete_id::text, 0\)\)/);
  assert.match(fn, /where c\.athlete_id = new\.athlete_id/, 'the trim never reaches another athlete');
  assert.match(fn, /order by k\.updated_at desc, k\.id desc\s+limit 100/);
  assert.match(fn, /set search_path = public/);
  assert.ok(!/security definer/i.test(fn), 'invoker: RLS still stands between this body and other athletes');
  assert.match(code, /create trigger holt_chats_touch\s+before insert or update on public\.holt_chats/);
  assert.match(code, /new\.updated_at := now\(\);/);
  assert.match(code, /create index if not exists holt_chats_athlete_idx on public\.holt_chats \(athlete_id, updated_at desc\)/);
});

test('the trigram index only when pg_trgm is installed', () => {
  assert.match(code, /if exists \(select 1 from pg_extension where extname = 'pg_trgm'\) then\s+execute 'create index if not exists holt_chats_search_trgm_idx on public\.holt_chats using gin \(search_text gin_trgm_ops\)'/);
  assert.ok(!/create extension/i.test(code), 'this file never installs an extension');
});

test('idempotent: safe to paste twice', () => {
  for (const name of ['holt_chats_title_len', 'holt_chats_turns_size', 'holt_chats_turn_count', 'holt_chats_recap_len', 'holt_chats_search_len']) {
    assert.ok(code.includes(`if not exists (select 1 from pg_constraint where conname = '${name}')`), name);
  }
  for (const p of ['select', 'insert', 'update', 'delete']) assert.ok(code.includes(`drop policy if exists holt_chats_owner_${p}`));
  assert.match(code, /drop trigger if exists holt_chats_touch/);
  assert.match(code, /drop trigger if exists holt_chats_keep_hundred/);
});

test('the bundle asserts (§2) and reports (§3), with a prediction written down', () => {
  assert.match(BUNDLE, /raise exception '0279 DID NOT APPLY/);
  assert.match(BUNDLE, /relrowsecurity/);
  assert.match(BUNDLE, /confdeltype = 'c'/, '§2 checks the cascade');
  assert.match(BUNDLE, /has_table_privilege\('anon', 'public\.holt_chats', 'select'\)/);
  assert.match(BUNDLE, /PREDICTED §3/);
  assert.match(BUNDLE, /rows = 0/);
});

test('the client and the database agree on "not there yet"', () => {
  const store = read('../../domain/coach/past-chats-store.ts');
  assert.match(store, /'PGRST205', '42P01'/);
  assert.match(store, /client\.from\('holt_chats'\)/);
});
