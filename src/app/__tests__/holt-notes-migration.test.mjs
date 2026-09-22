/**
 * holt-notes-migration.test.mjs — 0204 stays the shape CA-D2 depends on.
 *
 * Coach-AI-Amendment-001 CA-D2: Holt's notes are visible, editable and deletable by the athlete, and
 * capped at 20. Every one of those is carried by SQL — owner-only RLS and a cap trigger — and each fails
 * SILENTLY if a later edit relaxes it: a table with a broader policy still works, and a missing trigger
 * still inserts. `node --test` cannot reach Postgres, so the invariants are held as source guards, the
 * same shape as `trainer-core-migration.test.mjs`.
 *
 * Run:  node --test src/app/__tests__/holt-notes-migration.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const MIGRATION = read('../../../supabase/migrations/0204_holt_notes.sql');
const BUNDLE = read('../../../supabase/apply/pending-0204.sql');

/** SQL with every `--` comment line removed, so a claim in prose can never satisfy an assertion. */
const code = MIGRATION.split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

test('pending-0204.sql carries 0204_holt_notes.sql verbatim', () => {
  assert.ok(BUNDLE.includes(MIGRATION.trim()), 'the pasted file and the migration of record have diverged');
});

test('the table: one-liners, owned by the signed-in athlete, gone with the account', () => {
  assert.match(code, /create table if not exists public\.holt_notes/);
  assert.match(code, /text\s+varchar\(80\) not null/);
  assert.match(code, /athlete_id\s+uuid\s+not null default auth\.uid\(\) references auth\.users\(id\) on delete cascade/);
  assert.match(code, /check \(char_length\(btrim\(text\)\) >= 2\)/);
  assert.match(code, /\bsource\s+text\b/);
});

test('RLS is on, and every policy is owner-only', () => {
  assert.match(code, /alter table public\.holt_notes enable row level security/);
  const policies = code.match(/create policy\s+\w+\s+on\s+public\.holt_notes\b[\s\S]*?;/g) ?? [];
  assert.equal(policies.length, 4, 'select, insert, update, delete — one each');
  for (const cmd of ['select', 'insert', 'update', 'delete']) {
    const p = policies.find((x) => new RegExp(`\\bfor ${cmd}\\b`).test(x));
    assert.ok(p, `no ${cmd} policy — the athlete must be able to ${cmd} their notes`);
    assert.ok(/athlete_id = auth\.uid\(\)/.test(p), `${cmd} policy is not owner-scoped`);
    assert.ok(!/\btrue\b|\bor\b/i.test(p.replace(/athlete_id = auth\.uid\(\)/g, '')), `${cmd} policy widened beyond the owner`);
  }
  assert.ok(!/\bfor all\b/.test(code), 'no catch-all policy');
  // Update cannot hand a note to someone else.
  assert.match(code, /for update\s+using \(athlete_id = auth\.uid\(\)\)\s+with check \(athlete_id = auth\.uid\(\)\)/);
});

test('anon has no access', () => {
  assert.match(code, /revoke all on public\.holt_notes from anon;/);
  assert.ok(!/grant [^;]*on public\.holt_notes to [^;]*\banon\b/.test(code));
});

test('the 20-note cap is enforced in the database, before insert, under a per-athlete lock', () => {
  assert.match(code, /create trigger holt_notes_cap\s+before insert on public\.holt_notes\s+for each row execute function public\.holt_notes_enforce_cap\(\)/);
  const fn = code.slice(code.indexOf('create or replace function public.holt_notes_enforce_cap'), code.indexOf('drop trigger if exists holt_notes_cap'));
  assert.match(fn, /pg_advisory_xact_lock\(/, 'two devices must not race past the cap');
  assert.match(fn, /if held >= 20 then/);
  assert.match(fn, /raise exception 'holt_notes_cap:/, 'the client recognises the cap by this prefix');
  assert.match(fn, /set search_path = public/);
  assert.ok(!/security definer/i.test(fn), 'invoker: RLS still stands between this body and other athletes');
});

test('idempotent: safe to paste twice', () => {
  assert.match(code, /create table if not exists/);
  assert.match(code, /create index if not exists/);
  assert.match(code, /if not exists \(select 1 from pg_constraint where conname = 'holt_notes_text_len'\)/);
  for (const p of ['select', 'insert', 'update', 'delete']) assert.ok(code.includes(`drop policy if exists holt_notes_owner_${p}`));
  assert.match(code, /drop trigger if exists holt_notes_cap/);
});

test('the bundle asserts (§2) and reports (§3)', () => {
  assert.match(BUNDLE, /raise exception '0204 DID NOT FULLY APPLY/);
  assert.match(BUNDLE, /relrowsecurity/);
  assert.match(BUNDLE, /tgname = 'holt_notes_cap'/);
  assert.match(BUNDLE, /has_table_privilege\('anon', 'public\.holt_notes', 'select'\)/);
  assert.match(BUNDLE, /from pg_policies\s+where schemaname = 'public' and tablename = 'holt_notes'/);
});

test('the client and the database agree on the cap and the error', () => {
  const store = read('../../domain/coach/holt-notes.ts');
  assert.match(store, /export const HOLT_NOTES_MAX = 20;/);
  assert.match(store, /export const HOLT_NOTE_CHARS = 80;/);
  assert.match(store, /holt_notes_cap/);
  assert.match(store, /'PGRST205', '42P01'/, 'reads stay quiet before 0204 is applied');
});
