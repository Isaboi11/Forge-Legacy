import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/*
 * SOURCE TESTS for every metered Edge Function except coach-ask (AI Road to 10 Sprint 1; contract §1–§3). The
 * functions run in Deno against a live meter and a live model, neither reachable from `node --test`, so these
 * read the source and pin the money and safety properties:
 *
 *   · each reserves with ITS OWN slug through `coach_ai_reserve` and never touches the old meter
 *   · every reply after the reservation settles first — a failure refunds (P-D2); exactly one path is charged
 *   · no reply carries the upstream's words or status (P-D8), or the reservation id (contract §1.3)
 *   · each runs the model under its own abort (contract §3; the figures are held to the table in meter-server.test)
 *   · the server age reaches the USER turn of the advice functions only, never a cached system block (P-G8)
 *   · `no_consent` is a 403 (P-G9); form check has a daily cap (P-D6)
 *
 * The operator tools' metering (P-G10) is `admin-metering-source.test.mjs`.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

/** The function's code with comments removed and, for the self-contained ones, the METER copy cut out. */
function codeOf(fn) {
  let s = read(`supabase/functions/${fn}/index.ts`);
  const a = s.indexOf('// ── METER: begin ──');
  if (a >= 0) s = s.slice(0, a) + s.slice(s.indexOf('// ── METER: end ──'));
  // Line comments (not inside the prompts' template literals — `//` only starts a comment after whitespace) and
  // JSDoc blocks.
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[ \t])\/\/[^\n]*/g, '$1');
}

/** Every `return json(…)` statement from `from` on, paren-matched. */
function returnsAfter(src, from) {
  const out = [];
  let i = src.indexOf('return json(', from);
  while (i >= 0) {
    let depth = 0;
    let j = i + 'return json'.length;
    for (; j < src.length; j += 1) {
      if (src[j] === '(') depth += 1;
      else if (src[j] === ')' && --depth === 0) break;
    }
    out.push(src.slice(i, j + 1));
    i = src.indexOf('return json(', j);
  }
  return out;
}

const SYSTEM_OF = (src) => src.slice(src.indexOf('const SYSTEM = `'), src.indexOf('`;', src.indexOf('const SYSTEM = `')));

const FUNCTIONS = [
  { fn: 'coach-interpret', action: 'action', advice: true },
  { fn: 'coach-author', action: 'action', advice: true },
  { fn: 'coach-kitchen', action: 'KITCHEN_ACTION', advice: true },
  { fn: 'coach-form-check', action: 'FORM_ACTION', advice: true },
  { fn: 'meal-photo-read', action: 'MEAL_PHOTO_ACTION', advice: false },
  { fn: 'recipe-photo-read', action: 'RECIPE_PHOTO_ACTION', advice: false },
  { fn: 'program-photo-read', action: 'ACTION', advice: false },
  { fn: 'workout-card-read', action: 'ACTION', advice: false },
  { fn: 'workout-tidy', action: 'ACTION', advice: false },
];

for (const { fn, action, advice } of FUNCTIONS) {
  const SRC = codeOf(fn);

  test(`${fn}: reserves through coach_ai_reserve with its own slug, and never calls the old meter`, () => {
    assert.match(SRC, new RegExp(`const FN = '${fn}';`));
    const calls = SRC.match(/rpc\('coach_ai_reserve', \{ p_action: (\w+), p_fn: FN \}\)/g) ?? [];
    assert.equal(calls.length, 1, 'exactly one reservation');
    assert.ok(calls[0].includes(`p_action: ${action},`));
    for (const old of ['coach_ai_spend_credits', 'coach_ai_record_usage', 'coach_ai_quote']) {
      assert.ok(!SRC.includes(old), `${fn} still calls ${old}`);
    }
    assert.ok(SRC.indexOf("rpc('coach_ai_reserve'") < SRC.indexOf("fetch('https://api.anthropic.com/v1/messages'"), 'reserved before the model');
  });

  test(`${fn}: every reply after the model call settles first; one path is charged, every other refunds`, () => {
    assert.equal((SRC.match(/rpc\('coach_ai_settle', settleArgs\(meter\.id, /g) ?? []).length, 1, 'one settle, in the closure');
    const after = returnsAfter(SRC, SRC.indexOf('await timedModelCall('));
    assert.ok(after.length >= 3, `${fn} has its failure and success replies after the call`);
    // coach-interpret settles through `tail()`, which awaits `settle()` and adds the usage block.
    if (fn === 'coach-interpret') assert.match(SRC, /const tail = async \(outcome: SettleOutcome\) => \(\{ \.\.\.\(await settle\(outcome, call\)\), usage: usageTail \}\);/);
    for (const r of after) assert.match(r, /await (settle|tail)\(/, `a reply after the model call does not settle: ${r.slice(0, 120)}`);
    const charged = after.filter((r) => /settle\('ok'/.test(r));
    // coach-interpret's last reply settles 'ok' OR a refund, decided by the narrowing — it is the one charged path.
    const decided = after.filter((r) => /tail\(stopped \? 'refusal' : emptied \? 'bad_output' : 'ok'\)/.test(r));
    assert.equal(charged.length + decided.length, 1, 'exactly one charged path');
    // The failed model call (unreachable / non-2xx / our timeout) is refunded with its own kind as the outcome.
    assert.match(SRC, /if \(call\.kind !== 'ok'\) \{[\s\S]{0,200}\.\.\.failedCallReply\(call\.kind\), \.\.\.\(await settle\(call\.kind/);
    assert.match(SRC, /failedCallReply\(call\.kind\)[^\n]*\}, 503\);/, 'the existing 503 for an upstream failure');
  });

  test(`${fn}: ⛔ no upstream text, no upstream status, no reservation id in any reply`, () => {
    assert.ok(!/\bdetail\s*:/.test(SRC), 'no `detail`');
    assert.ok(!/status:\s*response\.status/.test(SRC), 'no upstream status');
    assert.ok(!/response\.text\(\)|\.text\(\)\.catch/.test(SRC), 'the function never reads the upstream body itself (timedModelCall logs it)');
    assert.ok(!/\.\.\.meter\b|meter:\s*meter|reservation_id/.test(SRC), 'the reservation never reaches a reply');
    assert.equal((SRC.match(/meter\.id/g) ?? []).length, 1, 'meter.id is used once — in settleArgs');
  });

  test(`${fn}: the model call runs under this function's own abort`, () => {
    assert.match(SRC, /fetch\('https:\/\/api\.anthropic\.com\/v1\/messages', \{\s+method: 'POST',\s+signal,/);
    if (fn === 'coach-author') {
      assert.match(SRC, /const deadline = Date\.now\(\) \+ UPSTREAM_ABORT_MS\[FN\];/, 'one budget for both asks');
      assert.match(SRC, /const left = deadline - Date\.now\(\);\n\s*if \(left <= 0\) break;/);
    } else {
      assert.match(SRC, /\n\s*UPSTREAM_ABORT_MS\[FN\],\n\s*\);/);
    }
  });

  test(`${fn}: no_consent is its own 403; no Premium AI / no credits keep the existing reply`, () => {
    assert.match(SRC, /if \(meter\.reason === 'no_consent'\) return json\(\{ (ok: false|route: 'error'), reason: 'no_consent' \}, 403\);/);
    assert.match(SRC, /if \(meter\.reason === 'meter_unavailable'\) return json\(\{ (ok: false|route: 'error'), reason: 'meter_unavailable' \}, 503\);/);
  });

  test(`${fn}: the server age goes in the ${advice ? 'USER turn' : 'request NOWHERE (a transcription)'} — never the cached system block`, () => {
    const sys = SYSTEM_OF(SRC);
    assert.ok(sys.length > 500);
    assert.ok(!/ageLine|withAgeLine|meter\.|ageYears|minor/.test(sys), 'nothing per-athlete in the cached block');
    const uses = (SRC.match(/\b(ageLine|withAgeLine)\(/g) ?? []).length;
    if (advice) {
      assert.equal(uses, 1, `${fn} puts the age line in its user turn once`);
      assert.match(SRC, /(ageLine|withAgeLine)\([^;\n]{0,120}?meter\.ageYears, (meter\.minor|minor)\)/);
    } else {
      assert.equal(uses, 0, `${fn} is a transcription: an age line cannot change it and could corrupt it`);
    }
  });
}

test('coach-kitchen: a minor is the server’s minor OR the app’s flag — the stricter wins', () => {
  const SRC = codeOf('coach-kitchen');
  assert.match(SRC, /const minor = request\.minor \|\| meter\.minor;/);
  assert.match(SRC, /withAgeLine\(kitchenUserTurn\(\{ \.\.\.request, minor \}\), meter\.ageYears, minor\)/);
});

test('coach-interpret: the upstream error no longer carries its status or 300 characters of its body (P-D8)', () => {
  const SRC = codeOf('coach-interpret');
  assert.ok(!/upstream\.slice|status: response/.test(SRC));
  assert.match(SRC, /return json\(\{ route: 'error', \.\.\.failedCallReply\(call\.kind\), \.\.\.\(await settle\(call\.kind, call\)\) \}, 503\);/);
});

test('coach-form-check: the daily ceiling (P-D6) is counted before the credit is held', () => {
  const SRC = codeOf('coach-form-check');
  const cap = SRC.indexOf('(count ?? 0) >= FORM_PER_DAY');
  assert.ok(cap > 0 && cap < SRC.indexOf("rpc('coach_ai_reserve'"));
  assert.match(read('src/domain/coach/form-check.ts'), /export const FORM_PER_DAY = 20;/);
});

test('every regenerated paste copy carries the meter, and no copy still calls the old one', () => {
  for (const fn of ['coach-interpret', 'coach-author', 'coach-kitchen', 'coach-form-check', 'meal-photo-read', 'recipe-photo-read', 'program-photo-read']) {
    const copy = read(`supabase/apply/deploy-${fn}.ts`);
    assert.ok(copy.includes("rpc('coach_ai_reserve'"), `${fn} copy reserves`);
    assert.ok(copy.includes("rpc('coach_ai_settle'"), `${fn} copy settles`);
    assert.ok(copy.includes('function timedModelCall'), `${fn} copy inlines the meter`);
    assert.ok(!/coach_ai_spend_credits|coach_ai_record_usage|coach_ai_quote/.test(copy), `${fn} copy still calls the old meter`);
    assert.ok(copy.includes('pending-0268.sql FIRST'), `${fn} copy says to apply 0268 first`);
  }
});
