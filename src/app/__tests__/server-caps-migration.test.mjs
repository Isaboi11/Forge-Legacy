import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PLAIN, plainError } from '../../lib/plain-error.ts';

/**
 * 0263 — the database enforces the photo, video, squad and day-template caps (pricing sweep G1, PO 11-11).
 *
 * The behaviour was proven against the real DDL in PGlite (Free refused at cap+1, Premium through, over-cap rows
 * untouched, no-uid context exempt, approve refused with the request left pending). This file is the rail that
 * stays in the repo: it holds the properties that make that proof stay true when somebody edits the file.
 *
 *   · the paste bundle carries the migration VERBATIM — the bundle is what is actually applied
 *   · the count is the APP's count: the check calls athlete_live_counts(), the function my_entitlement() reports
 *   · no cap is a literal; check-ins and feed posts are never counted (MA3-D14, and parity with the app)
 *   · no existing function is restated (approve_squad_join_request is covered by the membership trigger)
 *   · every new function is revoked from public, anon AND authenticated (Supabase grants them directly)
 *   · the refusals read right through the app's own plainError()
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

const MIG_FILE = 'supabase/migrations/0263_server_caps_photos_videos_squads_templates.sql';
const MIG = read(MIG_FILE);
const BUNDLE = read('supabase/apply/pending-0263.sql');

const NEW_FNS = [
  'live_cap_check',
  'chapter_photos_cap_guard',
  'transformation_entries_cap_guard',
  'squad_members_cap_guard',
  'workout_templates_cap_guard',
];
const TRIGGERS = [
  ['chapter_photos_cap_guard_trg', 'chapter_photos'],
  ['transformation_entries_cap_guard_trg', 'transformation_entries'],
  ['squad_members_cap_guard_trg', 'squad_members'],
  ['workout_templates_cap_guard_trg', 'workout_templates'],
];

/** `create or replace function public.<name>(` … `$$;` */
function fnDef(sql, name) {
  const all = sql.match(new RegExp('create or replace function public\\.' + name + '\\([\\s\\S]*?\\n\\$\\$;', 'g'));
  assert.ok(all, `${name} is not defined in 0263`);
  assert.equal(all.length, 1, `${name} is defined more than once`);
  return all[0];
}
/** Code only: `--` line comments and block comments removed (string literals are kept). */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

/** The migration's statements, exactly as the bundle must carry them. */
function migrationBody() {
  const a = MIG.indexOf('\nbegin;\n');
  const b = MIG.lastIndexOf('\ncommit;\n');
  assert.ok(a > 0 && b > a, '0263 is wrapped in begin; … commit;');
  return MIG.slice(a + '\nbegin;\n'.length, b + 1).replace(/^\n+/, '');
}

test('the paste bundle carries the migration verbatim, after a preflight and before its assertion', () => {
  const body = migrationBody();
  assert.ok(BUNDLE.includes(body), 'pending-0263.sql §1 is not byte-for-byte the migration body — regenerate it');

  const counts = {
    'create or replace function': 5,
    'create trigger': 4,
    'drop trigger if exists': 4,
    'revoke all on function': 5,
  };
  for (const [kw, n] of Object.entries(counts)) {
    assert.equal((code(body).match(new RegExp(kw, 'g')) ?? []).length, n, `the migration has ${n} × "${kw}"`);
  }

  const p0 = BUNDLE.indexOf('§0 — PREFLIGHT');
  const p1 = BUNDLE.indexOf('§1 — THE TRIGGERS');
  const p2 = BUNDLE.indexOf('§2 — THE ASSERTION');
  const p3 = BUNDLE.indexOf('§3 — THE REPORT');
  assert.ok(p0 > 0 && p0 < p1 && p1 < p2 && p2 < p3, 'sections in order: preflight, statements, assertion, report');

  // §3 is ONE statement — the SQL editor shows only the last result.
  const report = code(BUNDLE.slice(BUNDLE.lastIndexOf('\n', p3))).trim();
  assert.equal((report.match(/;/g) ?? []).length, 1, '§3 is a single statement');
  assert.match(report, /^with caps as/);
});

test('verification never calls an app (my_*) function — the editor has no auth.uid() and they raise 28000', () => {
  const at = (s) => BUNDLE.lastIndexOf('\n', BUNDLE.indexOf(s));
  const verify = (code(BUNDLE.slice(at('§0 — PREFLIGHT'), at('§1 — THE TRIGGERS'))) + code(BUNDLE.slice(at('§2 — THE ASSERTION'))))
    .replace(/'[^']*'/g, "''"); // string literals (messages, names searched for) are not statements
  assert.doesNotMatch(verify, /\bmy_\w+\s*\(/);
  assert.doesNotMatch(verify, /\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b/i, 'verification writes nothing');
});

test('no existing function is restated — the doors keep their own bodies', () => {
  const files = readdirSync(resolve(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql') && f < '0263');
  const defined = new Set();
  for (const f of files) {
    for (const m of read('supabase/migrations/' + f).matchAll(/create or replace function public\.(\w+)\s*\(/g)) defined.add(m[1]);
  }
  const here = [...code(MIG).matchAll(/create or replace function public\.(\w+)\s*\(/g)].map((m) => m[1]);
  assert.deepEqual(here.sort(), [...NEW_FNS].sort(), '0263 defines exactly its five new functions');
  for (const fn of here) assert.ok(!defined.has(fn), `${fn} already exists — 0263 must not retype it`);
  for (const door of ['approve_squad_join_request', 'create_squad', 'join_squad_by_code', 'athlete_live_counts', 'my_entitlement']) {
    assert.ok(!code(MIG).includes(`function public.${door}(`), `${door} is not restated`);
  }
});

test('the count is the app’s count: athlete_live_counts(), never a copy of its arithmetic', () => {
  const check = code(fnDef(MIG, 'live_cap_check'));
  assert.match(check, /from public\.athlete_live_counts\(p_athlete\)/, 'counts with the function my_entitlement() reports');
  assert.match(check, /public\.athlete_caps\(p_athlete\) ->> p_key/, 'the cap comes from config (MA3-D16)');
  assert.match(check, /public\.cap_allows\(v_used, v_cap\)/, '-1 / a missing key is unlimited, decided in one place');
  assert.match(check, /if v_uid is null or p_athlete is null then\s+return;/, 'no signed-in athlete (editor, service role) is never refused');
  assert.match(check, /pg_advisory_xact_lock/, 'concurrent writes for one athlete are serialised before counting');

  const all = code(MIG);
  assert.doesNotMatch(all, /squad_checkins|squad_posts/, 'check-ins are never counted (MA3-D14); feed posts are not counted by the app');
  for (const fn of NEW_FNS.slice(1)) {
    const body = code(fnDef(MIG, fn));
    assert.match(body, /perform public\.live_cap_check\(new\.(athlete_id|user_id), /, `${fn} asks the shared check`);
    assert.doesNotMatch(body, /count\(\*\) from public\.(chapter_photos|transformation_entries|workout_templates)/, `${fn} does not re-count`);
  }
  // No cap number anywhere in the code — only the sentinel lives in cap_allows().
  assert.doesNotMatch(all.replace(/'[^']*'/g, "''"), /\b(75|1000|100|500)\b|[<>]=?\s*[1-9]\d*\b/, 'no literal cap in 0263');
});

test('each door is the right one: what counts as a write that ADDS', () => {
  const trig = code(MIG);
  for (const [name, table] of TRIGGERS) {
    assert.match(trig, new RegExp(`create trigger ${name}\\s+before insert[^;]*on public\\.${table}\\s+for each row`), `${name} is BEFORE INSERT on ${table}`);
  }
  assert.doesNotMatch(trig, /after\s+delete/i, 'storage caps reopen on delete by being LIVE counts — no delete trigger');
  assert.match(trig, /before insert or update of is_video, athlete_id on public\.chapter_photos/);
  assert.match(trig, /before insert or update of photos, video_url, athlete_id on public\.transformation_entries/);

  const gallery = code(fnDef(MIG, 'transformation_entries_cap_guard'));
  assert.match(gallery, /if v_poses > v_was_poses then/, 'only a GROWING pose map is checked');
  assert.match(gallery, /jsonb_typeof\(new\.photos\) = 'object'/, 'poses counted the way athlete_live_counts() counts them');

  const tmpl = code(fnDef(MIG, 'workout_templates_cap_guard'));
  assert.match(tmpl, /if new\.source_definition_id is not null then\s+return new;/, 'a Forge starter adopted is never refused (MA3 §5)');

  const squads = code(fnDef(MIG, 'squad_members_cap_guard'));
  assert.match(squads, /live_cap_check\(new\.user_id, 'squads'\)/, 'the athlete BEING ADDED, not the caller');
});

test('every new function is server-only: revoked from public, anon AND authenticated', () => {
  for (const fn of NEW_FNS) {
    const sig = fn === 'live_cap_check' ? 'uuid, text' : '';
    assert.match(
      MIG,
      new RegExp(`revoke all on function public\\.${fn}\\(${sig}\\)\\s+from public, anon, authenticated;`),
      `${fn} is revoked from all three`,
    );
  }
});

test('what the athlete sees: the refusals read right through the app’s plainError()', () => {
  const check = fnDef(MIG, 'live_cap_check');
  const raises = [...check.matchAll(/raise exception\s+'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"));
  const fill = (s, ...v) => { let i = 0; return s.replace(/%/g, () => String(v[i++] ?? '')); };
  const shown = (message) => plainError({ code: 'P0001', message, details: null, hint: null });

  const free = raises.find((r) => /limit reached/.test(r));
  assert.ok(free, 'the Free refusal is in programs_cap_guard’s wording');
  for (const kind of ['Photo', 'Video', 'Squad', 'Day template']) {
    assert.equal(shown(fill(free, kind, 75, 75)), PLAIN.capReached, `Free ${kind}: the app's cap-reached sentence`);
  }

  const them = raises.find((r) => /^They're already in as many squads/.test(r));
  assert.ok(them, 'an owner approving someone at their cap is told about THEM');
  assert.equal(shown(them), them, 'shown exactly as written — never the Free upsell line');

  const paid = raises.filter((r) => /^Your plan (allows|holds)/.test(r));
  assert.equal(paid.length, 2, 'Premium has its own sentences (squads, and the rest)');
  for (const p of paid) {
    const msg = p.includes('squads') ? fill(p, 5, 5) : fill(p, 1000, 'photos', 1000);
    assert.doesNotMatch(msg, /limit reached/i, 'a paid ceiling is told, never sold to (Amendment 001 §5)');
    assert.equal(shown(msg), msg);
  }

  // And the mapping these rely on is still in the app.
  assert.match(read('src/lib/plain-error.ts'), /code === 'P0001' && \/limit reached\/i\.test/);
});
