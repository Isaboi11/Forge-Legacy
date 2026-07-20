// Initiative honor gate proof — the DB-provable criteria for the first-move honor (migration 0014).
// One fresh athlete, in order:
//   1 GRANT       : claim_initiative_honor grants the one-time `initiative` honor (display 'Initiative').
//   2 NO-FAB      : it grants ONLY `initiative` — nothing else fires for a 0-workout, program-committed athlete.
//   3 IDEMPOTENCY : re-calling claim_initiative_honor → no second row (the honor_once partial unique index).
//   4 LEGACY      : the Legacy Honors read shape (id, display_name, date_earned) returns the Initiative row.
//   5 TIMELINE    : a live HONOR_EARNED 'Initiative' timeline event is written (mirrors the workout honors).
//
// Requires 0007–0012 + 0014 applied + Confirm-email OFF. Signs up its own throwaway athlete, so no SB_* needed:
//   node supabase/seed/initiative-roundtrip.mjs
import { anonClient } from './_client.mjs';

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`  ${cond ? '✓' : '✗ FAIL'} ${msg}`); };
const types = (rows) => (rows ?? []).map((r) => r.honor_type).sort();

const fresh = anonClient();
const { data: su, error: se } = await fresh.auth.signUp({ email: `isaiahaltamirano+initiative${Date.now()}@gmail.com`, password: 'forge-test-1!' });
if (se || !su.session) { console.log(`  ✗ signUp: ${se?.message ?? 'no session'}`); process.exit(1); }
const fid = su.user.id;
await fresh.rpc('complete_onboarding', {
  p_name: 'Initiative Athlete', p_first_name: 'I', p_handle: null, p_initials: 'IA',
  p_sex: 'male', p_avatar_url: null, p_athlete_type: 'Strength', p_environment: 'commercial_gym',
  p_chapter_name: 'Chapter I — Building Your Foundation',
});

// ── 1) grant + 2) no fabrication ──
console.log('\n  1) GRANT + 2) NO FABRICATION');
const { data: g1, error: ge } = await fresh.rpc('claim_initiative_honor');
check(!ge, `claim_initiative_honor runs (${ge?.message ?? 'ok'})`);
check(JSON.stringify(types(g1)) === JSON.stringify(['initiative']), 'returns exactly the new initiative honor');
const { data: h1 } = await fresh.from('honor_instances').select('honor_type').eq('athlete_id', fid);
check(JSON.stringify(types(h1)) === JSON.stringify(['initiative']), 'earns initiative, and ONLY that (no other honor fabricated)');

// ── 3) DB idempotency ──
console.log('\n  3) IDEMPOTENCY (DB-enforced)');
const { data: g2 } = await fresh.rpc('claim_initiative_honor');
const { count: hcAfter } = await fresh.from('honor_instances').select('id', { count: 'exact', head: true }).eq('athlete_id', fid);
check((g2 ?? []).length === 0 && hcAfter === 1, 're-call → nothing new, no second row (honor_once index)');

// ── 4) Legacy-from-DB (the exact select legacy-live.ts runs) ──
console.log('\n  4) LEGACY FROM DB');
const { data: legacy } = await fresh.from('honor_instances').select('id, display_name, date_earned').eq('athlete_id', fid).order('date_earned', { ascending: false });
check((legacy ?? []).length === 1 && legacy[0].display_name === 'Initiative' && !!legacy[0].date_earned, 'Legacy Honors read returns the Initiative row (display_name + date_earned)');

// ── 5) live timeline event ──
console.log('\n  5) TIMELINE EVENT');
const { data: tl } = await fresh.from('timeline_events').select('event_type, object_name').eq('athlete_id', fid).eq('object_name', 'Initiative');
check((tl ?? []).length === 1 && tl[0].event_type === 'HONOR_EARNED', 'a HONOR_EARNED "Initiative" timeline event exists');

// cleanup (honors FK chapters → delete honors first)
await fresh.from('honor_instances').delete().eq('athlete_id', fid);
await fresh.from('timeline_events').delete().eq('athlete_id', fid);
await fresh.from('chapters').delete().eq('athlete_id', fid);
await fresh.from('profiles').delete().eq('id', fid);
console.log('  · cleaned up fresh rows');

console.log(`\n  ${fails.length === 0 ? 'PASS — grant · no-fab · DB idempotency · Legacy-from-DB · timeline event' : `FAIL — ${fails.length}`}\n`);
process.exit(fails.length === 0 ? 0 : 1);
