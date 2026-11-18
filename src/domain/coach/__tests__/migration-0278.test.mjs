import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { FACT_KINDS } from '../holt-memory.ts';

/**
 * 0278 — Holt remembers you: `holt_notes.kind` and the off switch `holt_memory_prefs` (AI Road to 10 Sprint 4b §1.3,
 * §1.4, §1.7 — the account wipe).
 *
 * Proven 2026-11-18 in PGlite (Postgres 16, a scratch install, not a repo dependency): 0204 + a stand-in auth schema,
 * the bundle run twice — §3 = the prediction both times (notes_total = the stand-in's 1 note); a bad kind refused by
 * the check; deleting the auth.users row took the prefs row AND the notes with it (the account wipe). This file is the
 * rail that stays in the repo.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const MIG = read('supabase/migrations/0278_holt_remembers_you.sql');
const BUNDLE = read('supabase/apply/pending-0278.sql');
const code = (s) => s.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).join('\n');

test('the paste bundle’s §1 is the migration, verbatim', () => {
  const stmts = MIG.slice(MIG.indexOf('begin;'), MIG.indexOf('commit;') + 'commit;'.length);
  assert.ok(BUNDLE.includes(stmts), 'pending-0278.sql §1 and the migration of record have diverged');
  assert.ok(code(stmts).split('\n').filter((l) => /;\s*$/.test(l)).length >= 14);
});

test('⛔ no function is created or replaced — nothing live is retyped', () => {
  assert.doesNotMatch(code(MIG), /create (or replace )?function/i);
  assert.doesNotMatch(code(BUNDLE), /create (or replace )?function/i);
});

test('holt_notes.kind: nullable, no default, checked against the contract’s kinds (FACT_KINDS) — 0204’s rules untouched', () => {
  const c = code(MIG);
  assert.match(c, /alter table public\.holt_notes add column if not exists kind text;/);
  const list = /kind is null or kind in \(([^)]*)\)/.exec(c);
  assert.ok(list, 'the check');
  assert.deepEqual([...list[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]), [...FACT_KINDS]);
  assert.match(c, /if not exists \(select 1 from pg_constraint where conname = 'holt_notes_kind_check'\)/);
  assert.doesNotMatch(c, /holt_notes_cap|holt_notes_enforce_cap|holt_notes_text_len|drop column|alter column/i, 'the cap and the length rule are 0204’s');
});

test('⛔ the account wipe: holt_memory_prefs cascades from auth.users (delete_my_account deletes the auth row)', () => {
  assert.match(code(MIG), /athlete_id\s+uuid\s+primary key default auth\.uid\(\) references auth\.users\(id\) on delete cascade/);
  // …and the notes and summaries it sits beside already do (0204, 0218).
  assert.match(read('supabase/migrations/0204_holt_notes.sql'), /athlete_id\s+uuid\s+not null default auth\.uid\(\) references auth\.users\(id\) on delete cascade/);
  assert.match(read('supabase/migrations/0218_holt_chat_memory.sql'), /athlete_id\s+uuid\s+not null default auth\.uid\(\) references auth\.users\(id\) on delete cascade/);
  assert.match(BUNDLE, /f\.confrelid = 'auth\.users'::regclass and f\.confdeltype = 'c'/, '§2 raises without the cascade');
});

test('the switch: on by default, owner-only RLS on all four verbs, revoked from public AND anon', () => {
  const c = code(MIG);
  assert.match(c, /remembers\s+boolean\s+not null default true/);
  assert.match(c, /alter table public\.holt_memory_prefs enable row level security;/);
  for (const verb of ['select', 'insert', 'update', 'delete']) {
    assert.match(c, new RegExp(`create policy holt_memory_prefs_owner_${verb} on public\\.holt_memory_prefs for ${verb}`));
  }
  assert.equal((c.match(/athlete_id = auth\.uid\(\)/g) ?? []).length, 5, 'select, insert, update (both), delete');
  assert.match(c, /revoke all on public\.holt_memory_prefs from public, anon;/);
  assert.match(c, /grant select, insert, update, delete on public\.holt_memory_prefs to authenticated;/);
});

test('§2 raises when it did not land; §3 predicts its own row', () => {
  for (const s of [
    '0278 DID NOT APPLY: holt_notes has no kind column',
    '0278 DID NOT APPLY: holt_notes_kind_check is missing',
    '0278 DID NOT APPLY: holt_memory_prefs does not exist',
    '0278: RLS is off on holt_memory_prefs',
    '0278: holt_memory_prefs does not have its four owner policies',
    '0278: holt_memory_prefs does not cascade from auth.users',
    '0278: anon or public can read holt_memory_prefs',
    '0278: authenticated cannot use holt_memory_prefs',
  ]) assert.ok(BUNDLE.includes(s), s);
  assert.match(BUNDLE, /PREDICTED §3/);
  for (const col of ['kind_column', 'kind_check', 'prefs_table', 'prefs_rls', 'prefs_policies', 'prefs_cascades', 'anon_can_select', 'public_can_select', 'authenticated_can_select', 'prefs_rows', 'notes_with_kind', 'notes_total']) {
    assert.match(BUNDLE, new RegExp(`as ${col}\\b`), `§3 reports ${col}`);
    assert.match(BUNDLE.slice(0, BUNDLE.indexOf('§1 — THE STATEMENTS')), new RegExp(`${col} = `), `the prediction names ${col}`);
  }
});
