import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/*
 * P-G10 (AI Road to 10 Sprint 1): the operator tools' Opus spend goes on its own line of the AI ledger through
 * `coach_ai_record_admin_usage` (0268) — never anyone's balance, and never a reason the owner's click fails.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[ \t])\/\/[^\n]*/g, '$1');

test('bug-plain: every model call on the operators’ ledger line, and no upstream status in a reply', () => {
  const SRC = code(read('supabase/functions/bug-plain/index.ts'));
  assert.match(SRC, /caller\.rpc\('coach_ai_record_admin_usage', \{\s+p_action: 'admin_bug_plain',/);
  // unreachable, non-2xx, unreadable body, refusal/cut-off, bad JSON, ok
  assert.equal((SRC.match(/await meter\('/g) ?? []).length + (SRC.match(/await meter\(payload\.stop_reason/g) ?? []).length, 6);
  assert.ok(!/status:\s*response\.status/.test(SRC.slice(SRC.indexOf('Deno.serve'))), 'no upstream status in a reply (P-D8)');
  assert.ok(!/coach_ai_spend_credits|coach_ai_reserve/.test(SRC), 'an operator tool never touches a balance');
  // The meter's result is not checked: 0268 missing must not fail the owner's click.
  assert.ok(!/await meter\([^)]*\)\s*;?\s*if \(/.test(SRC));
});

test('social-plan: each job on the operators’ ledger line; the pure core untouched', () => {
  const SRC = read('supabase/functions/social-plan/index.ts');
  const handler = SRC.slice(SRC.indexOf('Deno.serve('));
  assert.match(handler, /caller\.rpc\('coach_ai_record_admin_usage', \{\s+p_action: 'admin_social_plan',/);
  assert.ok(!/await callClaude\(/.test(handler.replace(/const timedClaude[\s\S]*?\n {2}\};/, '')), 'every job call is timed and metered');
  assert.equal((handler.match(/await timedClaude\(/g) ?? []).length, 3, 'research, plan, script');
  assert.equal((handler.match(/await meter\(/g) ?? []).length, 5, 'research once; plan and script on failure and on answer');
  const core = SRC.slice(SRC.indexOf('// ── PURE CORE START ──'), SRC.indexOf('// ── PURE CORE END ──'));
  assert.ok(core.length > 1000);
  assert.ok(!/coach_ai_record_admin_usage|timedClaude/.test(core), 'the pure core (cut out by its own test on feat/crm-planner) is unchanged');
});

test('the admin actions the functions send are the two 0268 accepts', () => {
  const MIG = read('supabase/migrations/0268_ai_meter_reserve_settle.sql');
  assert.match(MIG, /p_action not in \('admin_bug_plain', 'admin_social_plan'\)/);
  assert.match(read('supabase/functions/bug-plain/index.ts'), /p_action: 'admin_bug_plain'/);
  assert.match(read('supabase/functions/social-plan/index.ts'), /p_action: 'admin_social_plan'/);
});
